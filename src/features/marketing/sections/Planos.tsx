"use client";

import { ArrowRight, Check } from "lucide-react";
import { useInView } from "motion/react";
import Link from "next/link";
import { useRef, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { CutReveal } from "@/components/motion/CutReveal";
import { Odometer } from "@/components/ui/Odometer";
import { Reveal } from "@/components/motion/Reveal";
import { SectionWipe } from "@/components/motion/SectionWipe";
import { usePlan } from "@/features/marketing/state/PlanProvider";
import { Segmented } from "@/components/ui/Segmented";
import { btn } from "@/components/ui/styles";
import { brl } from "@/lib/format";
import { ANNUAL_SAVING_PCT, EXTRA_ACCOUNT, PRO_TRACKING_VALUE, startingPrice, toQuery, type PlanId } from "@/features/pricing/pricing";
import { MSG_OVER_30, MSG_WHITE_LABEL, waLink } from "@/lib/whatsapp";
import { templateCountsLabel } from "@/features/pricing/entitlements";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { LayoutTemplate } from "lucide-react";
import { AudioWave } from "./AudioWave";

const PLATFORMS = ["M", "G", "GA", "Tk", "In", "ML", "Am", "Hs"];

function PlatformFan() {
  return (
    <span className="ml-1 inline-flex align-middle" aria-hidden>
      {PLATFORMS.map((p, i) => (
        <span
          key={p}
          className="-ml-1.5 inline-flex size-6 items-center justify-center rounded-full border border-current/25 bg-current/10 text-[8.5px] font-bold transition-transform duration-300 ease-brand first:ml-0 group-hover/fan:translate-x-[calc(var(--i)*7px)] group-hover/fan:rotate-[calc(var(--i)*4deg-12deg)]"
          style={{ "--i": i } as CSSProperties}
        >
          {p}
        </span>
      ))}
    </span>
  );
}

function TrackingStrike() {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -15% 0px" });
  return (
    <span ref={ref} className="relative inline-block opacity-70">
      <span className="sr-only">de </span>
      {brl(PRO_TRACKING_VALUE, { decimals: false })}
      <span
        aria-hidden
        className="absolute inset-x-[-2px] top-1/2 h-[2px] origin-left bg-current transition-transform duration-700 ease-brand"
        style={{ transform: inView ? "scaleX(1)" : "scaleX(0)", transitionDelay: "400ms" }}
      />
    </span>
  );
}

type PlanCardProps = {
  id: PlanId;
  name: string;
  pitch: string;
  features: ReactNode[];
  footer: string;
  cta: string;
  featured?: boolean;
  badge?: ReactNode;
  top?: ReactNode;
  extra?: ReactNode;
  delay: number;
  className?: string;
};

function PlanCard({ id, name, pitch, features, footer, cta, featured, badge, top, extra, delay, className = "" }: PlanCardProps) {
  const { state } = usePlan();
  const price = startingPrice(id, state.periodo);

  function spotlight(e: PointerEvent<HTMLElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  }

  return (
    <Reveal delay={delay} className={`${featured ? "" : "lg:my-8"} ${className}`}>
      <article
        aria-labelledby={`plano-${id}`}
        onPointerMove={spotlight}
        className={`group relative flex h-full flex-col overflow-hidden rounded-card border p-6 transition-colors duration-300 sm:p-7 ${
          featured ? "border-accent bg-accent text-on-accent lg:py-12" : "border-line bg-card text-fg hover:border-accent"
        }`}
      >
        {/* brilho que segue o cursor (sem sombra) */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: `radial-gradient(260px circle at var(--mx, 50%) var(--my, 0%), color-mix(in srgb, ${featured ? "var(--on-accent)" : "var(--accent)"} 14%, transparent), transparent 70%)`,
          }}
        />
        <div className="relative flex h-full flex-col">
          {top}
          <div className="flex items-center justify-between gap-3">
            <h3 id={`plano-${id}`} className="title text-2xl">
              {name}
            </h3>
            {badge}
          </div>
          <p className={`mt-2 text-[15px] leading-relaxed ${featured ? "" : "text-fg-2"}`}>{pitch}</p>

          <div className="mt-6">
            <p className={`label-caps ${featured ? "" : "text-fg-2"}`}>a partir de</p>
            <p className="mt-1 flex items-baseline gap-1">
              <span className="text-[2.6rem] leading-none font-extrabold tracking-[-0.03em]">
                <Odometer value={brl(price)} />
              </span>
              <span className={`text-sm ${featured ? "" : "text-fg-2"}`}>/mês</span>
            </p>
            <p className={`mt-1.5 text-[13px] ${featured ? "" : "text-fg-2"}`}>
              {state.periodo === "anual" ? "no anual" : "no mensal"} · 1 conta conectada
            </p>
          </div>

          <p className={`mt-5 flex items-center gap-2 rounded-control border px-3 py-2 text-[13.5px] font-semibold ${featured ? "border-current/25" : "border-line text-fg"}`}>
            <LayoutTemplate size={16} aria-hidden className={featured ? "" : "text-accent"} />
            {templateCountsLabel(id)}
          </p>

          <ul className="mt-5 space-y-2.5 text-[15px]">
            {features.map((f, i) => (
              <li key={i} className="flex gap-2.5">
                <Check size={18} aria-hidden className={`mt-0.5 shrink-0 ${featured ? "" : "text-accent"}`} />
                <span>{f}</span>
              </li>
            ))}
          </ul>

          {extra}

          <p className={`mt-6 border-t pt-4 text-[13px] leading-relaxed ${featured ? "border-current/20" : "border-line text-fg-2"}`}>{footer}</p>

          {/* o checkout leva a seleção atual (contas e extras do Monte seu plano) com este plano */}
          <Link
            href={`/assinar?${toQuery({ ...state, plano: id })}`}
            className={`${featured ? "bg-on-accent text-accent hover:opacity-90" : "bg-accent text-on-accent hover:opacity-90"} mt-5 inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-control font-semibold transition-[opacity,transform] duration-200 active:scale-[0.98]`}
          >
            {cta}
            <ArrowRight size={17} aria-hidden />
          </Link>
        </div>
      </article>
    </Reveal>
  );
}

