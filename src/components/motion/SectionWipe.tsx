"use client";

import { useInView } from "motion/react";
import { useRef } from "react";

/** Faixa do corte que varre a tela de lado a lado quando a dobra entra. */
export function SectionWipe({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -20% 0px" });
  return <div ref={ref} aria-hidden className={`wipe ${className}`} data-state={inView ? "play" : "idle"} />;
}
