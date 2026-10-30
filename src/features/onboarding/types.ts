// Estado do onboarding que o servidor entrega à tela (src/server/onboarding/queries.ts monta).

import type { ProviderId } from "@/features/integrations/providers";
import type { ConnectState } from "@/features/integrations/types";
import type { Tier } from "@/features/pricing/entitlements";
import type { ActiveStep } from "./steps";

export type OnboardingState = {
  step: ActiveStep;
  workspaceName: string;
  businessTypeId: string | null;
  /** Meta/Google marcadas no passo 2 (as outras plataformas ficam como estão). */
  platforms: ProviderId[];
  tier: Tier | null;
  /** Até que plano as páginas do dashboard estão liberadas. */
  pagesTier: Tier | null;
  /** Dashboards que ainda cabem no plano. */
  dashboardsLeft: number;
  canManage: boolean;
  /** Só nos passos de conexão e dashboard. */
  connect: ConnectState | null;
};
