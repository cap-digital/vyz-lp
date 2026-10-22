import { describe, expect, it } from "vitest";
import type { Dashboard } from "@/features/workspace/types";
import { decodeShare, encodeShare, isExpired, payloadFrom } from "./encode";

const dash: Dashboard = {
  id: "d_1",
  templateId: "ecommerce-visao-geral",
  name: "Loja Verde · Junho",
  client: "Loja Verde",
  accounts: { meta: "ac_1" },
  pages: ["visao-geral", "campanhas", "funil"],
  settings: { goal: 6000, margin: 0.4, budget: 5000000, period: "30d", customDays: 14, attribution: "7c1v", currency: "BRL" },
  brand: { color: "#3E6F9E", hideVyz: true },
  createdAt: "2026-10-22T00:00:00.000Z",
  updatedAt: "2026-10-22T00:00:00.000Z",
};

describe("link de compartilhamento", () => {
  it("ida e volta preserva a configuração (com acento e marca)", async () => {
    const p = payloadFrom(dash, { expiresInDays: 7, hideSpend: true }, 1_000);
    const code = await encodeShare(p);
    expect(code).toMatch(/^[zj]\.[A-Za-z0-9_-]+$/);
    const back = await decodeShare(`#${code}`);
    expect(back).toEqual(p);
    expect(back.expiresAt).toBe(1_000 + 7 * 86_400_000);
  });

  it("comprime: o código fica menor que o JSON em base64", async () => {
    const big = { ...dash, pages: Array(12).fill("visao-geral") as Dashboard["pages"] };
    const code = await encodeShare(payloadFrom(big, { expiresInDays: null, hideSpend: false }));
    const plain = Buffer.from(JSON.stringify(big)).toString("base64url");
    expect(code.length).toBeLessThan(plain.length);
  });

  it("sem expiração não expira; com expiração vencida, expira", () => {
    expect(isExpired({})).toBe(false);
    expect(isExpired({ expiresAt: 10 }, 11)).toBe(true);
    expect(isExpired({ expiresAt: 10 }, 9)).toBe(false);
  });

  it("recusa lixo", async () => {
    await expect(decodeShare("x.abc")).rejects.toThrow();
    await expect(decodeShare("j.bm90LWpzb24")).rejects.toThrow();
  });
});
