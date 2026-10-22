"use client";

import { useCallback } from "react";
import { ENTITLEMENTS, type Tier } from "@/features/pricing/entitlements";
import { useDoc } from "@/lib/store/hooks";
import { store } from "@/lib/store/store";

export type Brand = { logo?: string; color: string; hideVyz: boolean };

export type Workspace = {
  name: string;
  userName: string;
  /** Plano simulado (o real virá da conta, com o Supabase). */
  tier: Tier;
  /** Contas contratadas (entram no limite). */
  contractedAccounts: number;
  /** Marca própria (só no Personalizado). */
  brand: Brand;
};

export const DEFAULT_WORKSPACE: Workspace = {
  name: "Minha agência",
  userName: "",
  tier: "pro",
  contractedAccounts: 2,
  brand: { color: "#4B5320", hideVyz: false },
};

export function useWorkspace() {
  const saved = useDoc<Workspace>("workspace");
  const ws: Workspace = { ...DEFAULT_WORKSPACE, ...saved, brand: { ...DEFAULT_WORKSPACE.brand, ...saved?.brand } };
  const update = useCallback((patch: Partial<Workspace>) => {
    const cur = store.getDoc<Workspace>("workspace") ?? DEFAULT_WORKSPACE;
    store.setDoc("workspace", { ...DEFAULT_WORKSPACE, ...cur, ...patch });
  }, []);
  return { ws, update, ent: ENTITLEMENTS[ws.tier] };
}
