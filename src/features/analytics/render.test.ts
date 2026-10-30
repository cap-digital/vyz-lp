import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { redactSpend } from "./aggregate";
import { LiveDashboardPreview } from "./LiveDashboardPreview";
import { LIVE_PAGES, livePages, LiveDashboardView } from "./LiveDashboardView";
import { sampleDashboardData } from "./preview";
import type { LiveDashboardData } from "./types";

const TODAY = "2026-10-30";

function render(data: LiveDashboardData, page: string) {
  return renderToString(createElement(LiveDashboardView, { data, initialPage: page as never }));
}

describe("renderização (smoke)", () => {
  for (const templateId of ["meta-ecommerce", "google-ecommerce"]) {
    const data = sampleDashboardData(templateId, { today: TODAY })!;
    for (const page of livePages(data.platform)) {
      it(`${templateId} · ${page}`, () => {
        const html = render(data, page);
        expect(html).toContain(data.dashboard.name);
        expect(html).toContain('role="tabpanel"');
        expect(html.length).toBeGreaterThan(2000);
      });
    }
  }

  it("só mostra as abas pedidas que a plataforma tem", () => {
    expect(livePages("google", ["termos", "criativos", "visao-geral"])).toEqual(["termos", "visao-geral"]);
    expect(livePages("meta", [])).toEqual(Object.keys(LIVE_PAGES.meta));
  });

  it("investimento oculto não aparece no HTML", () => {
    const data = sampleDashboardData("meta-ecommerce", { today: TODAY })!;
    const spend = data.view.campaigns[0].spend!;
    const hidden = { ...data, hideSpend: true, view: redactSpend(data.view) };
    const html = render(hidden, "campanhas");
    expect(html).toContain("•••");
    expect(html).not.toContain(`R$ ${Math.trunc(spend).toLocaleString("pt-BR")}`);
  });

  it("estados vazios", () => {
    const data = sampleDashboardData("google-ecommerce", { today: TODAY })!;
    expect(render({ ...data, status: "no_accounts" }, "visao-geral")).toContain("Nenhuma conta ativa");
    expect(render({ ...data, status: "no_data" }, "visao-geral")).toContain("Os dados ainda estão chegando");
  });

  it("prévia do template", () => {
    const html = renderToString(createElement(LiveDashboardPreview, { templateId: "google-ecommerce", name: "Minha loja" }));
    expect(html).toContain("Minha loja");
    expect(html).toContain("Amostra");
    expect(renderToString(createElement(LiveDashboardPreview, { templateId: "nada" }))).toBe("");
  });
});
