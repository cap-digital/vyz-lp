// Relatórios agendados: destinatários (e-mail ou WhatsApp) e a próxima data de
// envio no fuso do workspace. Funções puras, testadas. O envio em si ainda não
// existe (o agendamento fica gravado para o serviço de envio).

export type ReportFrequency = "weekly" | "monthly";
export type ReportFormat = "pdf" | "whatsapp";
export type Recipient = { channel: "email" | "whatsapp"; address: string };

export const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
export const FORMAT_LABEL: Record<ReportFormat, string> = { pdf: "PDF por e-mail", whatsapp: "Resumo no WhatsApp" };
export const MAX_RECIPIENTS = 10;

const EMAIL_RE = /^[^@\s,;]+@[^@\s,;]+\.[^@\s,;]+$/;

/** "71 99999-0000" → "+5571999990000" (DDD + número vira Brasil; com "+", vale o código do país digitado). */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  const international = raw.trim().startsWith("+");
  const full = !international && (digits.length === 10 || digits.length === 11) ? `55${digits}` : digits;
  return full.length >= (international ? 10 : 12) && full.length <= 15 ? `+${full}` : null;
}

export type ParsedRecipients = { ok: true; recipients: Recipient[] } | { ok: false; error: string };

/** Lista separada por vírgula, ponto e vírgula ou linha → destinatários do canal do formato. */
export function parseRecipients(raw: string, format: ReportFormat): ParsedRecipients {
  const parts = raw
    .split(/[,;\n]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return { ok: false, error: "Informe pelo menos um destinatário." };
  if (parts.length > MAX_RECIPIENTS) return { ok: false, error: `Até ${MAX_RECIPIENTS} destinatários por relatório.` };
  const out: Recipient[] = [];
  for (const p of parts) {
    if (format === "pdf") {
      const email = p.toLowerCase();
      if (!EMAIL_RE.test(email) || email.length > 254) return { ok: false, error: `“${p}” não parece um e-mail.` };
      out.push({ channel: "email", address: email });
    } else {
      const phone = normalizePhone(p);
      if (!phone) return { ok: false, error: `“${p}” não parece um WhatsApp com DDD.` };
      out.push({ channel: "whatsapp", address: phone });
    }
  }
  const unique = out.filter((r, i) => out.findIndex((x) => x.address === r.address) === i);
  return { ok: true, recipients: unique };
}

export type Schedule = { frequency: ReportFrequency; weekday: number | null; monthDay: number | null; sendHour: number; timeZone: string };

/** Partes da data/hora local de um instante num fuso. */
function localParts(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(instant);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute"), second: get("second") };
}

/** Instante UTC de uma hora "de parede" (ano, mês, dia, hora) no fuso. */
function zonedInstant(year: number, month: number, day: number, hour: number, timeZone: string): Date {
  const guess = Date.UTC(year, month - 1, day, hour);
  const p = localParts(new Date(guess), timeZone);
  const offset = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - guess;
  return new Date(guess - offset);
}

/** Próximo envio (estritamente depois de `now`) na hora marcada, no fuso do agendamento. */
export function nextRunAt(s: Schedule, now: Date): Date {
  const today = localParts(now, s.timeZone);
  for (let i = 0; i <= 62; i++) {
    const d = new Date(Date.UTC(today.year, today.month - 1, today.day + i));
    const matches = s.frequency === "weekly" ? d.getUTCDay() === s.weekday : d.getUTCDate() === s.monthDay;
    if (!matches) continue;
    const at = zonedInstant(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), s.sendHour, s.timeZone);
    if (at.getTime() > now.getTime()) return at;
  }
  throw new RangeError("agendamento inválido");
}

/** "Toda segunda, às 8h" / "Todo dia 5, às 8h". */
export function scheduleLabel(s: Pick<Schedule, "frequency" | "weekday" | "monthDay" | "sendHour">): string {
  const hour = `às ${s.sendHour}h`;
  if (s.frequency === "weekly") {
    const day = WEEKDAYS[s.weekday ?? 1]?.toLowerCase() ?? "";
    return `${s.weekday === 0 || s.weekday === 6 ? "Todo" : "Toda"} ${day}, ${hour}`;
  }
  return `Todo dia ${s.monthDay}, ${hour}`;
}
