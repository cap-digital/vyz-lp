// Mascote do VYZ: o V cortado da marca com dois olhos nas pernas de cima.
// Estados em CSS (globals.css, .vyz-mascot): idle pisca de vez em quando,
// ouvindo pulsa, pensando mexe os olhos, falando dá um leve bounce.
// Com prefers-reduced-motion, tudo para (regra global).

import { V_BOTTOM, V_TOP } from "@/components/brand/geometry";

export type MascotState = "idle" | "listening" | "thinking" | "speaking";

export function Mascot({ state = "idle", size = 32, className = "" }: { state?: MascotState; size?: number; className?: string }) {
  return (
    <svg viewBox="-1 -1 12 12" width={size} height={size} aria-hidden className={`vyz-mascot shrink-0 overflow-visible ${className}`} data-state={state}>
      <circle className="vyz-pulse" cx="5" cy="5" r="5.6" fill="none" stroke="var(--accent)" strokeWidth="0.5" />
      <g className="vyz-body">
        <g fill="var(--accent)">
          {[...V_TOP, ...V_BOTTOM].map((p) => (
            <polygon key={p} points={p} />
          ))}
        </g>
        {[1.95, 8.05].map((cx) => (
          <g key={cx} className="vyz-eye" style={{ transformOrigin: `${cx}px 1.75px` }}>
            <circle cx={cx} cy="1.75" r="1.08" fill="var(--on-accent)" />
            <circle className="vyz-pupil" cx={cx} cy="1.8" r="0.5" fill="var(--fg)" />
          </g>
        ))}
      </g>
    </svg>
  );
}
