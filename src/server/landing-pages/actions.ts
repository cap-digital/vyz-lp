"use server";

// Ações das landing pages (Server Actions). Editar, publicar e apagar passam
// pelo RLS de quem está logado (member+); o limite de LPs publicadas e o plano
// mínimo do template valem no banco (gatilhos). A chave de serviço só entra
// onde o usuário não tem acesso: Storage (escrita de logos é só de admin no
// bucket, mas quem edita a LP é member) e o formulário público (visitante sem login).

import { randomBytes } from "node:crypto";
import { refresh, updateTag } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import {
  contentSchema,
  EMPTY_TRACKING,
  HONEYPOT_FIELD,
  parseSubmission,
  pickUtm,
  readStoredContent,
  slugCandidates,
  slugFromBrand,
  slugIssue,
  trackingToColumns,
  type LandingPageDTO,
  type StoredContent,
} from "@/features/landing-pages/model";
import { landingDefaults, landingTemplate } from "@/features/templates/landing-pages";
import type { Json, TablesUpdate } from "@/lib/supabase/database.types";
import { BRAND_BUCKET, publicAssetUrl } from "@/lib/supabase/storage";
import { authorize } from "@/server/auth/workspace";
import { logActivity } from "@/server/history/log";
import { requestContext } from "@/server/http/request";
import { hitRateLimit } from "@/server/security/rate-limit";
import { createAdminSupabase } from "@/server/supabase/admin";
import { AppError, appError, fromPostgrest, toActionError, unwrap, type ActionError, type ActionResult } from "@/server/supabase/errors";
import { createServerSupabase, type DB } from "@/server/supabase/server";
import { LANDING_SELECT, publicLandingTag, toLandingDTO } from "./queries";

const Id = z.uuid();
const TrackingInput = z.object({ gtm: z.string(), pixel: z.string(), adsConversion: z.string(), ga4: z.string() }).partial();

/** Logo: até 900 KB (o corpo de uma Server Action tem 1 MB) e só formatos sem script. */
const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const LOGO_TYPES = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" } as const;
type LogoType = keyof typeof LOGO_TYPES;

const expire = (...slugs: (string | null | undefined)[]) => {
  for (const s of new Set(slugs)) if (s) updateTag(publicLandingTag(s));
};

async function loadRow(supabase: DB, workspaceId: string, id: string) {
  const row = unwrap(await supabase.from("landing_pages").select(LANDING_SELECT).eq("workspace_id", workspaceId).eq("id", id).maybeSingle());
  if (!row) throw appError("not_found", "Landing page não encontrada.");
  return row;
}

function storedOf(row: { template_id: string; content: Json }): StoredContent {
  const t = landingTemplate(row.template_id);
  return readStoredContent(row.content, landingDefaults(t ?? landingTemplate("captura-leads")!));
}

/** Primeiro endereço livre da lista (a chave de serviço vê os de todos os workspaces). */
async function firstFreeSlug(candidates: string[], exceptId?: string): Promise<string | null> {
  const valid = candidates.filter((s) => !slugIssue(s));
  if (!valid.length) return null;
  const { data } = await createAdminSupabase().from("landing_pages").select("id, slug").in("slug", valid);
  const taken = new Set((data ?? []).filter((r) => r.id !== exceptId).map((r) => r.slug));
  return valid.find((s) => !taken.has(s)) ?? null;
}

/** Endereço em uso (unique) ou aposentado (gatilho) vira erro no campo, com sugestão. */
async function slugError(err: unknown, slug: string, exceptId?: string): Promise<AppError | null> {
  const code = err instanceof AppError ? err.code : null;
  if (code !== "conflict" && code !== "landing:slug_retired") return null;
  const suggestion = await firstFreeSlug(slugCandidates(slug), exceptId);
  const message = code === "conflict" ? "Esse endereço já está em uso." : "Esse endereço foi usado por outra conta há pouco tempo.";
  return appError("landing:slug_taken", `${message}${suggestion ? ` Que tal ${suggestion}?` : " Escolha outro."}`, { slug: suggestion ?? "" });
}

