"use client";

import { motion, useReducedMotion, useScroll, useSpring } from "motion/react";

/** Barra de progresso no topo, na espessura e na cor do corte. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const reduce = useReducedMotion();
  const smooth = useSpring(scrollYProgress, { stiffness: 200, damping: 30, restDelta: 0.001 });
  return (
    <motion.div
      aria-hidden
      className="fixed inset-x-0 top-0 z-[60] h-[var(--cut)] origin-left bg-accent"
      style={{ scaleX: reduce ? scrollYProgress : smooth }}
    />
  );
}
