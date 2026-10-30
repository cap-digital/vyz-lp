import { describe, expect, it } from "vitest";
import { monthToDate, periodTotals, warehouseTotals, type WarehouseDay } from "./warehouse";

const day = (date: string, p: Partial<WarehouseDay> = {}): WarehouseDay => ({ date, spend: 0, impressions: 0, clicks: 0, conversions: 0, conversion_value: 0, reach: null, ...p });

describe("monthToDate", () => {
  it("do dia 1º até hoje, contra os mesmos dias logo antes", () => {
    expect(monthToDate("2026-10-30")).toEqual({ current: { from: "2026-10-01", to: "2026-10-30" }, previous: { from: "2026-09-01", to: "2026-09-30" } });
    expect(monthToDate("2026-03-01")).toEqual({ current: { from: "2026-03-01", to: "2026-03-01" }, previous: { from: "2026-02-28", to: "2026-02-28" } });
  });
});

describe("warehouseTotals", () => {
  it("dinheiro em centavos e razões pelas somas", () => {
    const t = warehouseTotals([
      day("2026-10-01", { spend: 100.1, impressions: 10_000, clicks: 100, conversions: 2, conversion_value: 400.5, reach: 5000 }),
      day("2026-10-02", { spend: 50, impressions: 30_000, clicks: 600, conversions: 1, conversion_value: 99.5, reach: 15_000 }),
    ]);
    expect(t.spend).toBe(15_010);
    expect(t.revenue).toBe(50_000);
    expect(t.ctr).toBeCloseTo(700 / 40_000);
    expect(t.roas).toBeCloseTo(50_000 / 15_010);
    expect(t.cpa).toBeCloseTo(15_010 / 3);
    expect(t.frequency).toBeCloseTo(2);
  });

  it("sem alcance em algum dia, sem frequência; sem linhas, tudo zero", () => {
    expect(warehouseTotals([day("2026-10-01", { impressions: 10, reach: 5 }), day("2026-10-02", { impressions: 10 })]).frequency).toBe(0);
    const empty = warehouseTotals([]);
    expect(empty.spend).toBe(0);
    expect(empty.roas).toBe(0);
  });

  it("separa as linhas nos dois períodos", () => {
    const ranges = monthToDate("2026-10-02");
    const { cur, prev } = periodTotals([day("2026-10-01", { spend: 10 }), day("2026-10-02", { spend: 20 }), day("2026-09-30", { spend: 5 }), day("2026-09-01", { spend: 99 })], ranges);
    expect(cur.spend).toBe(3000);
    expect(prev.spend).toBe(500);
  });
});
