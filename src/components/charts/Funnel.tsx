import type { CSSProperties } from "react";

const SEQ = ["var(--seq-a)", "var(--seq-b)", "var(--seq-c)", "var(--seq-d)", "var(--seq-d)"];

/** Índice da etapa que recebe a maior queda relativa. */
export function biggestDrop(steps: { pct: number }[]): number {
  let idx = 1;
  let worst = -1;
  for (let i = 1; i < steps.length; i++) {
    const loss = 1 - steps[i].pct / steps[i - 1].pct;
    if (loss > worst) {
      worst = loss;
      idx = i;
    }
  }
  return idx;
}

type FunnelProps = {
  steps: { label: string; pct: number }[];
  title: string;
  /** "lg": texto de leitura (painel de "Como funciona"). */
  size?: "sm" | "lg";
  /** Distribui as etapas na altura toda do contêiner. */
  fill?: boolean;
};

/** Funil com a passagem entre etapas e a maior queda marcada em vermelho terroso. Barras com 10 px ou mais. */
export function Funnel({ steps, title, size = "sm", fill = false }: FunnelProps) {
  const drop = biggestDrop(steps);
  const lg = size === "lg";
  const summary = `${title}: ${steps.map((s) => `${s.label} ${s.pct}%`).join(", ")}. Maior queda antes de ${steps[drop].label}.`;
  return (
    <div role="img" aria-label={summary} className={fill ? "h-full" : ""}>
      <ul className={fill ? "flex h-full flex-col justify-between gap-2" : lg ? "space-y-3" : "space-y-2"} aria-hidden>
        {steps.map((s, i) => (
          <li key={s.label}>
            <div className={`flex items-baseline justify-between leading-tight ${lg ? "text-[13px]" : "text-[11px]"}`}>
              <span className="text-fg">{s.label}</span>
              <span className="font-bold tnum text-fg">{s.pct}%</span>
            </div>
            <div className={`mt-1 w-full ${lg ? "h-3" : "h-2.5"}`}>
              <div className="m-bar h-full rounded-[3px]" style={{ width: `${Math.max(2, s.pct)}%`, background: SEQ[i], "--d": `${620 + i * 140}ms` } as CSSProperties} />
            </div>
            {i === drop && (
              <p className={`m-blink mt-0.5 font-semibold text-error-fg ${lg ? "text-[12px]" : "text-[10px]"}`} style={{ "--d": `${900 + steps.length * 140}ms` } as CSSProperties}>
                ↓ maior queda
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
