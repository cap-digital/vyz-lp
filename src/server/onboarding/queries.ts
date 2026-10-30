import "server-only";

// Estado do onboarding do workspace aberto, lido do banco com o RLS de quem
// está logado: passo atual, negócio, plataformas escolhidas, plano e (nos
// passos de conexão e dashboard) as contas conectadas.

import type { ProviderId } from "@/features/integrations/providers";
import { CONNECTABLE, isActiveStep, type ActiveStep } from "@/features/onboarding/steps";
import type { OnboardingState } from "@/features/onboarding/types";
import { LIVE_TEMPLATES } from "@/features/templates/live";
import { hasRole, type WorkspaceSession } from "@/features/workspace/session";
import { getConnectState } from "@/server/integrations/queries";
import { unwrap } from "@/server/supabase/errors";
import { createServerSupabase } from "@/server/supabase/server";

export type { OnboardingState };

/** Plataformas conectáveis gravadas em workspace_platforms. */
export async function loadChosenPlatforms(workspaceId: string): Promise<ProviderId[]> {
  const supabase = await createServerSupabase();
  const rows = unwrap(await supabase.from("workspace_platforms").select("platform_id").eq("workspace_id", workspaceId)) ?? [];
  const ids = new Set(rows.map((r) => r.platform_id));
  return CONNECTABLE.filter((p) => ids.has(p));
}

/**
 * Dashboards de templates do catálogo que já existem no workspace (uma criação
 * que parou no meio). O passo 4 os reaproveita, então não contam contra a vaga.
 */
async function countReusableDashboards(workspaceId: string): Promise<number> {
  const supabase = await createServerSupabase();
  const rows =
    unwrap(
      await supabase
        .from("dashboards")
        .select("template_id")
        .eq("workspace_id", workspaceId)
        .in(
          "template_id",
          LIVE_TEMPLATES.map((t) => t.id),
        ),
    ) ?? [];
  return new Set(rows.map((r) => r.template_id)).size;
}

/** Para a página /comecar (já passou por requireWorkspace e o onboarding não terminou). */
export async function getOnboardingState(session: WorkspaceSession): Promise<OnboardingState> {
  const raw = session.workspace.onboardingStep;
  const step: ActiveStep = isActiveStep(raw) ? raw : "business";
  const needsAccounts = step === "connect" || step === "dashboard";
  const [platforms, connect, reusable] = await Promise.all([
    loadChosenPlatforms(session.workspace.id),
    needsAccounts ? getConnectState() : Promise.resolve(null),
    step === "dashboard" ? countReusableDashboards(session.workspace.id) : Promise.resolve(0),
  ]);
  const e = session.access.entitlements;
  return {
    step,
    workspaceName: session.workspace.name,
    businessTypeId: session.workspace.businessTypeId,
    platforms,
    tier: session.access.tier,
    pagesTier: e?.pages ?? null,
    dashboardsLeft: Math.max(0, (e?.maxDashboards ?? 0) - session.usage.dashboards + reusable),
    canManage: hasRole(session.role, "admin"),
    connect,
  };
}
