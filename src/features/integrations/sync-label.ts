// Texto do status de sincronização e datas relativas ("há 5 min"). O "agora"
// vem de quem chama (o servidor manda o horário da renderização): servidor e
// navegador escrevem o mesmo texto.

import type { AdAccountDTO } from "./types";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** 22/10/2026 no fuso do workspace. */
export function shortDate(iso: string, timeZone = "America/Sao_Paulo"): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone, day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso));
}

/** "agora", "há 5 min", "há 2 h", "há 3 dias" ou "em 22/10/2026". */
export function relativeTime(iso: string, now: string | Date, timeZone?: string): string {
  const diff = new Date(now).getTime() - new Date(iso).getTime();
  if (diff < MINUTE) return "agora";
  if (diff < HOUR) return `há ${Math.floor(diff / MINUTE)} min`;
  if (diff < DAY) return `há ${Math.floor(diff / HOUR)} h`;
  if (diff < 7 * DAY) {
    const days = Math.floor(diff / DAY);
    return `há ${days} ${days === 1 ? "dia" : "dias"}`;
  }
  return `em ${shortDate(iso, timeZone)}`;
}

export type SyncTone = "ok" | "running" | "error" | "idle";
export type SyncSummary = { tone: SyncTone; label: string; detail?: string };

/** Status da última sincronização de uma conta ativa (ou que já teve dados). */
export function syncSummary(
  account: Pick<AdAccountDTO, "isEnabled" | "lastSyncedAt" | "lastSync">,
  now: string | Date,
  timeZone?: string,
): SyncSummary | null {
  const run = account.lastSync;
  if (!account.isEnabled && !account.lastSyncedAt && !run) return null;
  if (run && (run.status === "queued" || run.status === "running")) {
    return { tone: "running", label: run.trigger === "initial" ? "Importando os últimos 90 dias…" : "Sincronizando…" };
  }
  if (run?.status === "failed") {
    return { tone: "error", label: "A última sincronização falhou", detail: run.error ?? undefined };
  }
  if (account.lastSyncedAt) return { tone: "ok", label: `Sincronizada ${relativeTime(account.lastSyncedAt, now, timeZone)}` };
  return { tone: "idle", label: "Aguardando a primeira sincronização" };
}

const STATUS_LABEL: Record<AdAccountDTO["status"], string> = {
  active: "Ativa no provedor",
  disabled: "Sem acesso pelo login ou desativada no provedor",
  pending: "Aguardando conexão",
  closed: "Encerrada no provedor",
};

export const accountStatusLabel = (status: AdAccountDTO["status"]) => STATUS_LABEL[status];
