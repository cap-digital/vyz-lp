"use client";

import { LazyMotion, MotionConfig } from "motion/react";
import type { ReactNode } from "react";

const loadFeatures = () => import("./features").then((r) => r.default);

/**
 * Componentes `m.*` leves; as features de animação chegam depois, fora do
 * caminho crítico. Com prefers-reduced-motion, o motion pula transforms e layout.
 */
export function MotionRoot({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
