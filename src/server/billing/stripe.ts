import "server-only";

// Stripe (pendente). O provedor real entra aqui com a SDK oficial: Checkout
// Session/PaymentIntent no openCheckout, o pagamento confirmado pelo webhook
// (src/app/api/billing/webhook) e as trocas de plano com proration. Até lá,
// toda chamada falha com billing:not_configured.

import { createHmac, timingSafeEqual } from "node:crypto";
import { appError } from "@/server/supabase/errors";
import type { BillingProvider } from "./provider";

const notConfigured = () => appError("billing:not_configured", "A cobrança pela Stripe ainda não foi configurada.");

export const stripeBillingProvider: BillingProvider = {
  id: "stripe",
  async openCheckout() {
    throw notConfigured();
  },
  async confirmPayment() {
    throw notConfigured();
  },
  async updateSubscription() {
    throw notConfigured();
  },
  async setCancelAtPeriodEnd() {
    throw notConfigured();
  },
};

/** Evento do webhook, só com o que o VYZ lê. */
export type StripeEvent = {
  id: string;
  type: string;
  created: number;
  livemode: boolean;
  data: { object: Record<string, unknown> };
};

/**
 * Confere o cabeçalho Stripe-Signature ("t=<unix>,v1=<hmac>,...") com o corpo
 * cru: HMAC-SHA256 de "<t>.<corpo>" com o segredo do endpoint, comparação em
 * tempo constante e no máximo 5 minutos de diferença (contra replay).
 */
export function verifyStripeSignature(payload: string, header: string | null, secret: string, now = Date.now(), toleranceSeconds = 300): StripeEvent {
  if (!header) throw new Error("assinatura ausente");
  const parts = header.split(",").map((p) => p.trim().split("="));
  const timestamp = Number(parts.find(([k]) => k === "t")?.[1]);
  const signatures = parts.filter(([k, v]) => k === "v1" && v).map(([, v]) => v);
  if (!Number.isFinite(timestamp) || signatures.length === 0) throw new Error("assinatura malformada");
  if (Math.abs(now / 1000 - timestamp) > toleranceSeconds) throw new Error("assinatura fora da janela");

  const expected = Buffer.from(createHmac("sha256", secret).update(`${timestamp}.${payload}`, "utf8").digest("hex"));
  const match = signatures.some((s) => {
    const given = Buffer.from(s);
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
  if (!match) throw new Error("assinatura inválida");

  const event = JSON.parse(payload) as Partial<StripeEvent>;
  if (typeof event.id !== "string" || typeof event.type !== "string" || !event.data?.object) throw new Error("evento inválido");
  return event as StripeEvent;
}
