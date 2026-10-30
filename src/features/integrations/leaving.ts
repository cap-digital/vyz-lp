"use client";

// Links que saem do app para o login (início da conexão, Permitir e Cancelar
// da tela simulada). O primeiro clique trava os outros: o state do OAuth vale
// uma vez, e um segundo clique voltaria com erro mesmo com a conexão feita.
// Clique com Ctrl/⌘/Shift abre outra aba e não trava; voltar pelo navegador destrava.

import { useEffect, useState, type MouseEvent } from "react";

export function useLeaving<T extends string = string>() {
  const [leaving, setLeaving] = useState<T | null>(null);

  // Página restaurada do cache do navegador (botão Voltar).
  useEffect(() => {
    const reset = () => setLeaving(null);
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  const leave = (key: T) => (e: MouseEvent<HTMLAnchorElement>) => {
    if (leaving) e.preventDefault();
    else if (e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) setLeaving(key);
  };

  return { leaving, leave };
}
