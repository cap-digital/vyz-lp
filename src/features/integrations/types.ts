// Formato que o servidor entrega à interface (DTOs). Nunca leva token, hash ou
// metadado cru do provedor.

import type { PlatformId } from "@/features/accounts/platforms";
import type { ProviderId } from "./providers";

export type ConnectionStatus = "active" | "expired" | "revoked" | "error";
export type SyncStatus = "queued" | "running" | "succeeded" | "failed";
export type SyncTrigger = "initial" | "scheduled" | "manual";
export type AdAccountStatus = "active" | "disabled" | "pending" | "closed";

export type ConnectionDTO = {
  id: string;
  provider: ProviderId;
  status: ConnectionStatus;
  /** Quem autorizou no provedor (nome e e-mail do login do Meta/Google). */
  userName: string | null;
  userEmail: string | null;
  isMock: boolean;
  connectedAt: string;
  /** Quem conectou no VYZ. */
  connectedByName: string | null;
  tokenExpiresAt: string | null;
  lastSyncedAt: string | null;
  lastError: string | null;
  accountsCount: number;
};

export type LastSyncDTO = {
  status: SyncStatus;
  trigger: SyncTrigger;
  startedAt: string | null;
  finishedAt: string | null;
  rowsWritten: number;
  error: string | null;
  createdAt: string;
};

export type AdAccountDTO = {
  id: string;
  platformId: PlatformId;
  connectionId: string | null;
  name: string;
  externalId: string;
  businessExternalId: string | null;
  businessName: string | null;
  managerExternalId: string | null;
  managerName: string | null;
  currency: string;
  timezone: string;
  status: AdAccountStatus;
  isEnabled: boolean;
  enabledAt: string | null;
  lastSyncedAt: string | null;
  lastSync: LastSyncDTO | null;
  /** Cadastrada pelo ID (sem conexão; status "pending"). */
  manual: boolean;
  /** Campos do cadastro manual, já normalizados (ex.: { account, measurement }). */
  fields: Record<string, string>;
  /** Dashboards que usam a conta. */
  dashboards: { id: string; name: string }[];
};

export type PlatformConnectState = {
  platformId: PlatformId & ProviderId;
  provider: ProviderId;
  /** Há ao menos uma conexão ativa. */
  connected: boolean;
  connections: ConnectionDTO[];
  /** Contas vistas pelas conexões (as que saíram de uma conexão desfeita também). */
  accounts: AdAccountDTO[];
  enabledCount: number;
};

export type ConnectState = {
  platforms: Record<ProviderId, PlatformConnectState>;
  limit: {
    /** Contas contratadas. */
    accountsQuantity: number;
    /** Contas contratadas em uso (BM do Meta conta uma vez). */
    billableAccounts: number;
  };
  /** Admin: conecta, desconecta e escolhe as contas. */
  canManage: boolean;
  /** Member: pede sincronização. */
  canSync: boolean;
  /** INTEGRATIONS_MODE=mock: login e dados simulados. */
  mock: boolean;
};

export type SyncOutcome = { adAccountId: string; ok: boolean; rowsWritten: number; error?: string };
