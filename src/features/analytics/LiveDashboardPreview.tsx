"use client";

// Prévia dos dashboards com dados reais, com dados do gerador simulado passando
// pela mesma agregação (galeria de templates e onboarding). Nada vem do banco.

import { useMemo, type ReactNode } from "react";
import type { PageId } from "@/features/templates/types";
import type { PeriodId } from "@/features/workspace/types";
import { LiveDashboardView } from "./LiveDashboardView";
import { sampleDashboardData } from "./preview";

export type LiveDashboardPreviewProps = {
  /** "meta-ecommerce" | "google-ecommerce". Outro id não renderiza nada. */
  templateId: string;
  /** Páginas mostradas, na ordem (padrão: todas do template). */
  pageIds?: readonly PageId[];
  initialPage?: PageId;
  /** Período da amostra (padrão: últimos 30 dias). */
  period?: PeriodId;
  /** Margem (0–1) para o ROAS de equilíbrio da amostra (padrão: 40%). */
  margin?: number | null;
  /** Nome e cliente mostrados no topo (ex.: o que a pessoa digitou no onboarding). */
  name?: string;
  clientName?: string;
  actions?: ReactNode;
};

export function LiveDashboardPreview({ templateId, pageIds, initialPage, period = "30d", margin, name, clientName, actions }: LiveDashboardPreviewProps) {
  const breakEvenRoas = margin === undefined ? undefined : margin && margin > 0 ? 1 / margin : null;
  const data = useMemo(() => sampleDashboardData(templateId, { period, breakEvenRoas }), [templateId, period, breakEvenRoas]);
  if (!data) return null;
  const shown = { ...data, dashboard: { ...data.dashboard, name: name?.trim() || data.dashboard.name, clientName: clientName?.trim() ?? data.dashboard.clientName } };
  return <LiveDashboardView data={shown} pageIds={pageIds} initialPage={initialPage} actions={actions} />;
}
