"use client";

import { useSearchParams } from "next/navigation";
import { startTransition, useEffect, useRef } from "react";
import { fromQuery, toQuery } from "@/features/pricing/pricing";
import { usePlan } from "./PlanProvider";

/**
 * Lê a simulação da query string uma vez e grava as mudanças nela (debounce
 * de 300 ms) com history.replaceState, que o Next integra ao router.
 * Fica dentro de <Suspense>: o resto da página continua pré-renderizado.
 */
export function UrlSync() {
  const params = useSearchParams();
  const { state, update } = usePlan();
  const restored = useRef(false);

  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const fromUrl = fromQuery(params);
    // como transição, o React termina de hidratar as dobras antes de aplicar o
    // estado da URL (senão o HTML pré-renderizado não bate com o novo estado)
    if (fromUrl) startTransition(() => update(fromUrl));
  }, [params, update]);

  const first = useRef(true);
  useEffect(() => {
    // não grava o estado padrão por cima de uma URL ainda não lida
    if (first.current) {
      first.current = false;
      return;
    }
    const t = window.setTimeout(() => {
      const url = `${window.location.pathname}?${toQuery(state)}${window.location.hash}`;
      window.history.replaceState(window.history.state, "", url);
    }, 300);
    return () => window.clearTimeout(t);
  }, [state]);

  return null;
}

/** URL atual da simulação (para WhatsApp e "Copiar link"). */
export function simulationUrl(query: string): string {
  return `${window.location.origin}${window.location.pathname}?${query}`;
}
