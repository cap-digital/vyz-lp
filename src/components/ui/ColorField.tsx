"use client";

// Cor da marca: amostras prontas + hexadecimal digitado, em popover próprio
// (sem o seletor nativo do sistema).

import { Check } from "lucide-react";
import { Popover } from "radix-ui";
import { useId, useState } from "react";
import { usePortalContainer } from "./portal";

const SWATCHES = ["#4B5320", "#8A9A5B", "#1F2612", "#3E6F9E", "#1E1E1E", "#C9442E", "#D9A441", "#7A4E9E", "#0F766E", "#B45309"];
const HEX = /^#[0-9a-f]{6}$/i;

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const container = usePortalContainer();
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <div className="space-y-1">
      <p id={`${id}-l`} className="text-[13px] font-medium text-fg">
        {label}
      </p>
      <Popover.Root>
        <Popover.Trigger
          aria-labelledby={`${id}-l`}
          className="inline-flex h-10 items-center gap-2.5 rounded-control border border-line bg-field pr-3 pl-1.5 text-[14px] text-fg outline-none hover:border-fg-2/60 focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent data-[state=open]:border-accent data-[state=open]:ring-1 data-[state=open]:ring-accent"
        >
          <span className="size-7 rounded-[6px] border border-line" style={{ background: value }} />
          <span className="tnum">{value.toUpperCase()}</span>
        </Popover.Trigger>
        <Popover.Portal container={container}>
          <Popover.Content sideOffset={4} collisionPadding={8} align="start" className="pop z-[90] w-60 rounded-card border border-line bg-card p-3 text-fg outline-none">
            <div className="grid grid-cols-5 gap-2" role="listbox" aria-label="Cores">
              {SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="option"
                  aria-selected={value.toLowerCase() === c.toLowerCase()}
                  aria-label={c}
                  onClick={() => onChange(c)}
                  className="inline-flex aspect-square items-center justify-center rounded-control border border-line outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  style={{ background: c }}
                >
                  {value.toLowerCase() === c.toLowerCase() && <Check size={14} strokeWidth={3} className="text-white mix-blend-difference" aria-hidden />}
                </button>
              ))}
            </div>
            <label className="mt-3 block text-[12px] font-medium text-fg-2">
              Hexadecimal
              <input
                value={draft ?? value.toUpperCase()}
                onChange={(e) => {
                  const v = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`;
                  setDraft(v.toUpperCase().slice(0, 7));
                  if (HEX.test(v)) onChange(v.toUpperCase());
                }}
                onBlur={() => setDraft(null)}
                spellCheck={false}
                className="mt-1 h-9 w-full rounded-control border border-line bg-field px-2.5 text-[13.5px] text-fg tnum outline-none focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent"
              />
            </label>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
