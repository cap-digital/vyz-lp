// Números do gerador em unidades inteiras (centavos, impressões, cliques,
// conversões na escala da plataforma) e a divisão de um total do dia entre
// partes (público, posicionamento, produtos, termos…) que soma exatamente o
// total e respeita, em cada parte, conversões ≤ cliques ≤ impressões.

import { apportion, apportionCapped } from "../apportion";
import type { BasicMetrics } from "../dataset";

export type Units = { spend: number; impressions: number; clicks: number; conversions: number; value: number };

export const ZERO_UNITS: Units = { spend: 0, impressions: 0, clicks: 0, conversions: 0, value: 0 };

export function addUnits(a: Units, b: Units): Units {
  return {
    spend: a.spend + b.spend,
    impressions: a.impressions + b.impressions,
    clicks: a.clicks + b.clicks,
    conversions: a.conversions + b.conversions,
    value: a.value + b.value,
  };
}

export const isEmpty = (u: Units) => u.spend === 0 && u.impressions === 0 && u.clicks === 0 && u.conversions === 0 && u.value === 0;

/** Unidades → valores do armazém (dinheiro com 2 casas; conversões na escala da plataforma). */
export function toBasic(u: Units, conversionScale: number): BasicMetrics {
  return { spend: u.spend / 100, impressions: u.impressions, clicks: u.clicks, conversions: u.conversions / conversionScale, conversionValue: u.value / 100 };
}

/** Peso (volume) e multiplicadores de CTR, conversão, ticket e custo de uma parte. */
export type Part = { weight: number; ctr?: number; cvr?: number; aov?: number; cost?: number };

export type SplitOptions = {
  /** cpm: o custo acompanha as impressões (Meta, display); cpc: acompanha os cliques (pesquisa, Shopping). */
  billing: "cpm" | "cpc";
  /** 1 = conversões inteiras (Meta); 100 = centésimos (Google). */
  conversionScale: number;
};

export function splitUnits(total: Units, parts: readonly Part[], opts: SplitOptions): Units[] {
  const impressions = apportion(
    total.impressions,
    parts.map((p) => p.weight),
  );
  const clicks = apportionCapped(
    total.clicks,
    parts.map((p, i) => impressions[i] * (p.ctr ?? 1)),
    impressions,
  );
  const conversions = apportionCapped(
    total.conversions,
    parts.map((p, i) => clicks[i] * (p.cvr ?? 1)),
    clicks.map((c) => c * opts.conversionScale),
  );
  // valor só onde houve conversão
  const value = conversions.some((c) => c > 0) ? apportion(total.value, parts.map((p, i) => conversions[i] * (p.aov ?? 1))) : parts.map(() => 0);
  const byClicks = parts.map((p, i) => clicks[i] * (p.cost ?? 1));
  const byImpressions = parts.map((p, i) => impressions[i] * (p.cost ?? 1));
  const spend = apportion(total.spend, opts.billing === "cpc" && byClicks.some((w) => w > 0) ? byClicks : byImpressions);
  return parts.map((_, i) => ({ spend: spend[i], impressions: impressions[i], clicks: clicks[i], conversions: conversions[i], value: value[i] }));
}
