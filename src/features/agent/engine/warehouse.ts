// Do armazém (insights_account_daily) para os totais que o VYZ lê: mês até
// hoje contra o período anterior de mesmo tamanho. Puro (testado); o servidor
// lê as linhas e chama estas funções.

import { totals, type Totals } from "@/features/metrics/compute";
import type { DayRow } from "@/features/metrics/source";
import { addDays, diffDays } from "@/features/sync/dates";

export type DateRange = { from: string; to: string };

/** Linha diária da conta, como vem do banco (valores em reais). */
export type WarehouseDay = {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  conversion_value: number;
  reach: number | null;
};

/** Mês até hoje (do dia 1º até `today`) e os mesmos N dias logo antes. */
export function monthToDate(today: string): { current: DateRange; previous: DateRange } {
  const from = `${today.slice(0, 8)}01`;
  const days = diffDays(from, today) + 1;
  return { current: { from, to: today }, previous: { from: addDays(from, -days), to: addDays(from, -1) } };
}

const cents = (reais: number) => Math.round(Number(reais) * 100);

/**
 * Totais no formato do motor (dinheiro em centavos). As razões saem das
 * somas (CTR = cliques ÷ impressões, ROAS = valor ÷ gasto). Frequência só
 * quando todas as linhas têm alcance.
 */
export function warehouseTotals(rows: readonly WarehouseDay[]): Totals {
  const days: DayRow[] = rows.map((r) => ({
    ago: 0,
    spend: cents(r.spend),
    impressions: Number(r.impressions) || 0,
    clicks: Number(r.clicks) || 0,
    conversions: Number(r.conversions) || 0,
    revenue: cents(r.conversion_value),
    leads: 0,
    qualified: 0,
    visits: 0,
    calls: 0,
    sessions: 0,
    views: 0,
    byPlatform: {},
    maturing: false,
  }));
  const reach = rows.every((r) => r.reach != null) ? rows.reduce((a, r) => a + Number(r.reach), 0) : 0;
  const impressions = days.reduce((a, d) => a + d.impressions, 0);
  return totals(days, reach > 0 ? impressions / reach : 0);
}

/** Separa as linhas de várias contas nos dois períodos e soma cada um. */
export function periodTotals(rows: readonly WarehouseDay[], ranges: { current: DateRange; previous: DateRange }): { cur: Totals; prev: Totals } {
  const within = (r: WarehouseDay, p: DateRange) => r.date >= p.from && r.date <= p.to;
  return { cur: warehouseTotals(rows.filter((r) => within(r, ranges.current))), prev: warehouseTotals(rows.filter((r) => within(r, ranges.previous))) };
}
