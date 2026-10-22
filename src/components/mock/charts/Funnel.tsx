import type { CSSProperties } from "react";
import { biggestDrop, type FunnelStep } from "@/lib/mock-data";

const SEQ = ["var(--seq-a)", "var(--seq-b)", "var(--seq-c)", "var(--seq-d)"];

/** Funil com a passagem entre etapas e a maior queda marcada em vermelho terroso. */
export function Funnel({ steps, title }: { steps: FunnelStep[]; title: string }) {
  const drop = biggestDrop(steps);
  const summary = `${title}: ${steps.map((s) => `${s.label} ${s.pct}%`).join(", ")}. Maior queda antes de ${steps[drop].label}.`;
  return (
    <div role="img" aria-label={summary}>
      <ul className="space-y-2" aria-hidden>
        {steps.map((s, i) => (
          <li key={s.label}>
            <div className="flex items-baseline justify-between text-[11px] leading-tight">
              <span className="text-fg">{s.label}</span>
              <span className="font-bold tnum text-fg">{s.pct}%</span>
            </div>
            <div className="mt-1 h-2 w-full">
              <div
                className="m-bar h-full rounded-[2px]"
                style={{ width: `${s.pct}%`, background: SEQ[i], "--d": `${620 + i * 140}ms` } as CSSProperties}
              />
            </div>
            {i === drop && (
              <p className="m-blink mt-0.5 text-[10px] font-semibold text-error-fg" style={{ "--d": `${900 + steps.length * 140}ms` } as CSSProperties}>
                ↓ maior queda
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
