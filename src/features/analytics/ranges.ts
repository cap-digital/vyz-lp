// Intervalos de um dashboard: o período atual termina ontem (no fuso da conta,
// porque hoje ainda está acontecendo) e o anterior tem os mesmos N dias logo
// antes. "Este mês" vai do dia 1 até ontem.

import { addDays, dayNumber, isIsoDate } from "@/features/sync/dates";
import type { PeriodId } from "@/features/workspace/types";
import type { DateRange } from "./types";

/** Dias com conversões ainda chegando (as plataformas revisam esses dias). */
export const MATURING_DAYS = 3;
export const MAX_CUSTOM_DAYS = 60;

const PERIOD_IDS: readonly PeriodId[] = ["7d", "30d", "mes", "custom"];
export const isPeriodId = (v: unknown): v is PeriodId => (PERIOD_IDS as readonly unknown[]).includes(v);

export function dashboardRanges(period: PeriodId, customDays: number, today: string): { current: DateRange; previous: DateRange } {
  if (!isIsoDate(today)) throw new RangeError(`Data inválida: ${today}`);
  const to = addDays(today, -1);
  let days: number;
  switch (period) {
    case "7d":
      days = 7;
      break;
    case "30d":
      days = 30;
      break;
    case "mes":
      days = dayNumber(to) - dayNumber(`${to.slice(0, 8)}01`) + 1;
      break;
    default:
      days = Math.min(MAX_CUSTOM_DAYS, Math.max(3, Math.round(customDays) || 14));
  }
  const from = addDays(to, -(days - 1));
  const prevTo = addDays(from, -1);
  return { current: { from, to, days }, previous: { from: addDays(prevTo, -(days - 1)), to: prevTo, days } };
}

/** Primeiro dia em maturação do período, ou null quando o período é curto demais. */
export function maturingStart(range: DateRange, maturingDays = MATURING_DAYS): string | null {
  const n = Math.min(maturingDays, range.days - 1);
  return n > 0 ? addDays(range.to, -(n - 1)) : null;
}

/** "2026-10-29" → "29/10". */
export const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** "2026-10-29" → "29/10/2026". */
export const ddmmyyyyIso = (iso: string) => `${ddmm(iso)}/${iso.slice(0, 4)}`;
