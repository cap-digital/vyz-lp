"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { LandingRenderer } from "@/features/landing-pages/LandingRenderer";
import { landingDefaults, landingTemplate } from "@/features/templates/landing-pages";
import { slugify } from "@/lib/ids";

type LandingMockProps = {
  name: string;
  /** Template do cadastro do SaaS (o mock é o produto). */
  templateId: "produto-oferta" | "empreendimento";
  assemble: boolean;
};

/**
 * Prévia de landing page numa moldura de navegador, com o mesmo renderer do
 * painel. Começa como wireframe, bloco a bloco, enquanto a URL é digitada.
 */
export function LandingMock({ name, templateId, assemble }: LandingMockProps) {
  const reduce = useReducedMotion();
  const animate = assemble && !reduce;
  const template = landingTemplate(templateId)!;
  const content = landingDefaults(template, name);
  const url = `${slugify(name)}.com.br/${templateId === "empreendimento" ? "lancamento" : "colecao"}`;
  const [typed, setTyped] = useState(animate ? 0 : url.length);

  useEffect(() => {
    if (!animate) return;
    let n = 0;
    const iv = window.setInterval(() => {
      n += 1;
      setTyped(n);
      if (n >= url.length) window.clearInterval(iv);
    }, 28);
    return () => window.clearInterval(iv);
  }, [animate, url]);

  return (
    <div className="relative" data-anim={animate ? "on" : "off"}>
      <div className="scanner" aria-hidden />
      <div className="flex items-center gap-2 border-b border-line bg-card px-3 py-2">
        <span className="flex gap-1" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span key={i} className="size-2 rounded-full bg-muted" />
          ))}
        </span>
        <p className="flex h-6 min-w-0 flex-1 items-center rounded-[6px] border border-line bg-bg px-2 text-[11px] text-fg-2">
          <span className="truncate tnum">
            <span className="sr-only">Endereço fictício: </span>
            {url.slice(0, typed)}
          </span>
          {typed < url.length && <span className="caret" aria-hidden />}
        </p>
      </div>
      <div className="m-unveil max-h-[460px] overflow-hidden">
        <LandingRenderer template={template} content={content} />
      </div>
    </div>
  );
}
