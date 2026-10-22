"use client";

import { MousePointerClick } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CutReveal } from "@/components/motion/CutReveal";
import { Reveal } from "@/components/motion/Reveal";
import { SectionWipe } from "@/components/motion/SectionWipe";
import { PromptHeadline } from "./PromptHeadline";
import { StoryPanel } from "./StoryPanel";
import { WhyCards } from "./WhyCards";

const STEPS = [
  {
    title: "Conecte as contas.",
    text: "Login com Meta Ads, Google Ads e GA4. No Pro, também TikTok, LinkedIn, marketplaces e CRMs por API.",
  },
  {
    title: "Escolha o template.",
    text: "E-commerce ou imobiliário, desenhados a partir das decisões que cada negócio toma toda semana.",
  },
  {
    title: "Mande para o cliente.",
    text: "Link compartilhável e PDF, com o número que decide o mês no topo.",
  },
];

export function ComoFunciona() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.step));
        }
      },
      { rootMargin: "-48% 0px -48% 0px" },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section id="como-funciona" aria-labelledby="cf-title" className="relative bg-card">
      <SectionWipe />
      <div className="mx-auto max-w-[1360px] px-4 pt-20 pb-24 sm:px-6 lg:px-10 lg:pt-28">
        <p className="label-caps text-fg-2">Como funciona</p>
        <div className="mt-5">
          <PromptHeadline id="cf-title" />
        </div>

        <div className="mt-16 lg:mt-24 lg:grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
          <ol className="space-y-14 lg:space-y-0">
            {STEPS.map((s, i) => (
              <li
                key={s.title}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                data-step={i}
                className="lg:flex lg:min-h-[72vh] lg:flex-col lg:justify-center"
              >
                <p
                  className={`display text-[4.5rem] tnum transition-colors duration-300 lg:text-[7rem] ${
                    active === i ? "text-accent" : "text-fg-2/40 max-lg:text-accent"
                  }`}
                  aria-hidden
                >
                  0{i + 1}
                </p>
                <h3 className={`title mt-3 text-2xl transition-colors duration-300 lg:text-[2rem] ${active === i ? "text-fg" : "text-fg-2 max-lg:text-fg"}`}>
                  <span className="sr-only">Passo {i + 1}: </span>
                  {s.title}
                </h3>
                <p className="mt-3 max-w-md text-[17px] leading-relaxed text-fg-2">{s.text}</p>
                <div className="mt-6 h-[300px] sm:h-[360px] lg:hidden">
                  <StoryPanel step={i} />
                </div>
              </li>
            ))}
          </ol>
          <div className="hidden lg:block">
            <div className="sticky top-[14vh] h-[72vh]">
              <StoryPanel step={active} />
            </div>
          </div>
        </div>

        <div className="mt-24 lg:mt-28">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <CutReveal as="h3" className="display text-[clamp(2rem,4.6vw,3.6rem)] text-fg" lines={["Por que o número fecha."]} />
            <p className="rounded-chip border border-line px-2.5 py-0.5 text-[12px] text-fg-2">Amostra · dados fictícios</p>
          </div>
          <div className="mt-8">
            <WhyCards />
          </div>
        </div>

        <Reveal className="mt-6">
          <div className="flex flex-col gap-4 rounded-card border border-line bg-bg p-5 sm:flex-row sm:items-center sm:p-6">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent">
              <MousePointerClick size={20} aria-hidden />
            </span>
            <p className="text-[16px] leading-relaxed text-fg">
              <strong className="font-semibold">Landing page desenhada e publicada pelo time</strong>, já com o GTM configurado
              (container, tags base e publicação).
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
