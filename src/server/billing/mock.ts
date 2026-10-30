import "server-only";

// Provedor simulado: aprova na hora, sem cobrar nada, e gera ids mock_*.
// Os ids saem do checkout (ou da mudança), então confirmar duas vezes devolve
// os mesmos. Os finais dos cartões de teste da Stripe simulam recusas:
// 0002 (recusado), 9995 (saldo insuficiente) e 0069 (vencido).

import { randomBytes } from "node:crypto";
import type { BillingProvider, ChargeFailureCode } from "./provider";

const DECLINES: Record<string, { code: ChargeFailureCode; message: string }> = {
  "0002": { code: "card_declined", message: "O banco recusou o cartão. Tente outro cartão." },
  "9995": { code: "insufficient_funds", message: "Saldo ou limite insuficiente. Tente outro cartão." },
  "0069": { code: "expired_card", message: "O banco informou que o cartão está vencido." },
};

const key = (uuid: string) => uuid.replace(/-/g, "");

export const mockBillingProvider: BillingProvider = {
  id: "mock",

  async openCheckout({ checkoutId }) {
    return { providerSessionId: `mock_cs_${key(checkoutId)}` };
  },

  async confirmPayment({ checkoutId, customer, subscription, card }) {
    const decline = DECLINES[card.last4];
    // cada tentativa recusada tem o próprio id
    if (decline) return { ok: false, paymentId: `mock_pi_${randomBytes(12).toString("hex")}`, ...decline };
    const k = key(checkoutId);
    return {
      ok: true,
      paymentId: `mock_pi_${k}`,
      invoiceId: `mock_in_${k}`,
      customerId: customer.existingId ?? `mock_cus_${k}`,
      subscriptionId: subscription ? `mock_sub_${k}` : null,
    };
  },

  async updateSubscription({ changeId, prorationCents }) {
    if (prorationCents <= 0) return { invoiceId: null, paymentId: null };
    const k = key(changeId);
    return { invoiceId: `mock_in_${k}`, paymentId: `mock_pi_${k}` };
  },

  async setCancelAtPeriodEnd() {},
};
