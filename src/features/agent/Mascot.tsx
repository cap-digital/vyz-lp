"use client";

// Mascote do VYZ: uma esfera brilhante com o rosto feito do próprio logo — os
// dois braços de cima do V são os olhos e a base é a boca. A luz vem do alto
// à esquerda; o rosto desliza na direção do cursor e o brilho especular anda
// ao contrário (sensação de volume). Um componente só: botão flutuante,
// drawer e barra do topo. Estados no CSS (.vyz3d em globals.css); com
// prefers-reduced-motion fica tudo parado.

import { useEffect, useId, useRef, useState } from "react";
import { V_POLYS } from "@/components/brand/geometry";

export type MascotState = "idle" | "listening" | "thinking" | "speaking";

// Rosto em unidades do desenho (esfera de 100). Os olhos são os braços de
// cima do V com menos inclinação (nada de sobrancelha franzida); a boca é a
// base do V bem fina, mais larga em cima e com os cantos para cima.
const EYE_L = "33,37.5 44,37.5 45.4,46.5 34.4,46.5";
const EYE_R = "67,37.5 56,37.5 54.6,46.5 65.6,46.5";
const MOUTH = "M37.5,56 Q50,60.5 62.5,56 L60.6,60 Q50,64.2 39.4,60 Z";
/** Quanto o rosto anda na direção do cursor (unidades do desenho de 100). */
const LOOK = 4;

/** V oficial (10 × 10) com 36 unidades, centralizado na esfera. */
const LOGO = "translate(32 31) scale(3.6)";
const SPIN_MS = 900;
const HOLD_MS = 2600;

/** Lado da superfície virado para a frente (e os giros entre eles). */
type Side = "face" | "logo" | "to-logo" | "to-face";
/** A apresentação (começa no V e vira pro rosto) acontece uma vez por carregamento do painel. */
let introDone = false;

const still = () => typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type MascotProps = {
  state?: MascotState;
  size?: number;
  className?: string;
  /** Gira de vez em quando para mostrar o V do logo (só o botão flutuante). */
  spins?: boolean;
};

export function Mascot({ state = "idle", size = 32, className = "", spins = false }: MascotProps) {
  const id = useId().replace(/:/g, "");
  const root = useRef<HTMLSpanElement>(null);
  // servidor e hidratação iguais: o botão nasce no V (a apresentação); com reduced motion, vira rosto já no 1º efeito
  const [side, setSide] = useState<Side>(() => (spins && !introDone ? "logo" : "face"));
  const [hover, setHover] = useState(false);
  const calm = state === "idle" && !hover;

  // giro: a cada 20–40 s, só parado; mostra o V por ~2,6 s e volta pro rosto
  useEffect(() => {
    if (!spins || !calm) return;
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
    if (still()) {
      introDone = true;
      at(0, () => setSide("face"));
      return () => timers.forEach((t) => window.clearTimeout(t));
    }
    const cycle = () => {
      setSide("to-logo");
      at(SPIN_MS, () => setSide("logo"));
      at(SPIN_MS + HOLD_MS, () => setSide("to-face"));
      at(SPIN_MS * 2 + HOLD_MS, () => {
        setSide("face");
        at(20000 + Math.random() * 20000, cycle);
      });
    };
    if (!introDone) {
      // apresentação: já começa no V e vira pro rosto (só conta como feita no fim,
      // para sobreviver ao efeito montado duas vezes em desenvolvimento)
      at(1400, () => setSide("to-face"));
      at(1400 + SPIN_MS, () => {
        introDone = true;
        setSide("face");
        at(20000 + Math.random() * 20000, cycle);
      });
    } else at(20000 + Math.random() * 20000, cycle);
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [spins, calm]);

  // hover, ouvindo, pensando ou falando: volta direto pro rosto (o ciclo recomeça quando acalmar)
  if (!calm && side !== "face") setSide("face");

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
  return (
    <span
      ref={root}
      aria-hidden
      data-state={state}
      data-side={side}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      className={`vyz3d ${className}`}
      style={{ width: size, height: size }}
    >
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

          {/* superfície: só ela gira (rosto ↔ V do logo); brilho, halo e sombra ficam parados */}
          <g clipPath={`url(#${g("clip")})`}>
            <g className="vyz3d-surf vyz3d-surf-face">
              {/* rosto: o V do logo desmontado e suavizado (olhos = braços de cima, boca = base, em sorriso) */}
              <g className="vyz3d-face">
                <g className="vyz3d-look" fill="#F3F0E2" stroke="#F3F0E2" strokeLinejoin="round" strokeLinecap="round">
                  <g className="vyz3d-eyes" strokeWidth="2.6">
                    <polygon points={EYE_L} />
                    <polygon points={EYE_R} />
                  </g>
                  <path className="vyz3d-mouth" d={MOUTH} strokeWidth="1.8" />
                </g>
              </g>
            </g>
            <g className="vyz3d-surf vyz3d-surf-logo" fill="#F3F0E2">
              {V_POLYS.map((p) => (
                <polygon key={p} points={p} transform={LOGO} />
              ))}
            </g>
          </g>
        </svg>
      </span>
    </span>
  );
}
