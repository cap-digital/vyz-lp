"use client";

import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import type { ReactNode } from "react";

type MagneticProps = {
  children: ReactNode;
  strength?: number;
  className?: string;
};

/** Acompanha levemente o cursor. Só com mouse e sem movimento reduzido. */
export function Magnetic({ children, strength = 0.28, className = "" }: MagneticProps) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 260, damping: 18, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 260, damping: 18, mass: 0.6 });

  return (
    <motion.span
      className={`inline-flex ${className}`}
      style={{ x: sx, y: sy }}
      onPointerMove={(e) => {
        if (reduce || e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * strength);
        y.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.span>
  );
}
