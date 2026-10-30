// Leads das landing pages: filtros da tela (vindos da URL), período em datas e
// geração de CSV. Puro: serve à tela, à rota de exportação e aos testes.

export const LEADS_PAGE_SIZE = 25;

export const LEAD_PERIODS = ["7d", "30d", "90d", "tudo"] as const;
export type LeadPeriod = (typeof LEAD_PERIODS)[number];
export const LEAD_PERIOD_LABEL: Record<LeadPeriod, string> = { "7d": "7 dias", "30d": "30 dias", "90d": "90 dias", tudo: "Tudo" };

export type LeadFilters = { landingPageId: string | null; period: LeadPeriod; page: number };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const first = (v: string | string[] | null | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;

/** Lê os filtros da URL com tolerância (valor estranho vira o padrão). */
export function parseLeadFilters(q: Record<string, string | string[] | undefined> | URLSearchParams): LeadFilters {
  const get = (k: string) => (q instanceof URLSearchParams ? q.get(k) : first(q[k]));
  const lp = get("lp");
  const period = get("periodo");
  const page = Number(get("pagina"));
  return {
    landingPageId: lp && UUID.test(lp) ? lp.toLowerCase() : null,
    period: (LEAD_PERIODS as readonly string[]).includes(period ?? "") ? (period as LeadPeriod) : "30d",
    page: Number.isInteger(page) && page >= 1 && page <= 10_000 ? page : 1,
  };
}

/** Query string dos filtros (sem os valores padrão). */
export function leadFiltersQuery(f: Partial<LeadFilters>): string {
  const p = new URLSearchParams();
  if (f.landingPageId) p.set("lp", f.landingPageId);
  if (f.period && f.period !== "30d") p.set("periodo", f.period);
  if (f.page && f.page > 1) p.set("pagina", String(f.page));
  const s = p.toString();
  return s ? `?${s}` : "";
}

/** Início do período (ISO) ou null para "tudo". */
export function periodStart(period: LeadPeriod, now: Date = new Date()): string | null {
  if (period === "tudo") return null;
  const days = Number(period.replace("d", ""));
  return new Date(now.getTime() - days * 86_400_000).toISOString();
}

// ---- CSV ---------------------------------------------------------------------------

/**
 * Uma célula de CSV (RFC 4180, separador ";" para o Excel em pt-BR). Texto
 * que começa com =, +, -, @, tab ou retorno vira texto com um apóstrofo na
 * frente: a planilha não executa fórmula vinda do formulário público.
 */
export function csvCell(value: unknown): string {
  let s = value == null ? "" : String(value);
  s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[";\n\r]/.test(s) || s !== s.trim() ? `"${s.replace(/"/g, '""')}"` : s;
}

export const csvRow = (cells: unknown[]) => `${cells.map(csvCell).join(";")}\r\n`;

/** BOM para o Excel abrir em UTF-8. */
export const CSV_BOM = "﻿";

export type LeadRow = {
  createdAt: string;
  landingName: string;
  data: Record<string, string>;
  utm: Record<string, string>;
  referrer: string | null;
};

export const UTM_COLUMNS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"] as const;

/** Colunas do arquivo: data, LP, campos conhecidos, outros campos, UTMs e origem. */
export function leadCsvHeader(fields: string[]): string {
  return csvRow(["Recebido em", "Landing page", ...fields, "Outros campos", ...UTM_COLUMNS, "Origem"]);
}

/** Data e hora no fuso do workspace, no formato do Excel brasileiro. */
export function csvDate(iso: string, timeZone: string): string {
  const d = new Date(iso);
  try {
    return new Intl.DateTimeFormat("pt-BR", { timeZone, dateStyle: "short", timeStyle: "medium" }).format(d).replace(",", "");
  } catch {
    return d.toISOString();
  }
}

export function leadCsvLine(row: LeadRow, fields: string[], timeZone: string): string {
  const known = new Set(fields);
  const others = Object.entries(row.data)
    .filter(([k]) => !known.has(k))
    .map(([k, v]) => `${k}: ${v}`)
    .join(" | ");
  return csvRow([csvDate(row.createdAt, timeZone), row.landingName, ...fields.map((f) => row.data[f] ?? ""), others, ...UTM_COLUMNS.map((k) => row.utm[k] ?? ""), row.referrer ?? ""]);
}

/** Campos (rótulos) na ordem em que aparecem, sem repetir. */
export function mergeFieldLabels(lists: string[][]): string[] {
  const out: string[] = [];
  for (const list of lists) for (const f of list) if (f && !out.includes(f)) out.push(f);
  return out;
}

/** Só pares texto → texto do jsonb (o resto é ignorado). */
export function stringRecord(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) if (typeof v === "string") out[k] = v;
  return out;
}

export function leadCsvFilename(now: Date = new Date()): string {
  return `leads-${now.toISOString().slice(0, 10)}.csv`;
}
