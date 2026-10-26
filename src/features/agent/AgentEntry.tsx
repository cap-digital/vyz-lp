"use client";

// Pontos de entrada do painel: barra "Pergunte ao VYZ… ⌘K" no topo e o mascote flutuante.

import { m } from "motion/react";
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

const desktopQuery = (cb: () => void) => {
  const mq = window.matchMedia("(min-width: 768px)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const useDesktop = () => useSyncExternalStore(desktopQuery, () => window.matchMedia("(min-width: 768px)").matches, () => true);

/**
 * Mascote flutuante no canto inferior direito (só no painel). Ao abrir o
 * drawer, ele "voa" até o cabeçalho (mesmo layoutId) e volta ao fechar.
 */
export function AgentFab() {
  const { open, setOpen, mascot } = useAgent();
  const desktop = useDesktop();
  if (open) return null;
  const size = desktop ? 64 : 56;
  return (
    <div className="fixed right-[max(1rem,env(safe-area-inset-right))] bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 md:right-7 md:bottom-7 print:hidden">
      <Tooltip content="Olá, eu sou o VYZ" side="left">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir o assistente VYZ"
          className="group relative inline-flex items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--panel)]"
          style={{ width: size, height: size }}
        >
          <m.span layoutId="vyz-mascot" transition={{ type: "spring", stiffness: 260, damping: 28 }} className="block">
            <Mascot state={mascot} size={size} spins />
          </m.span>
        </button>
      </Tooltip>
    </div>
  );
}
