"use client";

import { useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export type SegmentOption<T extends string> = {
  value: T;
  label: ReactNode;
  badge?: ReactNode;
  disabled?: boolean;
};

type SegmentedProps<T extends string> = {
  options: SegmentOption<T>[];
  value: T | null;
  onChange: (v: T) => void;
  label: string;
  /** "track" = trilho com pílula; "chips" = chips soltos com a pílula deslizando entre eles. */
  variant?: "track" | "chips";
  size?: "sm" | "md";
  className?: string;
  /** Pílula ocupando a largura toda, com opções de largura igual. */
  block?: boolean;
};

type Pill = { x: number; y: number; w: number; h: number };

/**
 * Grupo de opções exclusivas (radiogroup). A pílula desliza só com transform
 * (posição medida no DOM), sem o motor de layout do motion.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  variant = "track",
  size = "md",
  className = "",
  block = false,
}: SegmentedProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const [pill, setPill] = useState<Pill | null>(null);
  const [ready, setReady] = useState(false);
  const enabled = options.filter((o) => !o.disabled);
  const index = options.findIndex((o) => o.value === value);

  useLayoutEffect(() => {
    const measure = () => {
      const el = refs.current[index];
      if (!el) return setPill(null);
      setPill({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight });
    };
    measure();
    const ro = new ResizeObserver(measure);
    refs.current.forEach((el) => el && ro.observe(el));
    return () => ro.disconnect();
  }, [index, options.length]);

  // só anima depois da primeira medida (sem deslizar no carregamento)
  useLayoutEffect(() => {
    if (!pill || ready) return;
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, [pill, ready]);

  function onKey(e: KeyboardEvent, i: number) {
    const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const current = enabled.findIndex((o) => o.value === options[i].value);
    const next = enabled[(current + dir + enabled.length) % enabled.length];
    onChange(next.value);
    refs.current[options.indexOf(next)]?.focus();
  }

  const h = size === "sm" ? "h-8 px-3 text-[13px]" : "h-10 px-4 text-sm";
  const track = variant === "track" ? "rounded-chip border border-line bg-bg p-1" : "flex-wrap gap-2";
  const focusIndex = Math.max(0, index);

  return (
    <div role="radiogroup" aria-label={label} className={`relative isolate ${block ? "flex" : "inline-flex"} ${track} ${className}`}>
      {pill && (
        <span
          aria-hidden
          className={`absolute top-0 left-0 -z-10 rounded-chip bg-accent ${ready ? "transition-[transform,width,height] duration-300 ease-brand" : ""}`}
          style={{ width: pill.w, height: pill.h, transform: `translate(${pill.x}px, ${pill.y}px)` }}
        />
      )}
      {options.map((o, i) => {
        const checked = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            disabled={o.disabled}
            tabIndex={i === focusIndex ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKey(e, i)}
            className={`relative inline-flex items-center justify-center gap-1.5 rounded-chip font-medium transition-colors duration-200 ${h} ${block ? "flex-1" : ""} ${
              variant === "chips" ? (checked ? "border border-transparent" : "border border-line") : ""
            } ${checked ? "text-on-accent" : "text-fg-2 hover:text-fg"} ${checked && !pill ? "bg-accent" : ""} disabled:opacity-40`}
          >
            {o.label}
            {o.badge}
          </button>
        );
      })}
    </div>
  );
}