export type SlugCheck = { slug: string; available: boolean; issue: string | null; suggestion: string | null };

/** Confere se o endereço está livre (enquanto a pessoa digita). */
export async function checkLandingSlug(slug: string, exceptId?: string): Promise<ActionResult<SlugCheck>> {
  try {
    const parsed = z.object({ slug: z.string().max(64), exceptId: Id.optional() }).safeParse({ slug, exceptId });
    if (!parsed.success) throw appError("validation");
    await authorize("member", { access: false });
    const s = parsed.data.slug;
    const issue = slugIssue(s);
    if (issue) return { ok: true, data: { slug: s, available: false, issue, suggestion: null } };
    const free = await firstFreeSlug([s], parsed.data.exceptId);
    if (free) return { ok: true, data: { slug: s, available: true, issue: null, suggestion: null } };
    const suggestion = await firstFreeSlug(slugCandidates(s), parsed.data.exceptId);
    return { ok: true, data: { slug: s, available: false, issue: "Esse endereço já está em uso.", suggestion } };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}

const CreateInput = z.object({
  templateId: z.string().min(1).max(64),
  content: z.unknown(),
  tracking: TrackingInput.optional(),
  slug: z.string().max(64).optional(),
  /** Logo do rascunho local (dataURL), enviado ao Storage na criação. */
  logoDataUrl: z.string().max(LOGO_MAX_BYTES * 1.4).optional(),
  publish: z.boolean().optional(),
});

export type CreatedLanding = { id: string; slug: string; published: boolean; publishError?: ActionError; logoError?: string };

/**
 * Cria a LP como rascunho (member). Com `publish`, tenta publicar em seguida:
 * se o plano não deixar, a LP fica salva como rascunho e o motivo volta em `publishError`.
 */
export async function createLandingPage(input: z.input<typeof CreateInput>): Promise<ActionResult<CreatedLanding>> {
  try {
    const parsed = CreateInput.safeParse(input);
    if (!parsed.success) throw appError("validation");
    const { templateId, tracking, publish, logoDataUrl } = parsed.data;
    if (!landingTemplate(templateId)) throw appError("landing:template_unavailable");
    const content = contentSchema.safeParse(parsed.data.content);
    if (!content.success) throw appError("validation", "O conteúdo da página veio num formato inválido.");
    const cols = trackingToColumns(tracking ?? EMPTY_TRACKING);
    if (!cols.ok) throw appError("validation", "Corrija os IDs de rastreamento.", cols.fields);
    const slug = parsed.data.slug || slugFromBrand(content.data.brand);
    const issue = slugIssue(slug);
    if (issue) throw appError("validation", issue, { slug: issue });

    const session = await authorize("member");
    const ws = session.workspace.id;
    const supabase = await createServerSupabase();
    const ins = await supabase
      .from("landing_pages")
      .insert({ workspace_id: ws, template_id: templateId, name: content.data.brand, slug, content: content.data as Json, ...cols.columns, created_by: session.user.id })
      .select("id, slug")
      .single();
    if (ins.error) {
      const e = fromPostgrest(ins.error);
      throw (await slugError(e, slug)) ?? e;
    }
    const id = ins.data.id;
    await logActivity({ workspaceId: ws, actorId: session.user.id, event: "landing_page.created", entityType: "landing_page", entityId: id, metadata: { template: templateId, slug } });

    let logoError: string | undefined;
    if (logoDataUrl) {
      try {
        const file = fromDataUrl(logoDataUrl);
        await storeLogo(supabase, ws, session.user.id, id, file);
      } catch (err) {
        logoError = err instanceof AppError ? err.message : "Não foi possível enviar o logo. Envie de novo no editor.";
      }
    }

    let published = false;
    let publishError: ActionError | undefined;
    if (publish) {
      const r = await supabase.from("landing_pages").update({ status: "published" }).eq("workspace_id", ws).eq("id", id);
      if (r.error) publishError = fromPostgrest(r.error).toAction();
      else {
        published = true;
        await logActivity({ workspaceId: ws, actorId: session.user.id, event: "landing_page.published", entityType: "landing_page", entityId: id, metadata: { slug } });
        expire(slug);
      }
    }
    refresh();
    return { ok: true, data: { id, slug, published, ...(publishError ? { publishError } : {}), ...(logoError ? { logoError } : {}) } };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}

const SaveInput = z.object({ content: z.unknown().optional(), tracking: TrackingInput.optional(), slug: z.string().max(64).optional() });

export type SavedLanding = { updatedAt: string; slug: string; hasUnpublishedChanges: boolean };

/**
 * Salvamento automático do editor (member). Grava o que veio (conteúdo,
 * rastreamento, endereço). Numa LP publicada, o conteúdo novo só vai ao ar
 * com "Publicar alterações" (a página pública mostra a última versão).
 */
export async function saveLandingPage(id: string, patch: z.input<typeof SaveInput>): Promise<ActionResult<SavedLanding>> {
  try {
    const pid = Id.safeParse(id);
    const parsed = SaveInput.safeParse(patch);
    if (!pid.success || !parsed.success) throw appError("validation");
    const session = await authorize("member", { access: false });
    const ws = session.workspace.id;
    const supabase = await createServerSupabase();
    const row = await loadRow(supabase, ws, pid.data);

    const update: TablesUpdate<"landing_pages"> = {};
    if (parsed.data.content !== undefined) {
      const c = contentSchema.safeParse(parsed.data.content);
      if (!c.success) throw appError("validation", "O conteúdo da página veio num formato inválido.");
      // O logo nunca vem do navegador: fica o caminho que já está no banco.
      const logoPath = storedOf(row).logoPath;
      update.content = (logoPath ? { ...c.data, logoPath } : c.data) as Json;
      update.name = c.data.brand;
    }
    if (parsed.data.tracking !== undefined) {
      const cols = trackingToColumns(parsed.data.tracking);
      if (!cols.ok) throw appError("validation", "Corrija os IDs de rastreamento.", cols.fields);
      Object.assign(update, cols.columns);
    }
    const slug = parsed.data.slug;
    if (slug !== undefined && slug !== row.slug) {
      const issue = slugIssue(slug);
      if (issue) throw appError("validation", issue, { slug: issue });
      update.slug = slug;
    }
    if (!Object.keys(update).length) {
      const dto = toLandingDTO(row);
      return { ok: true, data: { updatedAt: dto.updatedAt, slug: dto.slug, hasUnpublishedChanges: dto.hasUnpublishedChanges } };
    }

    const res = await supabase.from("landing_pages").update(update).eq("workspace_id", ws).eq("id", row.id).select(LANDING_SELECT).single();
    if (res.error) {
      const e = fromPostgrest(res.error);
      throw (slug !== undefined && (await slugError(e, slug, row.id))) || e;
    }
    // Endereço trocado: a página pública sai do endereço antigo na hora.
    if (update.slug && row.status === "published") {
      expire(row.slug, res.data.slug);
      await logActivity({ workspaceId: ws, actorId: session.user.id, event: "landing_page.slug_changed", entityType: "landing_page", entityId: row.id, metadata: { from: row.slug, to: res.data.slug } });
    }
    const dto = toLandingDTO(res.data);
    return { ok: true, data: { updatedAt: dto.updatedAt, slug: dto.slug, hasUnpublishedChanges: dto.hasUnpublishedChanges } };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}

/**
 * Publica (ou publica as alterações de uma LP já no ar) e despublica (member).
 * Cada publicação vira uma versão (gatilho no banco, com quem publicou).
 * Despublicar nunca exige plano.
 */
export async function setLandingPublished(id: string, published: boolean): Promise<ActionResult<LandingPageDTO>> {
  try {
    const pid = Id.safeParse(id);
    if (!pid.success || typeof published !== "boolean") throw appError("validation");
    const session = await authorize("member", { access: published });
    const ws = session.workspace.id;
    const supabase = await createServerSupabase();
    const row = await loadRow(supabase, ws, pid.data);
    if (published && slugIssue(row.slug)) throw appError("validation", "Escolha um endereço válido antes de publicar.", { slug: slugIssue(row.slug)! });

    // Republicar: mudar published_at gera a versão nova (o banco grava a própria hora).
    const patch = published
      ? row.status === "published"
        ? { published_at: new Date().toISOString() }
        : { status: "published" as const }
      : { status: "draft" as const };
    if (!published && row.status !== "published") return { ok: true, data: toLandingDTO(row) };
    const res = await supabase.from("landing_pages").update(patch).eq("workspace_id", ws).eq("id", row.id).select(LANDING_SELECT).single();
    if (res.error) throw fromPostgrest(res.error);

    const event = !published ? "landing_page.unpublished" : row.status === "published" ? "landing_page.republished" : "landing_page.published";
    await logActivity({ workspaceId: ws, actorId: session.user.id, event, entityType: "landing_page", entityId: row.id, metadata: { slug: row.slug } });
    expire(row.slug);
    refresh();
    return { ok: true, data: toLandingDTO(res.data) };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}

/** Traz o conteúdo e o rastreamento de uma versão publicada de volta para o editor (sem publicar). */
export async function restoreLandingVersion(id: string, version: number): Promise<ActionResult<LandingPageDTO>> {
  try {
    const parsed = z.object({ id: Id, version: z.int().min(1) }).safeParse({ id, version });
    if (!parsed.success) throw appError("validation");
    const session = await authorize("member", { access: false });
    const ws = session.workspace.id;
    const supabase = await createServerSupabase();
    const row = await loadRow(supabase, ws, parsed.data.id);
    const v = unwrap(
      await supabase.from("landing_page_versions").select("content, tracking").eq("workspace_id", ws).eq("landing_page_id", row.id).eq("version", parsed.data.version).maybeSingle(),
    );
    if (!v) throw appError("not_found", "Versão não encontrada.");
    const content = storedOf({ template_id: row.template_id, content: v.content });
    const cols = trackingToColumns((v.tracking ?? {}) as Record<string, string>);
    const res = await supabase
      .from("landing_pages")
      .update({ content: content as Json, name: content.brand, ...(cols.ok ? cols.columns : {}) })
      .eq("workspace_id", ws)
      .eq("id", row.id)
      .select(LANDING_SELECT)
      .single();
    if (res.error) throw fromPostgrest(res.error);
    await logActivity({ workspaceId: ws, actorId: session.user.id, event: "landing_page.version_restored", entityType: "landing_page", entityId: row.id, metadata: { version: parsed.data.version } });
    refresh();
    return { ok: true, data: toLandingDTO(res.data) };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}

/** Apaga a LP (member), as versões e os leads (cascade) e os logos no Storage. */
export async function deleteLandingPage(id: string): Promise<ActionResult> {
  try {
    const pid = Id.safeParse(id);
    if (!pid.success) throw appError("validation");
    const session = await authorize("member", { access: false });
    const ws = session.workspace.id;
    const supabase = await createServerSupabase();
    const row = await loadRow(supabase, ws, pid.data);
    const del = await supabase.from("landing_pages").delete().eq("workspace_id", ws).eq("id", row.id).select("id");
    if (del.error) throw fromPostgrest(del.error);
    if (!del.data?.length) throw appError("forbidden");
    await removeFolder(ws, row.id);
    await logActivity({ workspaceId: ws, actorId: session.user.id, event: "landing_page.deleted", entityType: "landing_page", entityId: row.id, metadata: { slug: row.slug, status: row.status } });
    expire(row.slug);
    refresh();
    return { ok: true, data: undefined };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}

// ---- logo -------------------------------------------------------------------------------------

type LogoFile = { bytes: Uint8Array; type: LogoType };

/** Confere o tipo pelos primeiros bytes (não pela extensão nem pelo que o navegador diz). */
function sniff(bytes: Uint8Array): LogoType | null {
  const b = (i: number) => bytes[i];
  if (b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47) return "image/png";
  if (b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return "image/jpeg";
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}

function checkLogo(bytes: Uint8Array): LogoFile {
  if (!bytes.length) throw appError("validation", "Escolha uma imagem.");
  if (bytes.length > LOGO_MAX_BYTES) throw appError("validation", "Use uma imagem de até 900 KB.");
  const type = sniff(bytes);
  if (!type) throw appError("validation", "Use PNG, JPG ou WebP.");
  return { bytes, type };
}

function fromDataUrl(dataUrl: string): LogoFile {
  const m = /^data:image\/[a-z+.-]+;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) throw appError("validation", "Use PNG, JPG ou WebP.");
  return checkLogo(new Uint8Array(Buffer.from(m[1], "base64")));
}

const folderOf = (ws: string, id: string) => `${ws}/lp/${id}`;

async function removeFolder(ws: string, id: string) {
  try {
    const bucket = createAdminSupabase().storage.from(BRAND_BUCKET);
    const { data } = await bucket.list(folderOf(ws, id), { limit: 100 });
    if (data?.length) await bucket.remove(data.map((f) => `${folderOf(ws, id)}/${f.name}`));
  } catch (err) {
    console.error("[vyz] limpeza de logos da LP", err instanceof Error ? err.message : "erro desconhecido");
  }
}

/** Apaga um logo antigo se nenhuma versão publicada ainda usa (senão a versão quebraria). */
async function dropOldLogo(supabase: DB, ws: string, id: string, path: string | undefined) {
  if (!path || !path.startsWith(`${folderOf(ws, id)}/`)) return;
  const { data } = await supabase.from("landing_page_versions").select("id").eq("workspace_id", ws).eq("landing_page_id", id).eq("content->>logoPath", path).limit(1);
  if (data?.length) return;
  const { error } = await createAdminSupabase().storage.from(BRAND_BUCKET).remove([path]);
  if (error) console.error("[vyz] logo antigo da LP", error.message);
}

/** Envia ao Storage e grava o caminho no conteúdo (o conteúdo é relido do banco). */
async function storeLogo(supabase: DB, ws: string, actorId: string, id: string, file: LogoFile): Promise<string> {
  // Confere a LP antes de enviar, para não deixar arquivo órfão no Storage.
  await loadRow(supabase, ws, id);
  const path = `${folderOf(ws, id)}/logo-${randomBytes(6).toString("hex")}.${LOGO_TYPES[file.type]}`;
  const up = await createAdminSupabase({ actorId })
    .storage.from(BRAND_BUCKET)
    .upload(path, file.bytes, { contentType: file.type, upsert: false, cacheControl: "31536000" });
  if (up.error) {
    console.error("[vyz] envio do logo da LP", up.error.message);
    throw appError("unknown", "Não foi possível enviar o logo. Tente de novo.");
  }
  const row = await loadRow(supabase, ws, id);
  const stored = storedOf(row);
  const res = await supabase.from("landing_pages").update({ content: { ...stored, logoPath: path } as Json }).eq("workspace_id", ws).eq("id", id);
  if (res.error) {
    await createAdminSupabase().storage.from(BRAND_BUCKET).remove([path]);
    throw fromPostgrest(res.error);
  }
  await dropOldLogo(supabase, ws, id, stored.logoPath);
  return publicAssetUrl(path)!;
}

/** Troca o logo da LP (member). FormData com o campo "file". */
export async function uploadLandingLogo(id: string, form: FormData): Promise<ActionResult<{ logoUrl: string }>> {
  try {
    const pid = Id.safeParse(id);
    const file = form.get("file");
    if (!pid.success || !(file instanceof File)) throw appError("validation", "Escolha uma imagem.");
    if (file.size > LOGO_MAX_BYTES) throw appError("validation", "Use uma imagem de até 900 KB.");
    const session = await authorize("member", { access: false });
    const supabase = await createServerSupabase();
    const logo = checkLogo(new Uint8Array(await file.arrayBuffer()));
    const logoUrl = await storeLogo(supabase, session.workspace.id, session.user.id, pid.data, logo);
    return { ok: true, data: { logoUrl } };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}

/** Tira o logo da LP (member); a página volta a mostrar o nome da marca. */
export async function removeLandingLogo(id: string): Promise<ActionResult> {
  try {
    const pid = Id.safeParse(id);
    if (!pid.success) throw appError("validation");
    const session = await authorize("member", { access: false });
    const ws = session.workspace.id;
    const supabase = await createServerSupabase();
    const row = await loadRow(supabase, ws, pid.data);
    const { logoPath, ...rest } = storedOf(row);
    if (!logoPath) return { ok: true, data: undefined };
    const res = await supabase.from("landing_pages").update({ content: rest as Json }).eq("workspace_id", ws).eq("id", row.id);
    if (res.error) throw fromPostgrest(res.error);
    await dropOldLogo(supabase, ws, row.id, logoPath);
    return { ok: true, data: undefined };
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
}

// ---- formulário público -----------------------------------------------------------------------

export type LeadFormState = { status: "idle" | "sent" | "error"; message?: string; fields?: Record<string, string> };

const SENT: LeadFormState = { status: "sent", message: "Recebemos seu contato. Em breve falamos com você." };

/**
 * Formulário da LP publicada (público, sem login). Robô no honeypot recebe a
 * mesma resposta de sucesso e nada é gravado. Limite por IP. Os rótulos dos
 * campos vêm da versão publicada no banco, nunca do navegador. Chave de
 * serviço porque o visitante não tem escrita no banco; a resposta não expõe nada.
 */
export async function submitLandingForm(slug: string, _prev: LeadFormState, form: FormData): Promise<LeadFormState> {
  try {
    if (typeof slug !== "string" || slugIssue(slug)) return { status: "error", message: "Página não encontrada." };
    const honeypot = form.get(HONEYPOT_FIELD);
    if (typeof honeypot === "string" && honeypot.trim() !== "") return SENT;

    const ctx = await requestContext();
    if (!(await hitRateLimit("lp_submit_ip", ctx.ip))) return { status: "error", message: "Muitos envios em pouco tempo. Espere alguns minutos e tente de novo." };

    const admin = createAdminSupabase({ forwardHeaders: ctx.forwardHeaders });
    const { data: lp } = await admin.from("landing_pages").select("id, workspace_id, template_id, content").eq("slug", slug).eq("status", "published").maybeSingle();
    if (!lp) return { status: "error", message: "Esta página não está mais no ar." };
    // Sem assinatura ativa a página está fora do ar; o formulário também.
    const { data: access } = await admin.from("workspace_access").select("has_access").eq("workspace_id", lp.workspace_id).maybeSingle();
    if (!access?.has_access) return { status: "error", message: "Esta página não está mais no ar." };
    const { data: version } = await admin
      .from("landing_page_versions")
      .select("content")
      .eq("landing_page_id", lp.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    const labels = storedOf({ template_id: lp.template_id, content: version?.content ?? lp.content }).fields;

    const parsed = parseSubmission(labels, (name) => form.get(name));
    if (!parsed.ok) return { status: "error", message: parsed.message, fields: parsed.fields };

    const page = typeof form.get("pagina") === "string" ? String(form.get("pagina")) : "";
    const referrer = typeof form.get("origem") === "string" ? String(form.get("origem")).slice(0, 500) : "";
    const { error } = await admin.from("landing_page_submissions").insert({
      workspace_id: lp.workspace_id,
      landing_page_id: lp.id,
      data: parsed.data,
      utm: pickUtm(page.slice(0, 2000)),
      referrer: /^https?:\/\//.test(referrer) ? referrer : null,
      ip: ctx.ip && /^[0-9a-f.:]+$/i.test(ctx.ip) ? ctx.ip : null,
      user_agent: ctx.userAgent,
    });
    if (error) {
      console.error("[vyz] lead da LP", error.code);
      return { status: "error", message: "Não conseguimos enviar agora. Tente de novo em instantes." };
    }
    return SENT;
  } catch (err) {
    unstable_rethrow(err);
    console.error("[vyz] formulário da LP", err instanceof Error ? err.message : "erro desconhecido");
    return { status: "error", message: "Não conseguimos enviar agora. Tente de novo em instantes." };
  }
}
