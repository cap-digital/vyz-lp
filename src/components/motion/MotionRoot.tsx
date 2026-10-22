"use client";

import { LazyMotion, MotionConfig } from "motion/react";
import type { ReactNode } from "react";

const loadFeatures = () => import("./features").then((r) => r.default);

/**
 * Componentes `m.*` leves; as features de animação chegam depois, fora do
 * caminho crítico. As de layout só carregam com <LayoutFeatures>.
 * Com prefers-reduced-motion, o motion pula transforms e layout.
 */
export function MotionRoot({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}

const loadLayoutFeatures = () => import("./features-layout").then((r) => r.default);

/** Liga as animações de layout para um trecho da página (carrega sob demanda). */
export function LayoutFeatures({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadLayoutFeatures} strict>
      {children}
    </LazyMotion>
  );
}
