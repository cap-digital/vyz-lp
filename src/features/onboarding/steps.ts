// Regras do onboarding (/comecar): ordem dos passos, plataformas que dá para
// conectar agora, templates que servem ao negócio e as páginas que o plano
// libera. Puro: o servidor (actions) e a tela usam as mesmas funções.

import { PLATFORM_ORDER, PLATFORMS, type PlatformId } from "@/features/accounts/platforms";
import { businessType } from "@/features/catalog/business-types";
import { PROVIDER_IDS, type ProviderId } from "@/features/integrations/providers";
import { availableIn, canUse, type Tier } from "@/features/pricing/entitlements";
import { LIVE_TEMPLATES } from "@/features/templates/live";
import { PAGES } from "@/features/templates/pages";
import type { DashboardTemplate, PageId } from "@/features/templates/types";
import type { OnboardingStep } from "@/features/workspace/session";

/** Passos em ordem ("done" fica de fora: é o fim). */
export const ONBOARDING_STEPS = ["business", "platforms", "connect", "dashboard"] as const satisfies readonly OnboardingStep[];
export type ActiveStep = (typeof ONBOARDING_STEPS)[number];

export const STEP_LABEL: Record<ActiveStep, string> = {
  business: "Negócio",
  platforms: "Plataformas",
  connect: "Conectar",
  dashboard: "Dashboard",
};

export const isActiveStep = (v: unknown): v is ActiveStep => typeof v === "string" && (ONBOARDING_STEPS as readonly string[]).includes(v);

/** Posição do passo (done = depois do último). */
export function stepIndex(step: OnboardingStep): number {
  return step === "done" ? ONBOARDING_STEPS.length : ONBOARDING_STEPS.indexOf(step);
}

/** Só dá para voltar a um passo anterior ao atual. */
export function canGoBackTo(current: OnboardingStep, target: OnboardingStep): boolean {
  return isActiveStep(target) && current !== "done" && stepIndex(target) < stepIndex(current);
}

/** Plataformas que conectam por login agora (as outras aparecem como "em breve"). */
export const CONNECTABLE: readonly ProviderId[] = PROVIDER_IDS;
export const isConnectable = (id: string): id is ProviderId => (CONNECTABLE as readonly string[]).includes(id);

export type PlatformOption = {
  id: PlatformId;
  name: string;
  /** Pode ser escolhida agora. */
  available: boolean;
  /** Motivo quando não pode: "Em breve" ou "Disponível no Pro". */
  reason: string | null;
};

/** Cartões do passo 2: Meta e Google primeiro; as demais com o motivo do bloqueio. */
export function platformOptions(tier: Tier | null): PlatformOption[] {
  return PLATFORM_ORDER.filter((id) => PLATFORMS[id].kind !== "crm").map((id) => {
    const p = PLATFORMS[id];
    const allowed = !!tier && canUse(tier, p.tier);
    const connectable = isConnectable(id);
    return {
      id,
      name: p.name,
      available: connectable && allowed,
      reason: !allowed ? availableIn(p.tier) : connectable ? null : "Em breve",
    };
  });
}

/** O que a pessoa marcou no passo 2, já filtrado pelo que pode ser escolhido. */
export function selectablePlatforms(ids: readonly string[], tier: Tier | null): ProviderId[] {
  const ok = new Set(platformOptions(tier).filter((o) => o.available).map((o) => o.id as string));
  return CONNECTABLE.filter((id) => ids.includes(id) && ok.has(id));
}

/** Plataforma do template live (Meta Ads · E-commerce → meta). */
export function templateProvider(t: DashboardTemplate): ProviderId | null {
  const source = t.sources[0];
  return source && isConnectable(source) ? source : null;
}

/** Templates com dados reais que servem ao tipo de negócio e às plataformas escolhidas. */
export function templatesFor(businessTypeId: string | null, providers: readonly ProviderId[]): DashboardTemplate[] {
  const profile = businessType(businessTypeId)?.profile;
  if (!profile) return [];
  return LIVE_TEMPLATES.filter((t) => {
    const p = templateProvider(t);
    return t.profile === profile && !!p && providers.includes(p);
  });
}

export type TemplatePage = { id: PageId; name: string; allowed: boolean; lockLabel: string | null };

/** Páginas do template com o que o plano libera (a ordem é a do template). */
export function templatePages(t: DashboardTemplate, pagesTier: Tier | null): TemplatePage[] {
  return t.pages.map((id) => {
    const page = PAGES[id];
    const allowed = !!pagesTier && canUse(pagesTier, page.tier);
    return { id, name: page.name, allowed, lockLabel: allowed ? null : availableIn(page.tier) };
  });
}

/** Só as páginas que o plano libera (o que vai para create_dashboard). */
export function allowedPages(t: DashboardTemplate, pagesTier: Tier | null): PageId[] {
  return templatePages(t, pagesTier)
    .filter((p) => p.allowed)
    .map((p) => p.id);
}

/** "12,5" ou "12.5" → 12.5; "1.500" → 1500; vazio → null; inválido → NaN. */
export function parseDecimal(raw: string): number | null {
  const v = raw.trim().replace(/\s/g, "");
  if (!v) return null;
  const thousands = /^\d{1,3}(\.\d{3})+$/.test(v);
  const normalized = v.includes(",") || thousands ? v.replace(/\./g, "").replace(",", ".") : v;
  return /^\d+(\.\d+)?$/.test(normalized) ? Number(normalized) : Number.NaN;
}

/** Margem em % (1 a 100) → fração para o banco; null quando vazia. */
export function marginFromPercent(raw: string): number | null | "invalid" {
  const v = parseDecimal(raw);
  if (v === null) return null;
  if (!Number.isFinite(v) || v <= 0 || v > 100) return "invalid";
  return Math.round(v * 100) / 10000;
}

/** Valor em reais → centavos; null quando vazio. */
export function centsFromReais(raw: string): number | null | "invalid" {
  const v = parseDecimal(raw.replace(/^R\$/i, ""));
  if (v === null) return null;
  if (!Number.isFinite(v) || v <= 0 || v > 10_000_000) return "invalid";
  return Math.round(v * 100);
}
