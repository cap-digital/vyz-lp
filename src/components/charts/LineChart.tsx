import type { CSSProperties } from "react";

type LineChartProps = {
  /** Série diária (contexto, em neutro). */
  values: number[];
  /** Média móvel (a série que importa, em verde). */
  avg?: number[];
  /** Período anterior (referência, tracejado claro). */
  previous?: number[];
  /** Meta (linha tracejada cinza). */
  goal?: number;
  /** Quantos dias do fim estão em maturação. */
  maturingDays?: number;
  /** Texto curto da meta, já formatado ("R$ 60"). */
  goalLabel?: string;
  /** Resumo para leitores de tela. */
  summary: string;
  /** Marca a linha da meta (alvo da intro da LP). */
  markGoal?: boolean;
  height?: number;
};

const W = 320;
const PAD = { l: 4, r: 50, t: 8, b: 6 };

/**
 * Linha diária com média móvel, meta e dias em maturação. Os rótulos ficam
 * fora do traçado: legenda em cima e etiqueta da meta na margem direita.
 */
export function LineChart({ values, avg, previous, goal, maturingDays = 0, goalLabel, summary, markGoal, height = 132 }: LineChartProps) {
  const H = height;
  const finite = (v: number[]) => v.filter(Number.isFinite);
  // a escala ignora os dias em maturação (o custo do dia dispara enquanto as
  // conversões não chegam); o pico fica preso no topo da área
  const settled = maturingDays ? values.slice(0, -maturingDays) : values;
  const all = [...finite(settled), ...finite(avg ?? []), ...finite(previous ?? []), ...(goal ? [goal] : [])];
  const min = Math.min(...all) * 0.9;
  const max = Math.max(...all) * 1.08 || 1;
  const n = Math.max(2, values.length);
  const x = (i: number) => PAD.l + (i / (n - 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (Math.min(max, Math.max(min, v)) - min) / (max - min || 1)) * (H - PAD.t - PAD.b);
  const path = (vals: number[]) =>
    vals
      .map((v, i) => (Number.isFinite(v) ? `${i && Number.isFinite(vals[i - 1]) ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}` : ""))
      .join("");

  const matX = maturingDays ? x(n - maturingDays) - 3 : 0;
  const lastAvg = avg ? [...avg].reverse().findIndex(Number.isFinite) : -1;
  const lastIdx = lastAvg >= 0 && avg ? avg.length - 1 - lastAvg : -1;
  const tagW = goalLabel ? Math.max(30, goalLabel.length * 4.9 + 10) : 0;
  const plotRight = W - PAD.r;

  return (
    <figure className="m-0">
      <figcaption className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] leading-none text-fg-2" aria-hidden>
        {avg && (
          <span className="inline-flex items-center gap-1">
            <span className="h-[2.5px] w-3 rounded-full bg-accent" /> média 7 dias
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <span className="h-px w-3 bg-muted" /> dia a dia
        </span>
        {goal !== undefined && (
          <span className="inline-flex items-center gap-1">
            <span className="w-3 border-t border-dashed border-fg-2" /> meta
          </span>
        )}
        {previous && (
          <span className="inline-flex items-center gap-1">
            <span className="w-3 border-t border-dotted border-muted" /> período anterior
          </span>
        )}
        {maturingDays > 0 && (
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-[2px] bg-accent-soft" /> em maturação
          </span>
        )}
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary} className="block h-auto w-full overflow-visible">
        <title>{summary}</title>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={PAD.l} x2={plotRight} y1={PAD.t + f * (H - PAD.t - PAD.b)} y2={PAD.t + f * (H - PAD.t - PAD.b)} stroke="var(--line)" strokeWidth="1" />
        ))}

        {maturingDays > 0 && (
          <rect className="m-late" style={{ "--d": "1500ms" } as CSSProperties} x={matX} y={PAD.t} width={plotRight - matX + 2} height={H - PAD.t - PAD.b} fill="var(--accent-soft)" opacity="0.6" rx="3" />
        )}

        {previous && <path d={path(previous)} fill="none" stroke="var(--muted)" strokeWidth="1" strokeDasharray="2 3" opacity="0.8" />}

        {goal !== undefined && (
          <g>
            <line data-intro-target={markGoal ? "" : undefined} x1={PAD.l} x2={plotRight} y1={y(goal)} y2={y(goal)} stroke="var(--fg-2)" strokeWidth="1" strokeDasharray="4 4" opacity="0.85" />
            {goalLabel && (
              <g transform={`translate(${plotRight + 4} ${y(goal) - 7})`}>
                <rect width={tagW} height="14" rx="3" fill="var(--bg)" stroke="var(--line)" />
                <text x={tagW / 2} y="10" textAnchor="middle" fontSize="8.5" fill="var(--fg-2)" className="tnum">
                  {goalLabel}
                </text>
              </g>
            )}
          </g>
        )}

        <path
          d={path(values)}
          pathLength={1}
          className="m-draw"
          style={{ "--d": "420ms" } as CSSProperties}
          fill="none"
          stroke="var(--muted)"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        {avg && (
          <g className="m-late" style={{ "--d": "1250ms" } as CSSProperties}>
            <path d={path(avg)} fill="none" stroke="var(--accent)" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
            {lastIdx >= 0 && <circle cx={x(lastIdx)} cy={y(avg[lastIdx])} r="3.4" fill="var(--accent)" />}
          </g>
        )}
      </svg>
    </figure>
  );
}
