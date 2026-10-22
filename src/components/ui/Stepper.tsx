"use client";

import { Minus, Plus } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

type StepperProps = {
  label: string;
  hint?: ReactNode;
  value: number;
  min?: number;
  max: number;
  onChange: (next: number) => void;
  disabled?: boolean;
  /** Nome da unidade para os rótulos dos botões ("BM", "landing page"). */
  unit?: string;
};

/**
 * Contador com − e +. O número rola na vertical (sobe ao somar, desce ao
 * tirar) e segurar o botão repete.
 */
export function Stepper({ label, hint, value, min = 0, max, onChange, disabled = false, unit }: StepperProps) {
  const id = useId();
  const reduce = useReducedMotion();
  const [dir, setDir] = useState(1);
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  function step(delta: number) {
    const next = Math.min(max, Math.max(min, valueRef.current + delta));
    if (next === valueRef.current) return;
    setDir(delta > 0 ? 1 : -1);
    valueRef.current = next;
    onChange(next);
  }

  const u = unit ?? label.toLowerCase();
  const btnCls =
    "inline-flex size-9 items-center justify-center rounded-control border border-line text-fg transition-colors duration-150 hover:border-accent hover:text-accent disabled:opacity-30 disabled:hover:border-line disabled:hover:text-fg touch-manipulation select-none";

  return (
    <div role="group" aria-labelledby={`${id}-l`} className={`flex items-center justify-between gap-3 py-2.5 ${disabled ? "opacity-50" : ""}`}>
      <div className="min-w-0">
        <p id={`${id}-l`} className="text-[15px] font-medium text-fg">
          {label}
        </p>
        {hint && <p className="text-[13px] leading-snug text-fg-2">{hint}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <HoldButton label={`Tirar 1 (${u})`} disabled={disabled || value <= min} className={btnCls} onStep={() => step(-1)}>
          <Minus size={16} aria-hidden />
        </HoldButton>
        <output
          aria-live="polite"
          aria-label={`${label}: ${value}`}
          className="relative inline-flex h-9 w-10 items-center justify-center overflow-hidden text-lg font-bold tnum"
        >
          <AnimatePresence initial={false} mode="popLayout" custom={dir}>
            <motion.span
              key={value}
              custom={dir}
              variants={{
                enter: (d: number) => ({ y: reduce ? 0 : d > 0 ? "100%" : "-100%", opacity: reduce ? 1 : 0 }),
                center: { y: 0, opacity: 1 },
                exit: (d: number) => ({ y: reduce ? 0 : d > 0 ? "-100%" : "100%", opacity: 0 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: reduce ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="absolute"
            >
              {value}
            </motion.span>
          </AnimatePresence>
        </output>
        <HoldButton label={`Somar 1 (${u})`} disabled={disabled || value >= max} className={btnCls} onStep={() => step(1)}>
          <Plus size={16} aria-hidden />
        </HoldButton>
      </div>
    </div>
  );
}

type HoldButtonProps = {
  label: string;
  disabled: boolean;
  className: string;
  onStep: () => void;
  children: ReactNode;
};

/** Botão que repete enquanto está pressionado. */
function HoldButton({ label, disabled, className, onStep, children }: HoldButtonProps) {
  const timers = useRef<{ t?: number; i?: number }>({});
  const stepRef = useRef(onStep);
  useEffect(() => {
    stepRef.current = onStep;
  }, [onStep]);

  function stop() {
    window.clearTimeout(timers.current.t);
    window.clearInterval(timers.current.i);
  }
  useEffect(() => stop, []);
  useEffect(() => {
    if (disabled) stop();
  }, [disabled]);

  function onPointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return;
    stepRef.current();
    stop();
    timers.current.t = window.setTimeout(() => {
      timers.current.i = window.setInterval(() => stepRef.current(), 70);
    }, 380);
  }

  // teclado (Enter/Espaço) gera click com detail 0
  function onClick(e: React.MouseEvent) {
    if (e.detail === 0) stepRef.current();
  }

  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      className={className}
      onPointerDown={onPointerDown}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
