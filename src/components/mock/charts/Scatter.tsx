import type { CSSProperties } from "react";
import type { ImobData } from "@/lib/mock-data";

const W = 320;
const H = 160;
const PAD = { l: 14, r: 10, t: 10, b: 18 };

/** Investimento × custo por lead, um ponto por empreendimento. O ruim fica em vermelho terroso. */
export function Scatter({ projects }: { projects: ImobData["projects"] }) {
  const x = (v: number) => PAD.l + v * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - v) * (H - PAD.t - PAD.b);
  const bad = projects.find((p) => p.bad);
  const summary = `Dispersão de ${projects.length} empreendimentos: investimento no eixo horizontal, custo por lead no vertical.${bad ? ` ${bad.name} gasta muito e tem lead caro.` : ""}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary} className="block h-auto w-full overflow-visible">
      <title>{summary}</title>
      <line x1={PAD.l} x2={PAD.l} y1={PAD.t} y2={H - PAD.b} stroke="var(--line)" />
      <line x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} stroke="var(--line)" />
      <text x={PAD.l + 2} y={H - 4} fontSize="8.5" fill="var(--fg-2)">
        investimento →
      </text>
      <text x={4} y={PAD.t + 4} fontSize="8.5" fill="var(--fg-2)" transform={`rotate(-90 4 ${PAD.t + 4})`} textAnchor="end">
        custo por lead →
      </text>

      {bad && (
        <g className="m-late" style={{ "--d": "1500ms" } as CSSProperties}>
          <rect x={x(0.6)} y={PAD.t - 2} width={x(1) - x(0.6) + 6} height={y(0.62) - PAD.t} rx="4" fill="var(--error-soft)" />
          <text x={x(0.6) + 6} y={PAD.t + 10} fontSize="8.5" fill="var(--error-fg)">
            gasta muito · lead caro
          </text>
        </g>
      )}

      {projects.map((p, i) => (
        <g key={p.name} className="m-pt" style={{ "--d": `${560 + i * 110}ms` } as CSSProperties}>
          <circle cx={x(p.invest)} cy={y(p.cpl)} r={p.bad ? 7 : 5.5} fill={p.bad ? "#C9442E" : "var(--accent)"} />
          {p.bad && (
            <text x={x(p.invest) - 10} y={y(p.cpl) + 3} textAnchor="end" fontSize="9" fontWeight="700" fill="var(--fg)">
              {p.name}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
