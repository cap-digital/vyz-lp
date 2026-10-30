import { describe, expect, it } from "vitest";
import { billableUnit, countUnits, fitsPlan, otherPlatformUnits, planUsageLabel } from "./limits";
import type { AdAccountDTO, PlatformConnectState } from "./types";

const meta = (externalId: string, bm: string | null) => ({ platformId: "meta", externalId, businessExternalId: bm });
const google = (externalId: string) => ({ platformId: "google", externalId, businessExternalId: null });

describe("contas contratadas", () => {
  it("no Meta, a BM conta uma vez; sem BM, conta a própria conta", () => {
    expect(billableUnit(meta("act_1", "bm1"))).toBe("meta:bm1");
    expect(billableUnit(meta("act_1", null))).toBe("meta:act_1");
    expect(countUnits([meta("act_1", "bm1"), meta("act_2", "bm1"), meta("act_3", "bm2")])).toBe(2);
    expect(countUnits([meta("act_1", null), meta("act_2", null)])).toBe(2);
  });

  it("nas outras plataformas, cada conta conta", () => {
    expect(countUnits([google("123-456-7890"), google("234-567-8901")])).toBe(2);
    expect(countUnits([google("123-456-7890"), meta("123-456-7890", null)])).toBe(2);
  });

  it("ligar outra conta da mesma BM não ocupa mais", () => {
    const on = [meta("act_1", "bm1")];
    expect(fitsPlan(meta("act_2", "bm1"), on, 1, 2)).toBe(true);
    expect(fitsPlan(meta("act_3", "bm2"), on, 1, 2)).toBe(false);
    expect(fitsPlan(meta("act_3", "bm2"), on, 0, 2)).toBe(true);
  });

  it("o que as outras plataformas ocupam sai do uso total", () => {
    const acc = (platformId: "meta" | "google", externalId: string, bm: string | null, isEnabled: boolean) =>
      ({ platformId, externalId, businessExternalId: bm, isEnabled }) as unknown as AdAccountDTO;
    const platform = (accounts: AdAccountDTO[]) => ({ accounts }) as PlatformConnectState;
    const state = {
      limit: { accountsQuantity: 3, billableAccounts: 3 },
      platforms: {
        meta: platform([acc("meta", "act_1", "bm1", true), acc("meta", "act_2", "bm1", true), acc("meta", "act_3", "bm2", false)]),
        google: platform([acc("google", "123-456-7890", null, true), acc("google", "234-567-8901", null, true)]),
      },
    };
    expect(otherPlatformUnits(state, "meta")).toBe(2);
    expect(otherPlatformUnits(state, "google")).toBe(1);
  });

  it("rótulo com singular", () => {
    expect(planUsageLabel(1, 1)).toBe("1 de 1 conta do plano");
    expect(planUsageLabel(2, 3)).toBe("2 de 3 contas do plano");
  });
});
