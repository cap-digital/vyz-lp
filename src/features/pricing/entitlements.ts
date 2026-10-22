// Limites por plano. A LP (cartões de planos) e o painel (bloqueios) usam as
// mesmas funções daqui.

export type Tier = "base" | "pro" | "avancado" | "personalizado";

export const TIERS: Tier[] = ["base", "pro", "avancado", "personalizado"];

export const TIER_LABEL: Record<Tier, string> = {
  base: "Base",
  pro: "Pro",
  avancado: "Avançado",
  personalizado: "Personalizado",
};

const RANK: Record<Tier, number> = { base: 0, pro: 1, avancado: 2, personalizado: 3 };

export type Entitlements = {
  dashboardTemplates: number;
  landingTemplates: number;
  /** "core" = Meta, Google Ads e GA4. */
  platforms: "core" | "all";
  /** Páginas do dashboard liberadas até este nível. */
  pages: Tier;
  whiteLabel: boolean;
  audio: "none" | "soon";
  customDashboards: boolean;
  // Quantidades (provisórias, ver docs/PENDENCIAS.md)
  maxDashboards: number;
  maxLandingPages: number;
};

export const ENTITLEMENTS: Record<Tier, Entitlements> = {
  base: { dashboardTemplates: 5, landingTemplates: 3, platforms: "core", pages: "base", whiteLabel: false, audio: "none", customDashboards: false, maxDashboards: 2, maxLandingPages: 1 },
  pro: { dashboardTemplates: 10, landingTemplates: 6, platforms: "all", pages: "pro", whiteLabel: false, audio: "none", customDashboards: false, maxDashboards: 10, maxLandingPages: 3 },
  avancado: { dashboardTemplates: 20, landingTemplates: 10, platforms: "all", pages: "avancado", whiteLabel: false, audio: "soon", customDashboards: false, maxDashboards: 20, maxLandingPages: 10 },
  personalizado: { dashboardTemplates: 20, landingTemplates: 10, platforms: "all", pages: "avancado", whiteLabel: true, audio: "soon", customDashboards: true, maxDashboards: 50, maxLandingPages: 10 },
};

/** O plano `tier` cobre o que exige `required`? */
export function canUse(tier: Tier, required: Tier): boolean {
  return RANK[tier] >= RANK[required];
}

/** Rótulo do bloqueio: "Disponível no Pro". */
export function availableIn(required: Tier): string {
  return `Disponível no ${TIER_LABEL[required]}`;
}

/** "5 templates de dashboard · 3 de landing page" (cartões da LP). */
export function templateCountsLabel(tier: Tier): string {
  const e = ENTITLEMENTS[tier];
  return `${e.dashboardTemplates} templates de dashboard · ${e.landingTemplates} de landing page`;
}

/** Próximo plano acima (para o botão de upgrade). */
export function nextTier(tier: Tier): Tier | null {
  const i = TIERS.indexOf(tier);
  return i < TIERS.length - 1 ? TIERS[i + 1] : null;
}

/** Linhas da tabela de limites (página Plano e documentação). */
export const LIMIT_ROWS: { label: string; value: (t: Tier) => string }[] = [
  { label: "Templates de dashboard", value: (t) => (t === "personalizado" ? "20 + sob medida" : String(ENTITLEMENTS[t].dashboardTemplates)) },
  { label: "Templates de landing page", value: (t) => String(ENTITLEMENTS[t].landingTemplates) },
  { label: "Plataformas", value: (t) => (ENTITLEMENTS[t].platforms === "core" ? "Meta, Google Ads, GA4" : "todas as 27") },
  {
    label: "Páginas do dashboard",
    value: (t) => ({ base: "essenciais", pro: "+ Pro", avancado: "todas", personalizado: "todas" })[t],
  },
  { label: "Marca própria (white-label)", value: (t) => (ENTITLEMENTS[t].whiteLabel ? "sim" : "não") },
  { label: "Análise por áudio", value: (t) => (ENTITLEMENTS[t].audio === "soon" ? "em breve" : "não") },
  { label: "Dashboards", value: (t) => String(ENTITLEMENTS[t].maxDashboards) },
  { label: "Landing pages publicadas", value: (t) => String(ENTITLEMENTS[t].maxLandingPages) },
];
