"use client";

// Mascote do VYZ: o V cortado da marca com volume (luz do alto à esquerda,
// chanfro, brilho especular, sombra interna), dois olhos que seguem o cursor
// de leve, halo na cor da marca e sombra projetada separada. Um componente só:
// botão flutuante, drawer e barra do topo. Estados e animações no CSS
// (.vyz3d em globals.css); com prefers-reduced-motion fica tudo parado.

import { useEffect, useId, useRef } from "react";
import { V_BOTTOM, V_TOP } from "@/components/brand/geometry";

export type MascotState = "idle" | "listening" | "thinking" | "speaking";

const POLYS = [...V_TOP, ...V_BOTTOM];
const EYES = [1.95, 8.05];
/** Quanto a pupila anda, em unidades do desenho (o V tem 10). */
const LOOK = 0.32;

const still = () => typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function Mascot({ state = "idle", size = 32, className = "" }: { state?: MascotState; size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  const root = useRef<HTMLSpanElement>(null);

  // pupilas seguem o cursor (CSS vars, sem re-render) e o hover inclina em 3D
  useEffect(() => {
    const el = root.current;
    if (!el || still()) return;
    let raf = 0;
    let last: PointerEvent | null = null;
    const apply = () => {
      raf = 0;
      if (!last) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = last.clientX - cx;
      const dy = last.clientY - cy;
      const d = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, d / 240);
      el.style.setProperty("--look-x", `${((dx / d) * LOOK * k).toFixed(3)}px`);
      el.style.setProperty("--look-y", `${((dy / d) * LOOK * k).toFixed(3)}px`);
      if (el.matches(":hover")) {
        el.style.setProperty("--tilt-x", `${(-dy / r.height) * 18}deg`);
        el.style.setProperty("--tilt-y", `${(dx / r.width) * 18}deg`);
      }
    };
    const onMove = (e: PointerEvent) => {
      last = e;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const onLeave = () => {
      el.style.setProperty("--tilt-x", "0deg");
      el.style.setProperty("--tilt-y", "0deg");
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  const g = (n: string) => `${n}-${id}`;
  return (
    <span ref={root} aria-hidden data-state={state} className={`vyz3d ${className}`} style={{ width: size, height: size }}>
      <span className="vyz3d-halo" />
      <span className="vyz3d-shadow" />
      <span className="vyz3d-float">
        <span className="vyz3d-tilt">
          <svg viewBox="-1.2 -1.2 12.4 12.4" width={size} height={size} className="block overflow-visible">
            <defs>
              {/* face: luz do alto à esquerda */}
              <linearGradient id={g("face")} x1="0" y1="0" x2="0.85" y2="1">
                <stop offset="0" stopColor="#C3D08F" />
                <stop offset="0.38" stopColor="#8A9A5B" />
                <stop offset="1" stopColor="#4B5320" />
              </linearGradient>
              {/* lateral do chanfro, mais escura */}
              <linearGradient id={g("side")} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#3A4219" />
                <stop offset="1" stopColor="#1F2612" />
              </linearGradient>
              {/* brilho especular no topo */}
              <radialGradient id={g("spec")} cx="0.28" cy="0.08" r="0.55">
                <stop offset="0" stopColor="#fff" stopOpacity="0.85" />
                <stop offset="0.45" stopColor="#fff" stopOpacity="0.18" />
                <stop offset="1" stopColor="#fff" stopOpacity="0" />
              </radialGradient>
              {/* sombra interna embaixo */}
              <linearGradient id={g("inner")} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0.55" stopColor="#1F2612" stopOpacity="0" />
                <stop offset="1" stopColor="#1F2612" stopOpacity="0.45" />
              </linearGradient>
              <clipPath id={g("clip")}>
                {POLYS.map((p) => (
                  <polygon key={p} points={p} />
                ))}
              </clipPath>
            </defs>

            <g className="vyz3d-body">
              {/* lateral (o chanfro aparece embaixo e à direita) */}
              <g fill={`url(#${g("side")})`} transform="translate(0.32 0.42)">
                {POLYS.map((p) => (
                  <polygon key={p} points={p} />
                ))}
              </g>
              {/* face */}
              <g fill={`url(#${g("face")})`} stroke="#D7DCC3" strokeOpacity="0.55" strokeWidth="0.12" strokeLinejoin="round">
                {POLYS.map((p) => (
                  <polygon key={p} points={p} />
                ))}
              </g>
              <g clipPath={`url(#${g("clip")})`}>
                <rect x="-1" y="-1" width="12" height="12" fill={`url(#${g("inner")})`} />
                <ellipse cx="2.6" cy="0.6" rx="4.4" ry="2.6" fill={`url(#${g("spec")})`} />
              </g>

              {EYES.map((cx) => (
                <g key={cx} className="vyz3d-eye" style={{ transformOrigin: `${cx}px 1.85px` }}>
                  <ellipse cx={cx} cy="1.85" rx="1.02" ry="1.22" fill="#FBFCF8" stroke="#1F2612" strokeOpacity="0.25" strokeWidth="0.08" />
                  <g className="vyz3d-pupil">
                    <ellipse cx={cx} cy="1.95" rx="0.5" ry="0.58" fill="#1E1E1E" />
                    <circle cx={cx - 0.17} cy="1.73" r="0.16" fill="#fff" />
                  </g>
                </g>
              ))}
            </g>
          </svg>
        </span>
      </span>
    </span>
  );
}