export function Planos() {
  const { state, update } = usePlan();
  const extra = (id: PlanId) => `${brl(EXTRA_ACCOUNT[id].mensal)}/mês (${brl(EXTRA_ACCOUNT[id].anual)} no anual)`;

  return (
    <section id="planos" aria-labelledby="planos-title" className="relative">
      <SectionWipe />
      <div className="mx-auto max-w-[1360px] px-4 pt-20 pb-24 sm:px-6 lg:px-10 lg:pt-28">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="label-caps text-fg-2">Planos</p>
            <CutReveal
              as="h2"
              id="planos-title"
              className="display mt-5 text-[clamp(2.4rem,6.4vw,5.6rem)] text-fg"
              lineClassName={(i) => (i === 1 ? "text-accent" : "")}
              lines={["Escolha o plano.", "O preço sai na hora."]}
            />
          </div>
          <Segmented
            className="self-start lg:self-end"
            label="Período de cobrança"
            value={state.periodo}
            onChange={(periodo) => update({ periodo })}
            options={[
              { value: "mensal", label: "Mensal" },
              {
                value: "anual",
                label: "Anual",
                badge: <span className="rounded-chip bg-accent-soft px-1.5 py-px text-[11px] font-semibold text-fg">−{ANNUAL_SAVING_PCT}%</span>,
              },
            ]}
          />
        </div>

        <div className="mt-12 grid items-stretch gap-4 lg:mt-14 lg:grid-cols-[1fr_1.12fr_1fr]">
          <PlanCard
            id="base"
            name="Base"
            delay={0}
            pitch="Dashboards self-service: você conecta as contas e escolhe o template."
            features={[
              "Meta Ads, Google Ads e GA4 por login",
              "2 dashboards, um deles unificando Meta e Google",
              "Templates de e-commerce e imobiliário",
              "Link compartilhável e exportação em PDF",
            ]}
            footer={`Conta a mais: ${extra("base")} · Dashboard adicional: R$ 99`}
            cta="Assinar o Base"
          />
          <PlanCard
            id="pro"
            name="Pro"
            featured
            delay={110}
            badge={<span className="rounded-chip bg-on-accent px-2.5 py-0.5 text-[12px] font-semibold text-accent">Recomendado</span>}
            pitch="Tudo do Base em 27 plataformas, com tracking conectado pelo nosso time."
            features={[
              "Tudo do Base",
              <span key="27" className="group/fan">
                27 plataformas: mídia, marketplaces, GA4 e CRMs por API nativa <PlatformFan />
              </span>,
              "API de Conversões da Meta e conversões otimizadas do Google, conectadas pelo time",
              "GA4 configurado com eventos e conversões",
              "Planilhas conectadas (Google Sheets e Excel)",
            ]}
            extra={
              <p className="mt-6 rounded-control border border-current/20 px-3 py-2.5 text-[14px]">
                Implantação do tracking: <TrackingStrike /> avulso, <strong className="font-bold">R$ 0 no Pro</strong>
              </p>
            }
            footer={`Conta a mais: ${extra("pro")}`}
            cta="Assinar o Pro"
          />
          <PlanCard
            id="avancado"
            name="Avançado"
            delay={220}
            badge={<span className="rounded-chip bg-accent-soft px-2.5 py-0.5 text-[12px] font-semibold text-fg">Novo</span>}
            top={<AudioWave />}
            pitch="Tudo do Pro, com análise por áudio em tempo real."
            features={["Tudo do Pro", "Dashboard com análise por áudio: pergunte em voz alta e ouça a leitura dos números, em tempo real"]}
            footer="Conta a mais: igual ao Pro · a análise por áudio não tem desconto no anual"
            cta="Assinar o Avançado"
          />
        </div>

        <Reveal className="mt-6 lg:mt-14">
          {/* quarto bloco: marca própria, sem preço */}
          <article
            aria-labelledby="plano-personalizado"
            className="grid gap-6 rounded-card bg-deep p-6 text-offwhite sm:p-8 lg:grid-cols-[1.4fr_1fr] lg:items-center"
          >
            <div>
              <p className="label-caps text-sage">Personalizado · com a sua marca</p>
              <h3 id="plano-personalizado" className="display mt-3 text-[clamp(1.9rem,4vw,3rem)]">
                O dashboard com a cara da sua agência.
              </h3>
              <p className="mt-3 max-w-xl text-[16px] leading-relaxed text-offwhite/85">
                Seu logo e suas cores no dashboard, no link e no PDF, sem a marca VYZ. Para agências que entregam como se fosse delas.
              </p>
              <p className="mt-3 text-[13.5px] text-offwhite/70">20 templates de dashboard + sob medida · 10 de landing page</p>
            </div>
            <div className="flex flex-col items-start gap-4 lg:items-end">
              {/* prévia geométrica: o link do cliente com a marca da agência */}
              <div className="w-full max-w-sm rounded-[10px] border border-offwhite/15 bg-offwhite/5 p-4" aria-hidden>
                <div className="flex items-center gap-2">
                  <span className="size-6 rounded-full bg-[#6E9BC6]" />
                  <span className="h-2.5 w-24 rounded-full bg-offwhite/60" />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="h-10 rounded-[6px] bg-offwhite/10" />
                  ))}
                </div>
                <div className="mt-2 h-14 rounded-[6px] bg-offwhite/10" />
              </div>
              <a
                href={waLink(MSG_WHITE_LABEL)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center gap-2 rounded-control bg-sage px-6 font-semibold text-deep transition-[opacity,transform] duration-200 hover:opacity-90 active:scale-[0.98]"
              >
                <WhatsAppIcon /> Falar com especialista
              </a>
            </div>
          </article>
        </Reveal>

        <div className="mt-8 flex flex-col gap-3 text-sm text-fg-2 sm:flex-row sm:items-center sm:justify-between">
          <p>Valores em reais · o desconto do anual vale para o plano, não para os extras</p>
          <a href={waLink(MSG_OVER_30)} target="_blank" rel="noopener noreferrer" className={`${btn.ghost} -ml-3 w-fit sm:ml-0`}>
            Mais de 30 contas? Fale com um especialista →
          </a>
        </div>
      </div>
    </section>
  );
}
