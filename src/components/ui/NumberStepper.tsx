"use client";

// Campo numérico com − e +: sem as setinhas nativas. Aceita digitar,
// setas do teclado e limita entre min e max.

import { Minus, Plus } from "lucide-react";
import { useId, useState } from "react";

type Props = { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; suffix?: string; hideLabel?: boolean };

export function NumberStepper({ label, value, onChange, min = 0, max = Infinity, step = 1, suffix, hideLabel = false }: Props) {
  const id = useId();
  // rascunho só enquanto digita; fora disso mostra o valor
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? String(value);
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const commit = (raw: string) => {
    const n = Number(raw.replace(/\D/g, ""));
    const next = Number.isFinite(n) && raw.trim() !== "" ? clamp(n) : value;
    setDraft(null);
    if (next !== value) onChange(next);
  };
  const btnCls = "inline-flex h-full w-9 items-center justify-center text-fg-2 transition-colors hover:text-accent disabled:opacity-30 disabled:hover:text-fg-2";
  return (
    <div className="space-y-1">
      <label htmlFor={id} className={hideLabel ? "sr-only" : "block text-[13px] font-medium text-fg"}>
        {label}
      </label>
      <div className="flex h-10 items-center rounded-control border border-line bg-field focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
        <button type="button" tabIndex={-1} aria-label={`Diminuir ${label}`} disabled={value <= min} onClick={() => onChange(clamp(value - step))} className={btnCls}>
          <Minus size={15} aria-hidden />
        </button>
        <input
          id={id}
          role="spinbutton"
          aria-valuemin={Number.isFinite(min) ? min : undefined}
          aria-valuemax={Number.isFinite(max) ? max : undefined}
          aria-valuenow={value}
          inputMode="numeric"
          value={text}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit(text);
            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault();
              onChange(clamp(value + (e.key === "ArrowUp" ? step : -step)));
            }
          }}
          className="h-full w-0 min-w-8 flex-1 bg-transparent text-center text-[14px] font-semibold text-fg tnum outline-none"
        />
        {suffix && <span className="pr-1 text-[12.5px] text-fg-2">{suffix}</span>}
        <button type="button" tabIndex={-1} aria-label={`Aumentar ${label}`} disabled={value >= max} onClick={() => onChange(clamp(value + step))} className={btnCls}>
          <Plus size={15} aria-hidden />
        </button>
      </div>
    </div>
  );
}
