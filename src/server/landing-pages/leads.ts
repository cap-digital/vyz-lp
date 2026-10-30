import "server-only";

// Leads das landing pages (landing_page_submissions). Só admin lê: o RLS do
// banco já restringe; aqui a checagem é para dar a mensagem certa e falhar
// cedo. Nada de IP ou navegador do visitante na tela nem no CSV.

import { LEADS_PAGE_SIZE, leadCsvHeader, leadCsvLine, mergeFieldLabels, periodStart, stringRecord, type LeadFilters, type LeadRow } from "@/features/landing-pages/leads";
import { readStoredContent } from "@/features/landing-pages/model";
import { landingDefaults, landingTemplate } from "@/features/templates/landing-pages";
import { hasRole, type WorkspaceSession } from "@/features/workspace/session";
import type { Json } from "@/lib/supabase/database.types";
import { unwrap } from "@/server/supabase/errors";
import { createServerSupabase } from "@/server/supabase/server";

export type LeadLanding = { id: string; name: string; fields: string[] };
export type LeadItem = LeadRow & { id: string; landingPageId: string };
export type LeadsPageData = {
  landings: LeadLanding[];
  /** Rótulos dos campos das LPs do filtro (colunas da tabela). */
  fields: string[];
  items: LeadItem[];
  total: number;
  page: number;
  pages: number;
};

/** Rótulos do formulário como o envio grava (mesma regra de parseSubmission). */
function fieldLabels(templateId: string, content: Json): string[] {
  const stored = readStoredContent(content, landingDefaults(landingTemplate(templateId) ?? landingTemplate("captura-leads")!));
  return stored.fields.map((label, i) => (label.trim() || `Campo ${i + 1}`).slice(0, 32));
}

async function listLeadLandings(workspaceId: string): Promise<LeadLanding[]> {
  const supabase = await createServerSupabase();
  const rows = unwrap(await supabase.from("landing_pages").select("id, name, template_id, content").eq("workspace_id", workspaceId).order("created_at", { ascending: false }));
  return (rows ?? []).map((r) => ({ id: r.id, name: r.name, fields: fieldLabels(r.template_id, r.content) }));
}

type SubmissionRow = { id: string; landing_page_id: string; data: Json; utm: Json; referrer: string | null; created_at: string };

const toItem = (r: SubmissionRow, names: Map<string, string>): LeadItem => ({
  id: r.id,
  landingPageId: r.landing_page_id,
  createdAt: r.created_at,
  landingName: names.get(r.landing_page_id) ?? "Landing page",
  data: stringRecord(r.data),
  utm: stringRecord(r.utm),
  referrer: r.referrer,
});

function filtered(supabase: Awaited<ReturnType<typeof createServerSupabase>>, workspaceId: string, f: LeadFilters, count = false) {
  let q = supabase
    .from("landing_page_submissions")
    .select("id, landing_page_id, data, utm, referrer, created_at", count ? { count: "exact" } : undefined)
    .eq("workspace_id", workspaceId);
  if (f.landingPageId) q = q.eq("landing_page_id", f.landingPageId);
  const from = periodStart(f.period);
  if (from) q = q.gte("created_at", from);
  return q;
}

/** Página de leads com os filtros. null = sem permissão (não é admin). */
export async function getLeadsPage(session: WorkspaceSession, f: LeadFilters): Promise<LeadsPageData | null> {
  if (!hasRole(session.role, "admin")) return null;
  const ws = session.workspace.id;
  const landings = await listLeadLandings(ws);
  const filter = f.landingPageId && landings.some((l) => l.id === f.landingPageId) ? f : { ...f, landingPageId: null };
  const supabase = await createServerSupabase();
  const start = (filter.page - 1) * LEADS_PAGE_SIZE;
  const res = await filtered(supabase, ws, filter, true)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(start, start + LEADS_PAGE_SIZE - 1);
  const total = res.count ?? 0;
  // página além do fim (PostgREST responde 416): lista vazia, sem erro
  const rows = res.error && res.status === 416 ? [] : (unwrap(res) ?? []);
  const names = new Map(landings.map((l) => [l.id, l.name]));
  const scope = filter.landingPageId ? landings.filter((l) => l.id === filter.landingPageId) : landings;
  return {
    landings,
    fields: mergeFieldLabels(scope.map((l) => l.fields)).slice(0, 8),
    items: rows.map((r) => toItem(r as SubmissionRow, names)),
    total,
    page: filter.page,
    pages: Math.max(1, Math.ceil(total / LEADS_PAGE_SIZE)),
  };
}

const CSV_BATCH = 1000;
/** Teto do arquivo (protege o servidor e o banco). */
export const CSV_MAX_ROWS = 50_000;

/**
 * Prepara o CSV (cliente do banco e colunas ainda dentro da requisição) e
 * devolve as linhas em lotes paginados por (created_at, id): o arquivo sai
 * aos poucos, sem carregar tudo na memória. Quem chama já autorizou admin.
 */
export async function prepareLeadCsv(session: WorkspaceSession, f: LeadFilters): Promise<AsyncGenerator<string>> {
  const ws = session.workspace.id;
  const landings = await listLeadLandings(ws);
  const filter = f.landingPageId && landings.some((l) => l.id === f.landingPageId) ? f : { ...f, landingPageId: null };
  const scope = filter.landingPageId ? landings.filter((l) => l.id === filter.landingPageId) : landings;
  const fields = mergeFieldLabels(scope.map((l) => l.fields));
  const names = new Map(landings.map((l) => [l.id, l.name]));
  const supabase = await createServerSupabase();
  const tz = session.workspace.timezone;

  async function* chunks(): AsyncGenerator<string> {
    yield leadCsvHeader(fields);
    let cursor: { at: string; id: string } | null = null;
    let sent = 0;
    while (sent < CSV_MAX_ROWS) {
      let q = filtered(supabase, ws, filter);
      if (cursor) q = q.or(`created_at.lt."${cursor.at}",and(created_at.eq."${cursor.at}",id.lt.${cursor.id})`);
      const rows = (unwrap(await q.order("created_at", { ascending: false }).order("id", { ascending: false }).limit(Math.min(CSV_BATCH, CSV_MAX_ROWS - sent))) ?? []) as SubmissionRow[];
      if (!rows.length) break;
      yield rows.map((r) => leadCsvLine(toItem(r, names), fields, tz)).join("");
      sent += rows.length;
      const last = rows[rows.length - 1];
      cursor = { at: last.created_at, id: last.id };
      if (rows.length < CSV_BATCH) break;
    }
  }
  return chunks();
}
