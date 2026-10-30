// Ritmo do calendário: dia da semana, uma tendência lenta (ondas de algumas
// semanas, sem crescer para sempre) e as compras que ainda vão ser atribuídas
// aos últimos dias do período.

import { dayNumber, diffDays, weekday } from "../dates";

// domingo … sábado
const SPEND_BY_WEEKDAY = [0.94, 1.03, 1.05, 1.04, 1.01, 0.97, 0.93];
const CONVERSION_BY_WEEKDAY = [1.05, 1.07, 1.04, 1, 0.97, 0.92, 0.95];

export const spendByWeekday = (date: string) => SPEND_BY_WEEKDAY[weekday(date)];
export const conversionByWeekday = (date: string) => CONVERSION_BY_WEEKDAY[weekday(date)];

export type Trend = { amplitude: number; period: number; phase: number };

export const trendFactor = (t: Trend, date: string) => 1 + t.amplitude * Math.sin((2 * Math.PI * (dayNumber(date) + t.phase)) / t.period);

// parte já atribuída: o último dia, o penúltimo e o antepenúltimo
const MATURITY = [0.78, 0.9, 0.96];

/** Fração das compras de `date` que já aparece quando os dados vão até `endDate`. */
export function maturity(date: string, endDate: string): number {
  const age = diffDays(date, endDate);
  return age >= 0 && age < MATURITY.length ? MATURITY[age] : 1;
}
