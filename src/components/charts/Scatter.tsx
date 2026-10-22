"use client";

import type { CSSProperties } from "react";
import { FitChart } from "./FitChart";
import { aroundPoint, cornersOf, placeLabel, textWidth, type Rect } from "./labels";

type Point = { name: string; invest: number; cpl: number; bad?: boolean };

const QUADRANT_TEXT = "gasta muito · lead caro";

/**
 * Posições do gráfico (pura, testada): pontos, área do quadrante "ruim" e os
 * dois rótulos já sem colisão.
 */
export function scatterLayout(points: Point[], W: number, H: number, fontSize: number) {
  const pad = { l: fontSize + 8, r: 10, t: 10, b: fontSize + 10 };
  const plot: Rect = { x: pad.l, y: pad.t, w: W - pad.l - pad.r, h: H - pad.t - pad.b };
  const r = Math.max(5, fontSize * 0.5);
  const dots = points.map((p) => ({ ...p, cx: plot.x + p.invest * plot.w, cy: plot.y + (1 - p.cpl) * plot.h, r: p.bad ? r + 1.5 : r }));
  const dotRects: Rect[] = dots.map((d) => ({ x: d.cx - d.r, y: d.cy - d.r, w: d.r * 2, h: d.r * 2 }));

  const quadrant: Rect = { x: plot.x + plot.w * 0.6, y: plot.y, w: plot.w * 0.4, h: plot.h * 0.38 };
  const lh = fontSize + 8;
  const qw = textWidth(QUADRANT_TEXT, fontSize) + 12;
  const qLabel = placeLabel(cornersOf(quadrant, qw, lh, 4), dotRects, { ...plot, x: plot.x, w: plot.w });

  const bad = dots.find((d) => d.bad);
  let pLabel: Rect | null = null;
  if (bad) {
    const pw = textWidth(bad.name, fontSize) + 12;
    const others = dotRects.filter((_, i) => dots[i] !== bad).concat(qLabel, { x: bad.cx - bad.r, y: bad.cy - bad.r, w: bad.r * 2, h: bad.r * 2 });
    pLabel = placeLabel(aroundPoint(bad.cx, bad.cy, bad.r, pw, lh), others, plot);
  }
  return { plot, quadrant, dots, qLabel, pLabel, bad, lh };
}

type ScatterProps = { points: Point[]; width?: number; height?: number; fontSize?: number };

/**
 * Investimento × custo por lead, um ponto por empreendimento. O ruim fica em
 * vermelho terroso. Sempre em px reais: com largura e altura, desenha direto;
 * sem elas, mede a largura do contêiner (altura fixa).
 */
export function Scatter({ points, width, height, fontSize = 11 }: ScatterProps) {
  if (width !== undefined && height !== undefined) return <ScatterSvg points={points} W={width} H={height} fontSize={fontSize} />;
  return <FitChart height={height ?? 220}>{({ width: W, height: H }) => <ScatterSvg points={points} W={W} H={H} fontSize={fontSize} />}</FitChart>;
}

function ScatterSvg({ points, W, H, fontSize }: { points: Point[]; W: number; H: number; fontSize: number }) {
  const { plot, quadrant, dots, qLabel, pLabel, bad, lh } = scatterLayout(points, W, H, fontSize);
  const summary = `Dispersão de ${points.length} empreendimentos: investimento no eixo horizontal, custo por lead no vertical.${bad ? ` ${bad.name} gasta muito e tem lead caro.` : ""}`;
  const baseline = (r: Rect) => r.y + lh / 2 + fontSize * 0.36;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={summary} className="block">
      <title>{summary}</title>
      <rect className="m-late" style={{ "--d": "1300ms" } as CSSProperties} x={quadrant.x} y={quadrant.y} width={quadrant.w} height={quadrant.h} rx="4" fill="var(--error-soft)" opacity="0.7" />
      <line x1={plot.x} x2={plot.x} y1={plot.y} y2={plot.y + plot.h} stroke="var(--line)" />
      <line x1={plot.x} x2={plot.x + plot.w} y1={plot.y + plot.h} y2={plot.y + plot.h} stroke="var(--line)" />
      <text x={plot.x} y={H - 3} fontSize={fontSize} fill="var(--fg-2)">
        investimento →
      </text>
      <text x={fontSize} y={plot.y + plot.h} fontSize={fontSize} fill="var(--fg-2)" transform={`rotate(-90 ${fontSize} ${plot.y + plot.h})`}>
        custo por lead →
      </text>

      {dots.map((d, i) => (
        <g key={d.name} className="m-pt" style={{ "--d": `${560 + i * 110}ms` } as CSSProperties}>
          <circle cx={d.cx} cy={d.cy} r={d.r} fill={d.bad ? "#C9442E" : "var(--accent)"} />
        </g>
      ))}

      {/* rótulo do quadrante: no canto livre do quadrante, com fundo */}
      <g className="m-late" style={{ "--d": "1400ms" } as CSSProperties}>
        <rect x={qLabel.x} y={qLabel.y} width={qLabel.w} height={qLabel.h} rx="4" fill="var(--card)" stroke="var(--error-soft)" />
        <text x={qLabel.x + 6} y={baseline(qLabel)} fontSize={fontSize} fill="var(--error-fg)">
          {QUADRANT_TEXT}
        </text>
      </g>

      {/* rótulo do ponto ruim: ao lado do ponto, com fundo, sem sobrepor nada */}
      {bad && pLabel && (
        <g className="m-late" style={{ "--d": "1500ms" } as CSSProperties}>
          <rect x={pLabel.x} y={pLabel.y} width={pLabel.w} height={pLabel.h} rx="4" fill="var(--card)" stroke="var(--line)" />
          <text x={pLabel.x + 6} y={baseline(pLabel)} fontSize={fontSize} fontWeight="700" fill="var(--fg)">
            {bad.name}
          </text>
        </g>
      )}
    </svg>
  );
}
