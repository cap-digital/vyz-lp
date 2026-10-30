import { describe, expect, it } from "vitest";
import { subscriptionNotice } from "./notice";

const active = { hasAccess: true, status: "active" as const, cancelAtPeriodEnd: false, currentPeriodEnd: "2026-11-29T12:00:00Z" };

describe("subscriptionNotice", () => {
  it("assinatura em dia não mostra faixa", () => {
    expect(subscriptionNotice(active)).toBeNull();
  });

  it("avisa atraso, cancelamento agendado e inatividade", () => {
    expect(subscriptionNotice({ ...active, status: "past_due" })?.tone).toBe("warn");
    const canceling = subscriptionNotice({ ...active, cancelAtPeriodEnd: true });
    expect(canceling?.text).toBe("A assinatura foi cancelada e termina em 29/11/2026.");
    expect(canceling?.action.label).toBe("Retomar");
    expect(subscriptionNotice({ ...active, hasAccess: false, status: "canceled" })?.tone).toBe("error");
    expect(subscriptionNotice({ hasAccess: false, status: null, cancelAtPeriodEnd: false, currentPeriodEnd: null })?.text).toMatch(/ainda não tem um plano/);
  });

  it("atraso pesa mais que o cancelamento agendado", () => {
    expect(subscriptionNotice({ ...active, status: "past_due", cancelAtPeriodEnd: true })?.tone).toBe("warn");
  });
});
