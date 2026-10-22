import type { CSSProperties } from "react";
import { brl } from "@/lib/format";

type CpvChartProps = {
  daily: number[];
  avg: number[];
  goal: number;
  maturingDays: number;
  /** Marca a linha da meta como alvo da intro (só no mock do hero). */
  introTarget?: boolean;
};

const W = 320;
const H = 150;
const PAD = { l: 4, r: 8, t: 18, b: 16 };

/**
 * Custo por venda diário (contexto, neutro), média móvel de 7 dias (a série
 * que importa, em verde) e meta tracejada em cinza. Últimos dias marcados como
 * "em maturação".
 */
export function CpvChart({ daily, avg, goal, maturingDays, introTarget }: CpvChartProps) {
  const all = [...daily, goal];
  const min = Math.min(...all) * 0.9;
  const max = Math.max(...all) * 1.06;
  const x = (i: number) => PAD.l + (i / (daily.length - 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - min) / (max - min)) * (H - PAD.t - PAD.b);
  const path = (vals: number[]) => vals.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");

  const matX = x(daily.length - maturingDays) - 4;
  const last = avg.length - 1;
  const first = avg[0];
  const end = avg[last];
  const summary = `Custo por venda diário dos últimos ${daily.length} dias, com média móvel de 7 dias indo de ${brl(first)} para ${brl(end)}. Meta de ${brl(goal)}. Os últimos ${maturingDays} dias estão em maturação.`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary} className="block h-auto w-full overflow-visible">
      <title>{summary}</title>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={PAD.l} x2={W - PAD.r} y1={PAD.t + f * (H - PAD.t - PAD.b)} y2={PAD.t + f * (H - PAD.t - PAD.b)} stroke="var(--line)" strokeWidth="1" />
      ))}

      {/* dias em maturação */}
      <g className="m-late" style={{ "--d": "1500ms" } as CSSProperties}>
        <rect x={matX} y={PAD.t - 6} width={W - PAD.r - matX + 4} height={H - PAD.t - PAD.b + 6} fill="var(--accent-soft)" opacity="0.55" rx="3" />
        <text x={W - PAD.r} y={PAD.t - 9} textAnchor="end" fontSize="8.5" fill="var(--fg-2)">
          em maturação
        </text>
      </g>

      {/* meta */}
      <line
        data-intro-target={introTarget ? "" : undefined}
        x1={PAD.l}
        x2={W - PAD.r}
        y1={y(goal)}
        y2={y(goal)}
        stroke="var(--fg-2)"
        strokeWidth="1"
        strokeDasharray="4 4"
        opacity="0.8"
      />
      <text x={PAD.l + 2} y={y(goal) - 5} fontSize="9" fill="var(--fg-2)">
        meta {brl(goal, { decimals: false })}
      </text>

      {/* custo do dia (contexto) */}
      <path
        d={path(daily)}
        pathLength={1}
        className="m-draw"
        style={{ "--d": "420ms" } as CSSProperties}
        fill="none"
        stroke="var(--muted)"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {/* média móvel (a série que importa) */}
      <g className="m-late" style={{ "--d": "1250ms" } as CSSProperties}>
        <path d={path(avg)} fill="none" stroke="var(--accent)" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(last)} cy={y(end)} r="3.6" fill="var(--accent)" />
      </g>
    </svg>
  );
}
