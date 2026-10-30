"use client";

import { useState } from "react";

export type HeatmapCell = { row: number; col: number; value: number; /** Texto do tooltip. */ detail: string };

type HeatmapProps = {
  rows: string[];
  cols: string[];
  cells: HeatmapCell[];
  /** Quais rótulos de coluna aparecem (os outros ficam no tooltip). */
  colTicks?: number[];
  summary: string;
  /** Rótulo da escala ("menos" → "mais"). */
  legend: [string, string];
};

/**
 * Mapa de calor em grade (HTML, se ajusta à largura). Uma cor só, do claro ao
 * escuro (sequencial). Passar o mouse ou focar a célula mostra o valor.
 */
export function Heatmap({ rows, cols, cells, colTicks, summary, legend }: HeatmapProps) {
  const [active, setActive] = useState<HeatmapCell | null>(null);
  const max = Math.max(0, ...cells.map((c) => c.value)) || 1;
  const at = new Map(cells.map((c) => [`${c.row}|${c.col}`, c]));
  const ticks = new Set(colTicks ?? cols.map((_, i) => i));
  return (
    <figure className="m-0" aria-label={summary}>
      <div className="grid gap-[3px]" style={{ gridTemplateColumns: `2.25rem repeat(${cols.length}, minmax(0, 1fr))` }} role="grid" aria-label={summary} onPointerLeave={() => setActive(null)}>
        {rows.map((r, ri) => (
          <div key={r} role="row" className="contents">
            <span role="rowheader" className="self-center pr-1 text-[11px] text-fg-2">
              {r}
            </span>
            {cols.map((c, ci) => {
              const cell = at.get(`${ri}|${ci}`);
              const level = cell ? cell.value / max : 0;
              return (
                <span
                  key={c}
                  role="gridcell"
                  tabIndex={cell ? 0 : -1}
                  aria-label={cell ? `${r}, ${c}: ${cell.detail}` : `${r}, ${c}: sem dados`}
                  onPointerEnter={() => cell && setActive(cell)}
                  onFocus={() => cell && setActive(cell)}
                  onBlur={() => setActive(null)}
                  className={`aspect-square min-h-2 rounded-[3px] outline-offset-1 ${active === cell && cell ? "ring-2 ring-fg" : ""}`}
                  style={{ background: cell && level > 0 ? `color-mix(in srgb, var(--accent) ${Math.round(12 + level * 88)}%, var(--card))` : "var(--line)", opacity: cell ? 1 : 0.4 }}
                />
              );
            })}
          </div>
        ))}
        <span aria-hidden />
        {cols.map((c, ci) => (
          <span key={c} aria-hidden className="text-center text-[10px] leading-tight text-fg-2 tnum">
            {ticks.has(ci) ? c : ""}
          </span>
        ))}
      </div>
      <figcaption className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-fg-2">
        <span className="min-h-[1.2em] font-medium text-fg" aria-live="polite">
          {active ? `${rows[active.row]} · ${cols[active.col]} — ${active.detail}` : ""}
        </span>
        <span className="inline-flex items-center gap-1.5" aria-hidden>
          {legend[0]}
          <span className="h-2 w-16 rounded-full" style={{ background: "linear-gradient(90deg, color-mix(in srgb, var(--accent) 12%, var(--card)), var(--accent))" }} />
          {legend[1]}
        </span>
      </figcaption>
    </figure>
  );
}
