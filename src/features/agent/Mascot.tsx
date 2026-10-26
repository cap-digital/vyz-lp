"use client";

// Mascote do VYZ: uma esfera brilhante com o rosto feito do próprio logo — os
// dois braços de cima do V são os olhos e a base é a boca. A luz vem do alto
// à esquerda; o rosto desliza na direção do cursor e o brilho especular anda
// ao contrário (sensação de volume). Um componente só: botão flutuante,
// drawer e barra do topo. Estados no CSS (.vyz3d em globals.css); com
// prefers-reduced-motion fica tudo parado.

import { useEffect, useId, useRef } from "react";
import { V_BOTTOM, V_TOP } from "@/components/brand/geometry";

export type MascotState = "idle" | "listening" | "thinking" | "speaking";

/** O V do logo (10 × 10) vira um rosto de 40 unidades, um pouco abaixo do centro da esfera. */
const FACE = { scale: 4, x: 30, y: 33 };
/** Quanto o rosto anda na direção do cursor (unidades do desenho de 100). */
const LOOK = 4;

const still = () => typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function Mascot({ state = "idle", size = 32, className = "" }: { state?: MascotState; size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  const root = useRef<HTMLSpanElement>(null);

  // o rosto segue o cursor e o brilho vai ao contrário (CSS vars, sem re-render)
  useEffect(() => {
    const el = root.current;
    if (!el || still()) return;
    let raf = 0;
    let last: PointerEvent | null = null;
    const apply = () => {
      raf = 0;
      if (!last) return;
      const r = el.getBoundingClientRect();
      const dx = last.clientX - (r.left + r.width / 2);
      const dy = last.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, d / 260);
      const x = (dx / d) * LOOK * k;
      const y = (dy / d) * LOOK * k;
      el.style.setProperty("--face-x", `${x.toFixed(2)}px`);
      el.style.setProperty("--face-y", `${y.toFixed(2)}px`);
      el.style.setProperty("--spec-x", `${(-x * 0.6).toFixed(2)}px`);
      el.style.setProperty("--spec-y", `${(-y * 0.6).toFixed(2)}px`);
    };
    const onMove = (e: PointerEvent) => {
      last = e;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  const g = (n: string) => `${n}-${id}`;
  const face = `translate(${FACE.x} ${FACE.y}) scale(${FACE.scale})`;
  return (
    <span ref={root} aria-hidden data-state={state} className={`vyz3d ${className}`} style={{ width: size, height: size }}>
      <span className="vyz3d-halo" />
      <span className="vyz3d-shadow" />
      <span className="vyz3d-float">
        <svg viewBox="0 0 100 100" width={size} height={size} className="block overflow-visible">
          <defs>
            {/* corpo: luz do alto à esquerda, oliva claro → oliva escuro */}
            <radialGradient id={g("body")} cx="0.34" cy="0.28" r="0.78">
              <stop offset="0" stopColor="#B9C48F" />
              <stop offset="0.38" stopColor="#8A9A5B" />
              <stop offset="0.78" stopColor="#4B5320" />
              <stop offset="1" stopColor="#2F3621" />
            </radialGradient>
            {/* sombra interna na base */}
            <radialGradient id={g("inner")} cx="0.55" cy="1.05" r="0.6">
              <stop offset="0" stopColor="#1F2612" stopOpacity="0.55" />
              <stop offset="1" stopColor="#1F2612" stopOpacity="0" />
            </radialGradient>
            {/* luz de borda fina embaixo */}
            <linearGradient id={g("rim")} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0.62" stopColor="#D7DCC3" stopOpacity="0" />
              <stop offset="1" stopColor="#D7DCC3" stopOpacity="0.75" />
            </linearGradient>
            <filter id={g("blur")} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.4" />
            </filter>
            <clipPath id={g("clip")}>
              <circle cx="50" cy="50" r="44" />
            </clipPath>
          </defs>

          <circle cx="50" cy="50" r="44" fill={`url(#${g("body")})`} />
          <g clipPath={`url(#${g("clip")})`}>
            <rect x="0" y="0" width="100" height="100" fill={`url(#${g("inner")})`} />
            {/* brilho especular: anda ao contrário do rosto */}
            <g className="vyz3d-spec">
              <ellipse cx="34" cy="24" rx="17" ry="10" transform="rotate(-28 34 24)" fill="#fff" opacity="0.55" filter={`url(#${g("blur")})`} />
              <ellipse cx="30" cy="21" rx="5" ry="3" transform="rotate(-28 30 21)" fill="#fff" opacity="0.7" />
            </g>
          </g>
          <circle cx="50" cy="50" r="43.2" fill="none" stroke={`url(#${g("rim")})`} strokeWidth="1.6" />

          {/* rosto: o logo V desmontado */}
          <g className="vyz3d-face">
            <g className="vyz3d-look" fill="#F3F0E2">
              <g className="vyz3d-eyes">
                {V_TOP.map((p) => (
                  <polygon key={p} points={p} transform={face} />
                ))}
              </g>
              <g className="vyz3d-mouth">
                {V_BOTTOM.map((p) => (
                  <polygon key={p} points={p} transform={face} />
                ))}
              </g>
            </g>
          </g>
        </svg>
      </span>
    </span>
  );
}
