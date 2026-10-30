import { describe, expect, it } from "vitest";
import { validateId } from "@/features/accounts/validate";
import { MOCK_ACCOUNTS, mockAccountGroups } from "./mock-data";

describe("login simulado", () => {
  it("Meta: 2 BMs, Loja Exemplo com 2 contas e Marca Dois com 1", () => {
    const groups = mockAccountGroups("meta");
    expect(groups.map((g) => [g.name, g.accounts.length])).toEqual([
      ["Loja Exemplo", 2],
      ["Marca Dois", 1],
    ]);
  });

  it("Google: um MCC com as 2 contas da Loja Exemplo", () => {
    const groups = mockAccountGroups("google");
    expect(groups).toHaveLength(1);
    expect(groups[0].accounts.map((a) => [a.name, a.externalId])).toEqual([
      ["Loja Exemplo · Brasil", "123-456-7890"],
      ["Loja Exemplo · Shopping", "234-567-8901"],
    ]);
  });

  it("IDs no mesmo formato do cadastro manual (uma conta conectada e uma cadastrada casam)", () => {
    for (const a of MOCK_ACCOUNTS.meta) {
      expect(validateId("metaAccount", a.externalId)).toEqual({ ok: true, value: a.externalId });
      expect(validateId("metaBusiness", a.business!.id).ok).toBe(true);
    }
    for (const a of MOCK_ACCOUNTS.google) {
      expect(validateId("googleCustomer", a.externalId)).toEqual({ ok: true, value: a.externalId });
      expect(validateId("googleCustomer", a.manager!.id).ok).toBe(true);
    }
  });

  it("sempre as mesmas contas, sem ids repetidos", () => {
    for (const list of Object.values(MOCK_ACCOUNTS)) {
      expect(new Set(list.map((a) => a.externalId)).size).toBe(list.length);
    }
    expect(mockAccountGroups("meta")).toEqual(mockAccountGroups("meta"));
  });
});
