"use client";

// Tooltip da marca sobre Radix: 150 ms de espera, chip na cor da sidebar,
// 8 px de raio e seta.

import { Tooltip as T } from "radix-ui";
import type { ReactNode } from "react";
import { usePortalContainer } from "./portal";

export const TooltipProvider = ({ children }: { children: ReactNode }) => (
  <T.Provider delayDuration={150} skipDelayDuration={300}>
    {children}
  </T.Provider>
);

export function Tooltip({ content, children, side = "right", disabled = false }: { content: ReactNode; children: ReactNode; side?: "top" | "right" | "bottom" | "left"; disabled?: boolean }) {
  const container = usePortalContainer();
  if (disabled) return <>{children}</>;
  return (
    <T.Root>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal container={container}>
        <T.Content
          side={side}
          sideOffset={8}
          collisionPadding={8}
          className="pop z-[95] rounded-control bg-[var(--sidebar)] px-2.5 py-1.5 text-[12.5px] font-medium text-[var(--sidebar-fg)] select-none"
        >
          {content}
          <T.Arrow width={10} height={5} className="fill-[var(--sidebar)]" />
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}
