// Webhook da cobrança (Stripe). Enquanto a Stripe não está configurada
// (BILLING_PROVIDER=mock), responde 501. Com ela: confere a assinatura no
// corpo cru, grava o evento pelo id e processa uma vez só
// (src/server/billing/webhook.ts).

import { verifyStripeSignature, type StripeEvent } from "@/server/billing/stripe";
import { processStripeEvent } from "@/server/billing/webhook";
import { serverEnv } from "@/server/env";

export async function POST(request: Request) {
  const env = serverEnv();
  if (env.BILLING_PROVIDER !== "stripe" || !env.STRIPE_WEBHOOK_SECRET) {
    return Response.json({ error: "billing:not_configured", message: "A cobrança pela Stripe ainda não foi configurada." }, { status: 501 });
  }

  const payload = await request.text();
  let event: StripeEvent;
  try {
    event = verifyStripeSignature(payload, request.headers.get("stripe-signature"), env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return Response.json({ error: "invalid_signature" }, { status: 400 });
  }

  const result = await processStripeEvent(event);
  return Response.json(result.body, { status: result.status });
}
