// Datas de calendário ("YYYY-MM-DD") sem fuso: contas em dias desde 1970, sem
// depender do relógio local. O dia "de hoje" sai do fuso da conta.

export type SyncTrigger = "initial" | "scheduled" | "manual";

/** Primeira sincronização: 90 dias até ontem. As seguintes: os últimos 7 (cobre as conversões que chegam atrasadas). */
export const INITIAL_SYNC_DAYS = 90;
export const INCREMENTAL_SYNC_DAYS = 7;
export const DEFAULT_TIME_ZONE = "America/Sao_Paulo";

const DAY_MS = 86_400_000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const m = ISO_DATE.exec(value);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

/** Dias desde 1970-01-01. */
export function dayNumber(date: string): number {
  if (!isIsoDate(date)) throw new RangeError(`Data inválida: ${date}`);
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / DAY_MS;
}

export function fromDayNumber(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

export const addDays = (date: string, days: number) => fromDayNumber(dayNumber(date) + days);

/** b − a, em dias. */
export const diffDays = (a: string, b: string) => dayNumber(b) - dayNumber(a);

/** 0 = domingo … 6 = sábado. */
export const weekday = (date: string) => (((dayNumber(date) + 4) % 7) + 7) % 7;

/** Os `days` dias que terminam em `endDate`, do mais antigo ao mais novo. */
export function dateRange(endDate: string, days: number): string[] {
  const end = dayNumber(endDate);
  return Array.from({ length: days }, (_, i) => fromDayNumber(end - days + 1 + i));
}

/** Data do calendário de um instante num fuso (fuso inválido cai no de São Paulo). */
export function localDate(instant: Date, timeZone: string = DEFAULT_TIME_ZONE): string {
  const format = (tz: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(instant);
  try {
    return format(timeZone);
  } catch {
    return format(DEFAULT_TIME_ZONE);
  }
}

export type SyncRange = { from: string; to: string; days: number };

/** Intervalo de uma sincronização: termina ontem, no fuso da conta (hoje ainda está acontecendo). */
export function syncRange(trigger: SyncTrigger, opts: { now?: Date; timeZone?: string } = {}): SyncRange {
  const days = trigger === "initial" ? INITIAL_SYNC_DAYS : INCREMENTAL_SYNC_DAYS;
  const to = addDays(localDate(opts.now ?? new Date(), opts.timeZone), -1);
  return { from: addDays(to, -(days - 1)), to, days };
}
