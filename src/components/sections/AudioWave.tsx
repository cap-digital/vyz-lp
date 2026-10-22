"use client";

import { Mic } from "lucide-react";
import { useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type CSSProperties } from "react";

const CAPTION = "Seu custo por venda caiu 8,2% esta semana.";
const BARS = 28;

/**
 * Onda sonora em loop no topo do card Avançado. No hover ela fica mais intensa
 * e uma legenda fictícia aparece digitando. Pausa fora da tela.
 */
export function AudioWave() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  const reduce = useReducedMotion();
  const [hover, setHover] = useState(false);
  const [typed, setTyped] = useState(0);

  useEffect(() => {
    if (!hover || reduce) return;
    let n = 0;
    const iv = window.setInterval(() => {
      n += 1;
      setTyped(n);
      if (n >= CAPTION.length) window.clearInterval(iv);
    }, 32);
    return () => {
      window.clearInterval(iv);
      setTyped(0);
    };
  }, [hover, reduce]);

  const shown = reduce ? (hover ? CAPTION : "") : CAPTION.slice(0, typed);

  return (
    <div
      ref={ref}
      className="mb-6 rounded-control border border-line bg-bg p-3"
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
    >
      <div className="flex items-center gap-3">
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent" aria-hidden>
          <Mic size={15} />
        </span>
        <div
          className="wave flex h-9 flex-1 items-center gap-[3px] text-accent"
          data-loud={hover ? "" : undefined}
          data-paused={inView ? undefined : ""}
          aria-hidden
        >
          {Array.from({ length: BARS }, (_, i) => (
            <span
              key={i}
              style={
                {
                  "--delay": `${-((i * 137) % 1000) / 1000}s`,
                  "--dur": `${0.9 + ((i * 53) % 7) / 10}s`,
                } as CSSProperties
              }
            />
          ))}
        </div>
      </div>
      <p className="mt-2 min-h-[1.4em] text-[13px] text-fg-2" aria-hidden>
        {shown ? `“${shown}${shown.length === CAPTION.length ? "”" : ""}` : <span className="opacity-70">Toque ou passe o mouse para ouvir uma leitura</span>}
      </p>
    </div>
  );
}
