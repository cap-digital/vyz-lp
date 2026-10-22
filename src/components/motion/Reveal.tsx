"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import { useRevealState } from "./CutReveal";

type RevealProps = {
  children: ReactNode;
  as?: "div" | "p" | "li" | "section" | "article" | "span";
  className?: string;
  delay?: number;
  trigger?: "view" | "intro";
  style?: CSSProperties;
};

/** Entrada discreta (sobe e aparece) uma vez, quando entra na tela. */
export function Reveal({ children, as: Tag = "div", className = "", delay = 0, trigger = "view", style }: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const state = useRevealState(trigger, ref);
  return (
    <Tag
      ref={ref as never}
      className={className}
      data-reveal={state}
      style={{ ...style, "--d": `${delay}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}
