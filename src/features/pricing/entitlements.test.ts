import { describe, expect, it } from "vitest";
import { PLATFORMS } from "@/features/accounts/platforms";
import { DASHBOARD_TEMPLATES } from "@/features/templates/dashboards";
import { LANDING_TEMPLATES } from "@/features/templates/landing-pages";
import { PAGES } from "@/features/templates/pages";
import { canUse, ENTITLEMENTS, templateCountsLabel, TIERS } from "./entitlements";

const count = (tier: (typeof TIERS)[number], list: { tier: string }[]) => list.filter((t) => canUse(tier, t.tier as never)).length;

describe("limites por plano", () => {
  it("contagem de templates bate com o cadastro", () => {
    for (const tier of TIERS) {
      expect(count(tier, DASHBOARD_TEMPLATES)).toBe(ENTITLEMENTS[tier].dashboardTemplates);
      expect(count(tier, LANDING_TEMPLATES)).toBe(ENTITLEMENTS[tier].landingTemplates);
    }
  });

  it("rótulo dos cartões da LP", () => {
    expect(templateCountsLabel("base")).toBe("5 templates de dashboard · 3 de landing page");
    expect(templateCountsLabel("pro")).toBe("10 templates de dashboard · 6 de landing page");
    expect(templateCountsLabel("avancado")).toBe("20 templates de dashboard · 10 de landing page");
  });

  it("Base só usa Meta, Google Ads e GA4", () => {
    const base = Object.values(PLATFORMS).filter((p) => canUse("base", p.tier)).map((p) => p.id);
    expect(base.sort()).toEqual(["ga4", "google", "meta"]);
    expect(canUse("pro", PLATFORMS.tiktok.tier)).toBe(true);
  });

  it("páginas: Base essenciais, Pro + Pro, Avançado todas", () => {
    expect(canUse("base", PAGES.criativos.tier)).toBe(false);
    expect(canUse("pro", PAGES.criativos.tier)).toBe(true);
    expect(canUse("pro", PAGES["leads-crm"].tier)).toBe(false);
    expect(canUse("avancado", PAGES["leads-crm"].tier)).toBe(true);
  });

  it("marca própria só no Personalizado", () => {
    expect(TIERS.filter((t) => ENTITLEMENTS[t].whiteLabel)).toEqual(["personalizado"]);
  });

  it("todo template usa só plataformas do próprio plano", () => {
    for (const t of DASHBOARD_TEMPLATES) for (const s of t.sources) expect(canUse(t.tier, PLATFORMS[s].tier)).toBe(true);
  });
});
