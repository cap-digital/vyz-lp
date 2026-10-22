import type { CSSProperties } from "react";

export type BarItem = { label: string; value: number; display: string };

type BarListProps = {
  items: BarItem[];
  /** Linha de referência (equilíbrio ou meta), no mesmo eixo. */
  reference?: { value: number; label: string };
  /** "up": abaixo da referência é ruim (ROAS). "down": acima é ruim (CPA). */
  better?: "up" | "down";
  summary: string;
};

/**
 * Barras horizontais em ordem, com linha de referência tracejada. O que fica do
 * lado errado da referência vai em vermelho terroso; o resto em verde.
 */
export function BarList({ items, reference, better = "up", summary }: BarListProps) {
  const max = Math.max(...items.map((i) => i.value), reference?.value ?? 0) * 1.08 || 1;
  const sorted = [...items].sort((a, b) => (better === "up" ? b.value - a.value : a.value - b.value));
  const refPct = reference ? (reference.value / max) * 100 : 0;
  const bad = (v: number) => (reference ? (better === "up" ? v < reference.value : v > reference.value) : false);

  return (
    <div role="img" aria-label={summary}>
      {reference && (
        <p className="mb-1.5 flex items-center gap-1 text-[10px] leading-none text-fg-2" aria-hidden>
          <span className="w-3 border-t border-dashed border-fg-2" /> {reference.label}
        </p>
      )}
      <ul className="relative space-y-1.5" aria-hidden>
        {sorted.map((it, i) => (
          <li key={it.label} className="grid grid-cols-[minmax(0,5.5rem)_1fr_auto] items-center gap-2 text-[10.5px]">
            <span className="truncate text-fg-2">{it.label}</span>
            <span className="relative h-2.5">
              <span
                className="m-bar absolute inset-y-0 left-0 rounded-[2px]"
                style={{ width: `${Math.max(2, (it.value / max) * 100)}%`, background: bad(it.value) ? "#C9442E" : i < 3 ? "var(--accent)" : "var(--seq-c)", "--d": `${600 + i * 90}ms` } as CSSProperties}
              />
              {reference && <span className="absolute -inset-y-1 w-0 border-l border-dashed border-fg-2" style={{ left: `${refPct}%` }} />}
            </span>
            <span className={`font-semibold tnum ${bad(it.value) ? "text-error-fg" : "text-fg"}`}>{it.display}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
