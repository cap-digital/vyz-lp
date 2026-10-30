// Contas contratadas: no Meta, cada Business Manager conta uma vez (com todas
// as contas de anúncio dentro); nas outras plataformas, cada conta. Mesma regra
// de private.billable_unit no banco, que é quem garante o limite: aqui é para a
// tela avisar antes.

import type { ProviderId } from "./providers";
import type { ConnectState } from "./types";

export type BillableRef = { platformId: string; externalId: string; businessExternalId: string | null };

export function billableUnit(a: BillableRef): string {
  return a.platformId === "meta" ? `meta:${a.businessExternalId ?? a.externalId}` : `${a.platformId}:${a.externalId}`;
}

/** Quantas contas contratadas um conjunto de contas ativas ocupa. */
export function countUnits(accounts: BillableRef[]): number {
  return new Set(accounts.map(billableUnit)).size;
}

/**
 * Se ligar `candidate` cabe no plano. `enabled` são as contas desta plataforma
 * já ligadas; `otherUnits`, o que as outras plataformas ocupam (não se misturam:
 * a unidade leva o prefixo da plataforma).
 */
export function fitsPlan(candidate: BillableRef, enabled: BillableRef[], otherUnits: number, quantity: number): boolean {
  const units = new Set(enabled.map(billableUnit));
  units.add(billableUnit(candidate));
  return otherUnits + units.size <= quantity;
}

/**
 * Contas contratadas que as outras plataformas ocupam (o `otherUnits` do
 * AccountPicker). Unidades de plataformas diferentes nunca coincidem.
 */
export function otherPlatformUnits(state: Pick<ConnectState, "platforms" | "limit">, provider: ProviderId): number {
  const own = countUnits(state.platforms[provider].accounts.filter((a) => a.isEnabled));
  return Math.max(0, state.limit.billableAccounts - own);
}

/** "2 de 3 contas do plano" (com singular). */
export function planUsageLabel(used: number, quantity: number): string {
  return `${used} de ${quantity} ${quantity === 1 ? "conta" : "contas"} do plano`;
}
