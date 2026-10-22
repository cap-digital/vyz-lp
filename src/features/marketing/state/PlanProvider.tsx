"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_STATE, quote, type PlanState, type Quote } from "@/features/pricing/pricing";

type PlanContextValue = {
  state: PlanState;
  quote: Quote;
  update: (patch: Partial<PlanState> | ((s: PlanState) => Partial<PlanState>)) => void;
};

const PlanContext = createContext<PlanContextValue | null>(null);

/** Estado único da simulação, compartilhado pelas dobras 1, 3 e 4. */
export function PlanProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PlanState>(DEFAULT_STATE);

  const update = useCallback<PlanContextValue["update"]>(
    (patch) => setState((s) => ({ ...s, ...(typeof patch === "function" ? patch(s) : patch) })),
    [],
  );
  const value = useMemo<PlanContextValue>(() => ({ state, quote: quote(state), update }), [state, update]);

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan(): PlanContextValue {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error("usePlan precisa de <PlanProvider>");
  return ctx;
}
