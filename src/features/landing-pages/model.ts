// Regras puras das landing pages (cliente e servidor): formato do conteúdo,
// rastreamento, endereço (slug) e leitura do formulário público. O banco repete
// as regras de formato (checks) e as de plano (gatilhos).

import { z } from "zod";
import { LANDING_SECTIONS, type LandingContent, type LandingSection } from "@/features/templates/landing-pages";
import type { Tracking } from "@/features/workspace/types";
import { normalizeTracking, TRACKING_FIELDS, validateTracking } from "./tracking";

export type LandingStatus = "draft" | "published" | "archived";

export const LANDING_STATUS_LABEL: Record<LandingStatus, string> = { draft: "Rascunho", published: "Publicada", archived: "Arquivada" };

/** Formato que o servidor entrega ao painel. `content.logo` já vem como URL pública. */
export type LandingPageDTO = {
  id: string;
  templateId: string;
  name: string;
  slug: string;
  content: LandingContent;
  tracking: Tracking;
  status: LandingStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Há mudanças salvas depois da última publicação. */
  hasUnpublishedChanges: boolean;
};

export type LandingVersionDTO = { version: number; publishedAt: string; publishedBy: string | null };

export const EMPTY_TRACKING: Tracking = { gtm: "", pixel: "", adsConversion: "", ga4: "" };

// ---- conteúdo -----------------------------------------------------------------------------

export const LIMITS = { brand: 80, headline: 90, sub: 180, cta: 32, field: 32, fields: 4, whatsapp: 20 } as const;

const text = (max: number) => z.string().transform((v) => v.slice(0, max));
const sectionsSchema = z.record(z.string(), z.boolean()).transform((raw) => {
  const out: Partial<Record<LandingSection, boolean>> = {};
  for (const s of LANDING_SECTIONS) if (typeof raw[s] === "boolean") out[s] = raw[s];
  return out;
});

/** Conteúdo editável. O logo não entra: é enviado ao Storage à parte. */
export const contentSchema = z.object({
  brand: text(LIMITS.brand),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida."),
  headline: text(LIMITS.headline),
  sub: text(LIMITS.sub),
  cta: text(LIMITS.cta),
  sections: sectionsSchema,
  fields: z
    .array(text(LIMITS.field))
    .min(1)
    .transform((f) => f.slice(0, LIMITS.fields)),
  whatsapp: text(LIMITS.whatsapp),
});

export type EditableContent = z.infer<typeof contentSchema>;

/** Conteúdo como fica no banco: o editável + o caminho do logo no Storage. */
export type StoredContent = EditableContent & { logoPath?: string };

/** Lê o jsonb do banco com tolerância (conteúdo antigo ou incompleto não quebra a página). */
export function readStoredContent(raw: unknown, fallback: LandingContent): StoredContent {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const sections = obj.sections && typeof obj.sections === "object" ? obj.sections : fallback.sections;
  const merged = { ...fallback, ...obj, sections };
  const parsed = contentSchema.safeParse(merged);
  const content = parsed.success ? parsed.data : contentSchema.parse({ ...fallback, logo: undefined });
  const logoPath = typeof obj.logoPath === "string" ? obj.logoPath : undefined;
  return logoPath ? { ...content, logoPath } : content;
}

// ---- rastreamento --------------------------------------------------------------------------

export type TrackingColumns = {
  gtm_container_id: string | null;
  meta_pixel_id: string | null;
  google_ads_conversion: string | null;
  ga4_measurement_id: string | null;
};

const COLUMN: Record<keyof Tracking, keyof TrackingColumns> = {
  gtm: "gtm_container_id",
  pixel: "meta_pixel_id",
  adsConversion: "google_ads_conversion",
  ga4: "ga4_measurement_id",
};

/** Normaliza e valida. Erros por campo (mesmas mensagens do formulário). */
export function trackingToColumns(t: Partial<Tracking>): { ok: true; columns: TrackingColumns } | { ok: false; fields: Record<string, string> } {
  const columns = {} as TrackingColumns;
  const fields: Record<string, string> = {};
  for (const f of TRACKING_FIELDS) {
    const raw = typeof t[f.key] === "string" ? t[f.key]!.slice(0, 64) : "";
    const error = validateTracking(f.key, raw);
    if (error) fields[f.key] = error;
    columns[COLUMN[f.key]] = normalizeTracking(f.key, raw) || null;
  }
  return Object.keys(fields).length ? { ok: false, fields } : { ok: true, columns };
}

export function columnsToTracking(row: Partial<Record<keyof TrackingColumns, string | null>>): Tracking {
  return {
    gtm: row.gtm_container_id ?? "",
    pixel: row.meta_pixel_id ?? "",
    adsConversion: row.google_ads_conversion ?? "",
    ga4: row.ga4_measurement_id ?? "",
  };
}

