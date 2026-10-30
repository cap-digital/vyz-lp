// Contrato da API /api/v1 (site ↔ app nativo). Mudou aqui, mudou nos dois.

export type ApiError = { code: string; message: string; fields?: Record<string, string> };

export type MeResponse = {
  user: { id: string; email: string | null; fullName: string; avatarUrl: string | null };
  defaultWorkspaceId: string | null;
  credits: number;
  workspaces: { id: string; name: string; role: "viewer" | "member" | "admin" | "owner"; onboardingDone: boolean; plan: string | null; hasAccess: boolean }[];
};

export type DashboardSummary = { id: string; name: string; clientName: string; templateId: string; period: string; updatedAt: string };
export type DashboardsResponse = { dashboards: DashboardSummary[] };

export type PushTokenInput = { platform: "ios" | "android"; token: string; appVersion?: string };

export type DeleteAccountResponse = { deleted: true };

/** O que o app usa do dashboard live (o site recebe o objeto completo). */
export type ApiKpi = {
  id: string;
  label: string;
  value: number | null;
  delta: number | null;
  format: "money" | "int" | "decimal" | "pct" | "ratio";
  better: "up" | "down" | "neutral";
  note?: string;
};
export type DashboardDataResponse = {
  dashboard: {
    dashboard: { id: string; name: string; clientName: string; templateId: string };
    platform: "meta" | "google";
    status: "ok" | "no_accounts" | "no_data";
    currency: string;
    current: { from: string; to: string; days: number };
    view: { kpis: ApiKpi[] };
  };
};
