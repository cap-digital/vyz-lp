"use client";

// Monta o contexto do VYZ a partir do Store e dos mesmos dados de amostra que
// o painel desenha (datasetFor): mês até hoje vs período anterior de mesmo tamanho.

import { pageLayout, datasetFor } from "@/features/dashboards/data";
import { currentTotals, previousTotals } from "@/features/metrics/compute";
import { ENTITLEMENTS, TIER_LABEL } from "@/features/pricing/entitlements";
import { dashboardTemplate } from "@/features/templates/dashboards";
import type { Account, Dashboard, LandingPage } from "@/features/workspace/types";
import { DEFAULT_WORKSPACE, type Workspace } from "@/features/workspace/workspace";
import { store } from "@/lib/store/store";
import type { AgentContext, ClientData } from "./types";

export function buildContext(now = new Date()): AgentContext {
  const ws: Workspace = { ...DEFAULT_WORKSPACE, ...store.getDoc<Workspace>("workspace") };
  const days = Math.max(1, now.getDate());
  const dashboards: ClientData[] = store.list<Dashboard>("dashboards").flatMap((d) => {
    const t = dashboardTemplate(d.templateId);
    if (!t) return [];
    const ds = datasetFor(d, days);
    const first = d.pages[0] ?? "visao-geral";
    return [{ dashboardId: d.id, dashboardName: d.name, client: d.client, profile: t.profile, cur: currentTotals(ds), prev: previousTotals(ds), kpis: pageLayout(t, first).kpis.map((k) => k.metric) }];
  });
  return {
    now,
    tier: ws.tier,
    tierLabel: TIER_LABEL[ws.tier],
    ent: ENTITLEMENTS[ws.tier],
    dashboards,
    counts: {
      dashboards: store.list<Dashboard>("dashboards").length,
      landingPublished: store.list<LandingPage>("landingPages").filter((p) => p.published).length,
      accounts: store.list<Account>("accounts").length,
      contractedAccounts: ws.contractedAccounts,
    },
  };
}
