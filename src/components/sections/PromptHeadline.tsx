"use client";

import { useInView } from "motion/react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useMotionOK } from "@/lib/hooks";

const LINE1 = "Um prompt gera gráfico.";
const LINE2 = "Não gera critério.";

/**
 * "Um prompt gera gráfico." é digitado numa caixa de prompt; "Não gera
 * critério." entra pela abertura do corte e a caixa se parte na linha do corte.
 */
export function PromptHeadline({ id }: { id: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -20% 0px" });
  const motionOK = useMotionOK();
  // null = ainda não começou; depois, quantas letras já foram digitadas
  const [typed, setTyped] = useState<number | null>(null);
  const [stage, setStage] = useState<"typing" | "line2" | "broken">("typing");

  useEffect(() => {
    if (!inView || !motionOK) return;
    let n = 0;
    const timers: number[] = [];
    const iv = window.setInterval(() => {
      n += 1;
      setTyped(n);
      if (n >= LINE1.length) {
        window.clearInterval(iv);
        timers.push(window.setTimeout(() => setStage("line2"), 260));
        timers.push(window.setTimeout(() => setStage("broken"), 900));
      }
    }, 46);
    return () => {
      window.clearInterval(iv);
      timers.forEach(window.clearTimeout);
    };
  }, [inView, motionOK]);

  const animating = motionOK;
  const shown = !animating ? LINE1 : LINE1.slice(0, typed ?? 0);
  const line2State = !animating ? "static" : stage === "typing" ? "idle" : "play";
  const broken = animating && stage === "broken";

  const box = (
    <span className="flex items-start gap-3 rounded-card border border-line bg-bg px-4 py-4 sm:gap-5 sm:px-7 sm:py-6">
      <span className="mt-[0.18em] shrink-0 text-[0.5em] font-medium text-accent tnum">›_</span>
      <span className="min-h-[1em]">
        {shown}
        {animating && !broken && <span className="caret text-accent" />}
      </span>
    </span>
  );

  return (
    <h2 ref={ref} id={id} className="display text-[clamp(2.3rem,7.2vw,6rem)] text-fg">
      <span className="sr-only">
        {LINE1} {LINE2}
      </span>
      <span aria-hidden className="block">
        {/* a caixa existe duas vezes, recortada nas metades, para se partir no corte */}
        <span className="relative block max-w-[16em]">
          <span
            className="block transition-transform duration-500 ease-brand"
            style={{ clipPath: "inset(-10% -10% 50% -10%)", transform: broken ? "translateY(-0.045em) rotate(-0.4deg)" : undefined }}
          >
            {box}
          </span>
          <span
            className="absolute inset-0 block transition-transform duration-500 ease-brand"
            style={{ clipPath: "inset(50% -10% -10% -10%)", transform: broken ? "translate(0.04em, 0.045em) rotate(0.25deg)" : undefined }}
          >
            {box}
          </span>
        </span>
        <span className="mt-3 block text-accent sm:mt-4" data-cut={line2State}>
          <span className="cut-line" style={{ "--d": "0ms" } as CSSProperties}>
            <span className="cut-top">{LINE2}</span>
            <span className="cut-bot">{LINE2}</span>
          </span>
        </span>
      </span>
    </h2>
  );
}
