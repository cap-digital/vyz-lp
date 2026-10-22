"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/** Com prefers-reduced-motion, o motion pula transforms e layout (fica só opacidade). */
export function MotionRoot({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
