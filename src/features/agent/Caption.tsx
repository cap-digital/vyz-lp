"use client";

import { useAgent } from "./AgentProvider";

/** Legenda flutuante enquanto o VYZ fala (só nos planos com voz). O texto já está no log do drawer. */
export function Caption() {
  const { caption } = useAgent();
  if (!caption) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-4 bottom-24 z-[130] flex justify-center sm:bottom-8 sm:left-4 sm:right-[452px]">
      <p className="max-w-xl rounded-card bg-[var(--sidebar)] px-4 py-2.5 text-center text-[14px] leading-snug text-[var(--sidebar-fg)]">
        <span className="font-semibold">VYZ:</span> {caption}
      </p>
    </div>
  );
}
