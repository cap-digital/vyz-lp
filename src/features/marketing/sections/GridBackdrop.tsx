"use client";

import { m, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { useEffect } from "react";
import { useFinePointer } from "@/lib/hooks";

/**
 * Malha de construção do logo (10 unidades) em linhas de 1 px muito sutis,
 * com parallax leve seguindo o mouse.
 */
export function GridBackdrop() {
  const fine = useFinePointer();
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 50, damping: 20 });
  const sy = useSpring(y, { stiffness: 50, damping: 20 });

  useEffect(() => {
    if (!fine || reduce) return;
    const onMove = (e: PointerEvent) => {
      x.set((e.clientX / window.innerWidth - 0.5) * -18);
      y.set((e.clientY / window.innerHeight - 0.5) * -12);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [fine, reduce, x, y]);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden [mask-image:radial-gradient(ellipse_80%_70%_at_50%_40%,#000_40%,transparent_100%)]">
      <m.svg className="absolute -inset-8 h-[calc(100%+4rem)] w-[calc(100%+4rem)]" style={{ x: sx, y: sy }}>
        <defs>
          <pattern id="malha" width="240" height="240" patternUnits="userSpaceOnUse">
            {Array.from({ length: 10 }, (_, i) => (
              <line key={i} x1="0" x2="240" y1={i * 24 + 0.5} y2={i * 24 + 0.5} stroke="var(--line)" strokeWidth="1" opacity={i === 0 ? 0.9 : 0.35} />
            ))}
            <line x1="0.5" x2="0.5" y1="0" y2="240" stroke="var(--line)" strokeWidth="1" opacity="0.9" />
            <line x1="120.5" x2="120.5" y1="0" y2="240" stroke="var(--line)" strokeWidth="1" opacity="0.35" />
            {/* a faixa do corte: entre 4,2 e 5,3 da malha */}
            <rect x="0" y={4.2 * 24} width="240" height={1.1 * 24} fill="var(--accent)" opacity="0.035" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#malha)" />
      </m.svg>
    </div>
  );
}
