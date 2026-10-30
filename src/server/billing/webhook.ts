import "server-only";

// Eventos do webhook da Stripe: grava pelo id (billing_events) e processa uma
// vez só. Reentrega de evento já processado volta 200 sem repetir nada; falha
// no processamento fica em `error` e volta 500, para a Stripe tentar de novo
// (fulfill_checkout é idempotente, então reprocessar é seguro).
//
// Pendente com a Stripe: invoice.paid (renovação: nova fatura e transação),
// invoice.payment_failed, charge.refunded, as datas do período da assinatura
// e a forma de pagamento (bandeira e final vêm do PaymentIntent).

import { Constants, type Json } from "@/lib/supabase/database.types";
import { createAdminSupabase } from "@/server/supabase/admin";
import { unwrap } from "@/server/supabase/errors";
import type { StripeEvent } from "./stripe";

type Handler = (event: StripeEvent) => Promise<void>;

const str = (v: unknown) => (typeof v === "string" && v ? v : null);
const isoFromUnix = (v: unknown) => (typeof v === "number" ? new Date(v * 1000).toISOString() : null);
const SUBSCRIPTION_STATUSES: readonly string[] = Constants.public.Enums.subscription_status;

/** Checkout da Stripe pago: conclui o pedido do VYZ guardado em metadata.checkout_session_id. */
async function checkoutPaid(event: StripeEvent) {
  const session = event.data.object;
  const metadata = (session.metadata ?? {}) as Record<string, unknown>;
  const checkoutId = str(metadata.checkout_session_id);
  const customer = str(session.customer);
  if (!checkoutId || !customer) throw new Error(`${event.type} sem checkout_session_id ou customer`);
  // boleto e PIX confirmam depois (checkout.session.async_payment_succeeded)
  if (session.payment_status !== "paid") return;
  const subscription = str(session.subscription);
  const invoice = str(session.invoice);
  unwrap(
    await createAdminSupabase().rpc("fulfill_checkout", {
      p_checkout_id: checkoutId,
      p_provider_customer_id: customer,
      ...(subscription ? { p_provider_subscription_id: subscription } : {}),
      ...(invoice ? { p_provider_invoice_id: invoice } : {}),
      p_payment: { provider_payment_id: str(session.payment_intent) },
    }),
  );
}

/** Situação da assinatura na Stripe (atraso, cancelamento, fim). */
async function subscriptionChanged(event: StripeEvent) {
  const s = event.data.object;
  const id = str(s.id);
  const status = str(s.status);
  if (!id || !status || !SUBSCRIPTION_STATUSES.includes(status)) throw new Error(`${event.type} com assinatura inválida`);
  unwrap(
    await createAdminSupabase()
      .from("subscriptions")
      .update({
        status: status as (typeof Constants.public.Enums.subscription_status)[number],
        cancel_at_period_end: s.cancel_at_period_end === true,
        canceled_at: isoFromUnix(s.canceled_at),
        ended_at: isoFromUnix(s.ended_at),
      })
      .eq("provider_subscription_id", id),
  );
}

const HANDLERS: Record<string, Handler> = {
  "checkout.session.completed": checkoutPaid,
  "checkout.session.async_payment_succeeded": checkoutPaid,
  "customer.subscription.updated": subscriptionChanged,
  "customer.subscription.deleted": subscriptionChanged,
};

export async function processStripeEvent(event: StripeEvent): Promise<{ status: number; body: Record<string, unknown> }> {
  const admin = createAdminSupabase();
  const stored = await admin
    .from("billing_events")
    .upsert({ id: event.id, provider: "stripe", type: event.type, payload: event as unknown as Json }, { onConflict: "id", ignoreDuplicates: true })
    .select("id");
  if (stored.error) {
    console.error("[vyz] webhook: gravar evento", stored.error);
    return { status: 500, body: { error: "storage_failed" } };
  }
  if (stored.data.length === 0) {
    const existing = unwrap(await admin.from("billing_events").select("processed_at").eq("id", event.id).maybeSingle());
    if (existing?.processed_at) return { status: 200, body: { received: true, duplicate: true } };
  }

  const handler = HANDLERS[event.type];
  try {
    if (handler) await handler(event);
    await admin.from("billing_events").update({ processed_at: new Date().toISOString(), error: null }).eq("id", event.id);
    return { status: 200, body: { received: true, handled: !!handler } };
  } catch (err) {
    console.error("[vyz] webhook da Stripe", event.type, err);
    const message = err instanceof Error ? err.message : String(err);
    await admin
      .from("billing_events")
      .update({ error: message.slice(0, 500) })
      .eq("id", event.id);
    return { status: 500, body: { error: "processing_failed" } };
  }
}
