"use client";

import { FitChart } from "./FitChart";

/** Linha curta sem eixos, desenhada em px reais (sem esticar o viewBox). */
export function Sparkline({ values, className = "", strokeWidth = 2.5 }: { values: number[]; className?: string; strokeWidth?: number }) {
  return (
    <FitChart className={className} minHeight={24}>
      {({ width: W, height: H }) => {
        const min = Math.min(...values);
        const max = Math.max(...values);
        const p = strokeWidth;
        const d = values
          .map((v, i) => `${i ? "L" : "M"}${(p + (i / (values.length - 1)) * (W - 2 * p)).toFixed(1)},${(p + (1 - (v - min) / (max - min || 1)) * (H - 2 * p)).toFixed(1)}`)
          .join("");
        return (
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block" aria-hidden>
            <path d={d} fill="none" stroke="var(--accent)" strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        );
      }}
    </FitChart>
  );
}
