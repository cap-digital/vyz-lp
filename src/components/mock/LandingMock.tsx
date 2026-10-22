"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Icon } from "@/components/brand/Icon";
import { LANDING_COPY, slugify, type MockTipo } from "@/lib/mock-data";

type LandingMockProps = {
  name: string;
  tipo: MockTipo;
  assemble: boolean;
};

function Block({ d, children, className = "" }: { d: number; children: ReactNode; className?: string }) {
  return (
    <div className={`lp-block ${className}`} style={{ "--d": `${d}ms` } as CSSProperties}>
      <div className="lp-fill">{children}</div>
      <div className="lp-wire" aria-hidden />
    </div>
  );
}

/**
 * Prévia de landing page numa moldura de navegador. A página tem paleta
 * própria (é do cliente) e começa como wireframe, bloco a bloco.
 */
export function LandingMock({ name, tipo, assemble }: LandingMockProps) {
  const reduce = useReducedMotion();
  const animate = assemble && !reduce;
  const copy = LANDING_COPY[tipo];
  const url = `${slugify(name)}.com.br/${copy.path}`;
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
    <div className="@container relative" data-anim={animate ? "on" : "off"}>
      <div className="scanner" aria-hidden />
      {/* barra do navegador */}
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

      {/* a página do cliente */}
      <div className="m-unveil space-y-3 bg-[#f3f5ee] p-4 text-[#1e1e1e] @[460px]:p-5">
        <Block d={260} className="flex items-center justify-between">
          <p className="text-[14px] font-extrabold tracking-[-0.02em] text-[#4b5320]">{name}</p>
          <p className="hidden gap-3 text-[10.5px] text-[#6f726a] @[400px]:flex">
            <span>Sobre</span>
            <span>{tipo === "ecommerce" ? "Coleção" : "Plantas"}</span>
            <span>Contato</span>
          </p>
        </Block>

        <div className="grid gap-3 @[460px]:grid-cols-[1.25fr_1fr] @[460px]:items-center">
          <div className="space-y-2.5">
            <Block d={420}>
              <p className="text-[22px] leading-[1.02] font-extrabold tracking-[-0.03em] @[460px]:text-[26px]">{copy.h1}</p>
            </Block>
            <Block d={560}>
              <p className="text-[11.5px] leading-snug text-[#6f726a]">{copy.sub}</p>
            </Block>
            <Block d={680} className="inline-block">
              <span className="inline-flex h-8 items-center rounded-[6px] bg-[#4b5320] px-3 text-[11px] font-semibold text-[#e8ece1]">{copy.cta}</span>
            </Block>
          </div>
          <Block d={820}>
            <div className="space-y-1.5 rounded-[10px] border border-[#cfd3c6] bg-white p-3" aria-hidden>
              {copy.fields.map((f) => (
                <div key={f}>
                  <p className="text-[9.5px] font-medium text-[#6f726a]">{f}</p>
                  <div className="mt-0.5 h-6 rounded-[5px] border border-[#cfd3c6] bg-[#fbfcf8]" />
                </div>
              ))}
              <div className="mt-1 flex h-7 items-center justify-center rounded-[5px] bg-[#4b5320] text-[10.5px] font-semibold text-[#e8ece1]">
                Enviar
              </div>
            </div>
          </Block>
        </div>

        <Block d={980} className="flex items-center justify-between border-t border-[#cfd3c6] pt-2.5">
          <p className="text-[9.5px] text-[#6f726a]">© {name}</p>
          <p className="inline-flex items-center gap-1 rounded-full border border-[#cfd3c6] py-0.5 pr-2 pl-0.5 text-[9.5px] font-medium text-[#4b5320]">
            <span className="size-4">
              <Icon className="text-[#e8ece1]" background="#4b5320" radius={50} />
            </span>
            Feito com VYZ
          </p>
        </Block>
      </div>
    </div>
  );
}
