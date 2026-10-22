"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Reveal } from "@/components/motion/Reveal";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Alterna 0/1 em loop curto enquanto o card está na tela ou com hover. */
function useLoop(active: boolean, period = 2200) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (!active) return;
    const first = window.setTimeout(() => setPhase(1), 500);
    const iv = window.setInterval(() => setPhase((p) => (p ? 0 : 1)), period);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(iv);
    };
  }, [active, period]);
  return phase;
}

function Card({ title, text, children, delay }: { title: string; text: string; children: (phase: number) => ReactNode; delay: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "0px 0px -15% 0px" });
  const reduce = useReducedMotion();
  const [hover, setHover] = useState(false);
  const loopPhase = useLoop((inView || hover) && !reduce);
  // movimento reduzido: mostra o estado final, parado
  const phase = reduce ? 1 : loopPhase;
  return (
    <Reveal delay={delay} className="h-full">
      <div
        ref={ref}
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
        className="flex h-full flex-col rounded-card border border-line bg-bg p-5 transition-colors duration-200 hover:border-accent sm:p-6"
      >
        <div className="relative h-[120px] overflow-hidden rounded-[10px] border border-line bg-card p-4" aria-hidden>
          {children(phase)}
        </div>
        <h3 className="title mt-5 text-lg text-fg">{title}</h3>
        <p className="mt-1.5 text-[15px] leading-relaxed text-fg-2">{text}</p>
      </div>
    </Reveal>
  );
}

function Dedupe({ phase }: { phase: number }) {
  const merged = phase === 1;
  return (
    <div className="flex h-full flex-col justify-center gap-2 text-[11px] font-semibold tnum">
      <div className="relative h-6">
        <motion.div
          className="absolute inset-y-0 left-0 flex origin-left items-center rounded-[4px] bg-accent px-2 text-on-accent"
          animate={{ width: merged ? "100%" : "79%", y: merged ? 16 : 0 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <motion.span animate={{ opacity: merged ? 0 : 1 }}>Meta 642</motion.span>
        </motion.div>
      </div>
      <div className="relative h-6">
        <motion.div
          className="absolute inset-y-0 left-0 flex items-center rounded-[4px] bg-muted px-2 text-fg"
          animate={{ width: merged ? "100%" : "58%", y: merged ? -16 : 0, opacity: merged ? 0 : 1 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          Google 470
        </motion.div>
      </div>
      <motion.p
        className="absolute top-1/2 left-6 -translate-y-1/2 text-[12px] text-on-accent"
        animate={{ opacity: merged ? 1 : 0 }}
        transition={{ delay: merged ? 0.35 : 0, duration: 0.25 }}
      >
        812 confirmadas
      </motion.p>
    </div>
  );
}

function Ctr({ phase }: { phase: number }) {
  const on = phase === 1;
  return (
    <div className="flex h-full items-center justify-center gap-5 tnum">
      <div className="text-center">
        <p className="relative inline-block text-[30px] font-bold text-fg-2">
          4,6%
          <motion.span
            className="absolute inset-x-[-4px] top-1/2 h-[3px] origin-left bg-error"
            animate={{ scaleX: on ? 1 : 0 }}
            transition={{ duration: 0.4, ease: EASE }}
          />
        </p>
        <p className="text-[10px] text-fg-2">média de médias</p>
      </div>
      <motion.div className="text-center" animate={{ opacity: on ? 1 : 0.15, x: on ? 0 : -8 }} transition={{ delay: on ? 0.3 : 0, duration: 0.4, ease: EASE }}>
        <p className="text-[30px] font-bold text-accent">1,7%</p>
        <p className="text-[10px] text-fg-2">cliques ÷ impressões</p>
      </motion.div>
    </div>
  );
}

const BARS = [62, 70, 58, 74, 66, 78, 72, 80, 76, 82];

function Maturing({ phase }: { phase: number }) {
  const on = phase === 1;
  return (
    <div className="flex h-full items-end gap-1.5">
      {BARS.map((h, i) => {
        const late = i >= BARS.length - 3;
        return (
          <div key={i} className="relative flex-1" style={{ height: `${h}%` }}>
            {late && (
              <motion.div
                className="absolute inset-0 rounded-t-[3px] border border-dashed border-accent"
                animate={{ opacity: on ? 1 : 0 }}
                transition={{ delay: on ? 0.25 + (i - 7) * 0.08 : 0, duration: 0.3 }}
              />
            )}
            <motion.div
              className="absolute inset-0 origin-bottom rounded-t-[3px] bg-accent"
              animate={{ scaleY: late ? (on ? 1 : 0.38 + (i - 7) * -0.08) : 1, opacity: late && !on ? 0.55 : 1 }}
              transition={{ duration: 0.55, ease: EASE, delay: late ? (i - 7) * 0.06 : 0 }}
            />
          </div>
        );
      })}
      <motion.span
        className="absolute top-3 right-3 rounded-chip bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-fg"
        animate={{ opacity: on ? 1 : 0 }}
        transition={{ delay: on ? 0.4 : 0 }}
      >
        em maturação
      </motion.span>
    </div>
  );
}

export function WhyCards() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card
        delay={0}
        title="Venda sem dupla contagem."
        text="Meta e Google atribuem a mesma venda. O topo mostra a venda confirmada no GA4, e o que cada plataforma atribui fica ao lado."
      >
        {(p) => <Dedupe phase={p} />}
      </Card>
      <Card
        delay={90}
        title="CTR do período, não média de médias."
        text="Cliques ÷ impressões do período inteiro, para uma campanha de 500 impressões não pesar igual a uma de 1 milhão."
      >
        {(p) => <Ctr phase={p} />}
      </Card>
      <Card
        delay={180}
        title="Dias em maturação."
        text="Os últimos dias aparecem marcados, porque parte das conversões ainda vai chegar. Queda falsa não vira corte de verba."
      >
        {(p) => <Maturing phase={p} />}
      </Card>
    </div>
  );
}
