"use server";

// Passos do onboarding (/comecar). Cada passo grava no banco com a sessão de
// quem está logado (RLS: só admin edita o workspace e as plataformas) e volta
// para /comecar, que lê o passo do banco: recarregar continua de onde parou.

import { redirect, unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { businessType } from "@/features/catalog/business-types";
import { PROVIDERS } from "@/features/integrations/providers";
import { allowedPages, canGoBackTo, selectablePlatforms, stepIndex, templateProvider, templatesFor, type ActiveStep } from "@/features/onboarding/steps";
import { LIVE_TEMPLATES } from "@/features/templates/live";
import type { OnboardingStep, WorkspaceSession } from "@/features/workspace/session";
import { authorize } from "@/server/auth/workspace";
import { logActivity } from "@/server/history/log";
import { appError, fromPostgrest, toActionError, unwrap, type ActionResult } from "@/server/supabase/errors";
import { createServerSupabase } from "@/server/supabase/server";
import { loadChosenPlatforms } from "./queries";

const HOME = "/comecar";

/** Admin com plano ativo e onboarding em andamento, já no passo `from` (ou depois). */
async function onboardingSession(from: ActiveStep = "business"): Promise<WorkspaceSession> {
  const session = await authorize("admin");
  if (session.workspace.onboardingStep === "done") redirect("/painel");
  if (stepIndex(session.workspace.onboardingStep) < stepIndex(from)) throw appError("onboarding:step", "Este passo ainda não chegou. Recarregue a página.");
  return session;
}

async function saveStep(workspaceId: string, step: OnboardingStep, extra: { business_type_id?: string } = {}) {
  const supabase = await createServerSupabase();
  unwrap(
    await supabase
      .from("workspaces")
      .update({ ...extra, onboarding_step: step, onboarding_completed_at: step === "done" ? new Date().toISOString() : null })
      .eq("id", workspaceId),
  );
}

/** Passo 1: tipo de negócio (só os disponíveis). */
export async function chooseBusiness(businessTypeId: string): Promise<ActionResult> {
  try {
    const parsed = z.string().max(40).safeParse(businessTypeId);
    const type = parsed.success ? businessType(parsed.data) : undefined;
    if (!type) throw appError("validation");
    if (!type.available) throw appError("onboarding:business_unavailable", `${type.name} ainda não está disponível. Por enquanto, o VYZ atende e-commerce.`);
    const session = await onboardingSession();
    await saveStep(session.workspace.id, "platforms", { business_type_id: type.id });
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
  redirect(HOME);
}

/** Passo 2: Meta Ads e/ou Google Ads. As outras plataformas gravadas ficam como estão. */
export async function choosePlatforms(platformIds: string[]): Promise<ActionResult> {
  try {
    const parsed = z.array(z.string().max(20)).max(20).safeParse(platformIds);
    if (!parsed.success) throw appError("validation");
    const session = await onboardingSession("platforms");
    const chosen = selectablePlatforms(parsed.data, session.access.tier);
    if (chosen.length === 0 || chosen.length !== new Set(parsed.data).size) {
      throw appError("onboarding:no_platforms", chosen.length === 0 ? "Escolha pelo menos uma plataforma." : "Uma das plataformas não está disponível no seu plano.");
    }

    const supabase = await createServerSupabase();
    const current = await loadChosenPlatforms(session.workspace.id);
    const remove = current.filter((p) => !chosen.includes(p));
    const add = chosen.filter((p) => !current.includes(p));
    if (remove.length) unwrap(await supabase.from("workspace_platforms").delete().eq("workspace_id", session.workspace.id).in("platform_id", remove));
    if (add.length) unwrap(await supabase.from("workspace_platforms").insert(add.map((platform_id) => ({ workspace_id: session.workspace.id, platform_id }))));
    await saveStep(session.workspace.id, "connect");
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
  redirect(HOME);
}

/** Passo 3 → 4: precisa de ao menos uma conta ativa numa plataforma escolhida. */
export async function confirmAccounts(): Promise<ActionResult> {
  try {
    const session = await onboardingSession("connect");
    const platforms = await loadChosenPlatforms(session.workspace.id);
    const supabase = await createServerSupabase();
    const { count, error } = await supabase
      .from("ad_accounts")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", session.workspace.id)
      .eq("is_enabled", true)
      .in("platform_id", platforms.length ? platforms : ["_"]);
    if (error) throw fromPostgrest(error);
    if (!count) throw appError("onboarding:no_accounts", "Conecte uma plataforma e ative pelo menos uma conta para continuar.");
    await saveStep(session.workspace.id, "dashboard");
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
  redirect(HOME);
}

/** Volta a um passo anterior (o que já foi gravado continua lá). */
export async function goToStep(step: string): Promise<ActionResult> {
  try {
    const parsed = z.enum(["business", "platforms", "connect"]).safeParse(step);
    if (!parsed.success) throw appError("validation");
    const session = await onboardingSession();
    if (!canGoBackTo(session.workspace.onboardingStep, parsed.data)) throw appError("validation");
    await saveStep(session.workspace.id, parsed.data);
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
  redirect(HOME);
}

const DashboardsInput = z
  .object({
    dashboards: z
      .array(z.object({ templateId: z.string().max(60), name: z.string().trim().min(1, "Dê um nome ao dashboard.").max(80) }).strict())
      .min(1)
      .max(LIVE_TEMPLATES.length),
    clientName: z.string().trim().max(80),
    /** Fração (0–1]. */
    margin: z.number().gt(0).lte(1).nullable(),
    goalCents: z.number().int().positive().max(1_000_000_000).nullable(),
  })
  .strict();

export type OnboardingDashboardsInput = z.input<typeof DashboardsInput>;

/**
 * Passo 4: cria os dashboards (create_dashboard, RLS de quem chama) com as
 * páginas que o plano libera e as contas ativas da plataforma, conclui o
 * onboarding e abre o primeiro. Repetir não duplica: um template que já tem
 * dashboard no workspace reaproveita o existente.
 */
export async function createOnboardingDashboards(input: OnboardingDashboardsInput): Promise<ActionResult> {
  let firstId: string;
  try {
    const parsed = DashboardsInput.safeParse(input);
    if (!parsed.success) {
      const issue = parsed.error.issues.find((i) => i.path[0] === "dashboards" && i.path[2] === "name");
      throw issue ? appError("validation", issue.message) : appError("validation");
    }
    const session = await onboardingSession("dashboard");
    const { dashboards, clientName, margin, goalCents } = parsed.data;
    if (new Set(dashboards.map((d) => d.templateId)).size !== dashboards.length) throw appError("validation");

    const supabase = await createServerSupabase();
    const workspaceId = session.workspace.id;
    const platforms = await loadChosenPlatforms(workspaceId);
    const fits = templatesFor(session.workspace.businessTypeId, platforms);
    const pagesTier = session.access.entitlements?.pages ?? null;

    // Contas ativas e conectadas e dashboards que já existem, relidos com a sessão.
    const [accounts, existing] = await Promise.all([
      supabase
        .from("ad_accounts")
        .select("id, platform_id")
        .eq("workspace_id", workspaceId)
        .eq("is_enabled", true)
        .not("connection_id", "is", null)
        .then((r) => unwrap(r) ?? []),
      supabase
        .from("dashboards")
        .select("id, template_id")
        .eq("workspace_id", workspaceId)
        .in(
          "template_id",
          dashboards.map((d) => d.templateId),
        )
        .order("created_at")
        .then((r) => unwrap(r) ?? []),
    ]);

    const ids: string[] = [];
    for (const d of dashboards) {
      const template = fits.find((t) => t.id === d.templateId);
      const provider = template && templateProvider(template);
      if (!template || !provider) throw appError("dashboard:template_unavailable");
      const sources = accounts.filter((a) => a.platform_id === PROVIDERS[provider].platformId).map((a) => a.id);
      if (sources.length === 0) throw appError("onboarding:no_accounts", `Ative uma conta do ${PROVIDERS[provider].name} antes de criar este dashboard.`);

      const already = existing.find((e) => e.template_id === template.id);
      if (already) {
        ids.push(already.id);
        continue;
      }
      const pages = allowedPages(template, pagesTier);
      if (pages.length === 0) throw appError("dashboard:no_pages");
      const id = unwrap(
        await supabase.rpc("create_dashboard", {
          p_workspace_id: workspaceId,
          p_template_id: template.id,
          p_name: d.name,
          p_client_name: clientName,
          p_settings: { margin, goal_cents: goalCents },
          p_page_type_ids: pages,
          p_ad_account_ids: sources,
        }),
      );
      if (!id) throw appError("unknown");
      ids.push(id);
      await logActivity({
        workspaceId,
        actorId: session.user.id,
        event: "dashboard.created",
        entityType: "dashboard",
        entityId: id,
        metadata: { template_id: template.id, pages, accounts: sources.length, source: "onboarding" },
      });
    }

    await saveStep(workspaceId, "done");
    await logActivity({ workspaceId, actorId: session.user.id, event: "onboarding.completed", metadata: { dashboards: ids.length, platforms } });
    firstId = ids[0];
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
  redirect(`/painel/dashboards/${firstId}`);
}

/** Termina sem criar dashboard (dá para criar depois em Dashboards). */
export async function finishOnboarding(): Promise<ActionResult> {
  try {
    // Negócio e plataformas são obrigatórios; conectar e o dashboard podem ficar para depois.
    const session = await onboardingSession("connect");
    await saveStep(session.workspace.id, "done");
    await logActivity({ workspaceId: session.workspace.id, actorId: session.user.id, event: "onboarding.completed", metadata: { dashboards: 0, skipped: true } });
  } catch (err) {
    unstable_rethrow(err);
    return toActionError(err);
  }
  redirect("/painel");
}
