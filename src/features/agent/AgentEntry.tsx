"use client";

// Pontos de entrada no topo do painel: barra "Pergunte ao VYZ… ⌘K" e o botão do mascote.

import { useSyncExternalStore } from "react";
import { Tooltip } from "@/components/ui/Tooltip";
import { useAgent } from "./AgentProvider";
import { Mascot } from "./Mascot";

const noop = () => () => {};
const isMac = () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const useShortcut = () => (useSyncExternalStore(noop, isMac, () => true) ? "⌘K" : "Ctrl K");

export function AgentBar() {
  const { setOpen } = useAgent();
  const key = useShortcut();
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-keyshortcuts="Meta+K Control+K"
      className="inline-flex h-9 w-56 items-center gap-2 rounded-control border border-line bg-field pr-2 pl-2.5 text-left text-[13px] text-fg-2 outline-none transition-colors hover:border-fg-2/60 focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent"
    >
      <Mascot size={18} />
      <span className="flex-1 truncate">Pergunte ao VYZ…</span>
      <kbd className="rounded-[5px] border border-line px-1.5 py-0.5 font-sans text-[11px] text-fg-2">{key}</kbd>
    </button>
  );
}

export function AgentButton() {
  const { setOpen, mascot } = useAgent();
  return (
    <Tooltip content="Falar com o VYZ" side="bottom">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir o assistente VYZ"
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-control border border-line outline-none transition-colors hover:border-accent focus-visible:ring-2 focus-visible:ring-accent"
      >
        <Mascot state={mascot} size={20} />
      </button>
    </Tooltip>
  );
}