// ---- endereço (slug) ------------------------------------------------------------------------

export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$/;

/** Mesma lista do banco (landing_pages_slug_not_reserved). */
export const RESERVED_SLUGS = new Set([
  "www", "app", "api", "admin", "painel", "entrar", "login", "auth", "assinar", "checkout", "pagamento", "conta", "contas",
  "suporte", "ajuda", "help", "status", "docs", "blog", "mail", "email", "smtp", "ftp", "cdn", "static", "assets", "img",
  "r", "p", "lp", "vyz", "dev", "staging", "teste", "test", "demo", "dashboard", "dashboards", "comecar", "integracoes",
]);

/** Deixa no formato aceito enquanto a pessoa digita (minúsculas, hífen, até 48). */
export function cleanSlug(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+/, "")
    .slice(0, 48);
}

/** Problema do endereço, ou null quando ele está no formato certo. */
export function slugIssue(slug: string): string | null {
  if (!slug) return "Escolha um endereço.";
  if (slug.length < 3) return "Use pelo menos 3 caracteres.";
  if (!SLUG_PATTERN.test(slug)) return "Só letras minúsculas, números e hífen (sem hífen no começo ou no fim).";
  if (RESERVED_SLUGS.has(slug)) return "Esse endereço é reservado. Escolha outro.";
  return null;
}

/** Endereço a partir do nome da marca. */
export function slugFromBrand(brand: string): string {
  const s = cleanSlug(brand).replace(/-+$/, "").slice(0, 40).replace(/-+$/, "");
  return !s || slugIssue(s) ? `${s || "pagina"}-lp`.replace(/^-/, "") : s;
}

/** Candidatos quando o endereço já existe: "marca-2", "marca-3"... */
export function slugCandidates(base: string, count = 8): string[] {
  const root = cleanSlug(base).replace(/-+$/, "").slice(0, 44).replace(/-+$/, "") || "pagina";
  return Array.from({ length: count }, (_, i) => `${root}-${i + 2}`);
}

// ---- formulário público ---------------------------------------------------------------------

/** Campo invisível: gente não preenche, robô preenche. */
export const HONEYPOT_FIELD = "website";
export const FIELD_PREFIX = "campo_";
export const MAX_FIELD_LENGTH = 500;

const looksLikeEmail = (label: string) => /e-?mail/i.test(label);
const looksLikePhone = (label: string) => /whats|telefone|celular|fone/i.test(label);

export type SubmissionParse = { ok: true; data: Record<string, string> } | { ok: false; fields: Record<string, string>; message: string };

/**
 * Lê os campos enviados pelos rótulos que o banco tem (nunca pelos do
 * navegador). Pelo menos um campo preenchido; e-mail e telefone conferidos.
 */
export function parseSubmission(labels: string[], read: (name: string) => unknown): SubmissionParse {
  const data: Record<string, string> = {};
  const fields: Record<string, string> = {};
  labels.slice(0, LIMITS.fields).forEach((label, i) => {
    const name = `${FIELD_PREFIX}${i}`;
    const raw = read(name);
    const value = typeof raw === "string" ? raw.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, MAX_FIELD_LENGTH) : "";
    if (!value) return;
    if (looksLikeEmail(label) && !z.email().safeParse(value).success) fields[name] = "Confira o e-mail.";
    if (looksLikePhone(label) && value.replace(/\D/g, "").length < 10) fields[name] = "Confira o número com DDD.";
    const key = (label.trim() || `Campo ${i + 1}`).slice(0, LIMITS.field);
    data[data[key] === undefined ? key : `${key} (${i + 1})`] = value;
  });
  if (Object.keys(fields).length) return { ok: false, fields, message: "Confira os campos destacados." };
  if (!Object.keys(data).length) return { ok: false, fields: {}, message: "Preencha o formulário antes de enviar." };
  return { ok: true, data };
}

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"] as const;

/** Parâmetros de campanha da URL da página (só os conhecidos, curtos). */
export function pickUtm(search: string): Record<string, string> {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const out: Record<string, string> = {};
  for (const k of UTM_KEYS) {
    const v = params.get(k)?.trim();
    if (v) out[k] = v.slice(0, 200);
  }
  return out;
}

/** Link do WhatsApp da marca (null sem número válido). */
export function whatsappHref(phone: string): string | null {
  let d = phone.replace(/\D/g, "");
  if (d.length < 10) return null;
  if (d.length <= 11) d = `55${d}`;
  return `https://wa.me/${d}`;
}
