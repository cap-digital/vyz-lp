"use client";

import { ArrowRight } from "lucide-react";
import { AnimatePresence, m, useInView, useReducedMotion } from "motion/react";
import { useRef, type ReactNode } from "react";
import { CutReveal } from "@/components/motion/CutReveal";
import { Odometer } from "@/components/ui/Odometer";
import { Reveal } from "@/components/motion/Reveal";
import { SectionWipe } from "@/components/motion/SectionWipe";
import { scrollToId } from "@/components/motion/SmoothScroll";
import { usePlan } from "@/features/marketing/state/PlanProvider";
import { Segmented } from "@/components/ui/Segmented";
import { Stepper } from "@/components/ui/Stepper";
import { btn } from "@/components/ui/styles";
import { useToast } from "@/components/ui/Toast";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { brl } from "@/lib/format";
import {
  ANNUAL_SAVING_PCT,
  DASH_CUSTOM,
  DASH_EXTRA_PRICE,
  LP_CARE_MONTHLY,
  LP_TEAM_PRICE,
  MAX_ACCOUNTS_IN_PLAN,
  MAX_EXTRA,
  MAX_PER_PLATFORM,
  NICHO_LABEL,
  type PlanChoice,
} from "@/features/pricing/pricing";
import { MSG_SPECIALIST, waLink } from "@/lib/whatsapp";
import { Comanda } from "./Comanda";

const WARN_FROM = 25;

function Step({ n, title, children, aside }: { n: number; title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section aria-labelledby={`passo-${n}`} className="rounded-card border border-line bg-bg p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id={`passo-${n}`} className="flex items-baseline gap-3">
          <span className="label-caps text-accent tnum">0{n}</span>
          <span className="title text-lg text-fg">{title}</span>
        </h3>
        {aside}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function AccountTicks({ accepted }: { accepted: number }) {
  return (
    <div className="flex gap-[3px]" aria-hidden>
      {Array.from({ length: MAX_ACCOUNTS_IN_PLAN }, (_, i) => {
        const lit = i < accepted;
        const warn = lit && (i >= WARN_FROM - 1 || accepted > MAX_ACCOUNTS_IN_PLAN);
        return (
          <span
            key={i}
            className={`h-3 flex-1 rounded-[2px] transition-colors duration-200 ${warn ? "bg-warning" : lit ? "bg-accent" : "bg-line"}`}
            style={{ transitionDelay: lit ? `${Math.min(i, 10) * 12}ms` : "0ms" }}
          />
        );
      })}
    </div>
  );
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function MonteSeuPlano() {
  const { state, quote: q, update } = usePlan();
  const toast = useToast();
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const comandaRef = useRef<HTMLElement>(null);
  const inSection = useInView(sectionRef, { margin: "0px 0px -30% 0px" });
  const comandaVisible = useInView(comandaRef, { margin: "0px 0px -20% 0px" });

  const noPlan = state.plano === "sem";
  const isBase = state.plano === "base";
  const acceptsOthers = state.plano === "pro" || state.plano === "avancado";

  const counter = `${plural(q.accountsAccepted, "conta", "contas")} = ${plural(q.accountsBilled, "conta cobrada", "contas cobradas")} · ${Math.min(
    q.accountsAccepted,
    99,
  )}/${MAX_ACCOUNTS_IN_PLAN}`;

  const totalForBar = noPlan ? brl(q.oneTime) : q.overLimit ? "Sob consulta" : brl(q.monthly);

  return (
    <section ref={sectionRef} id="monte-seu-plano" aria-labelledby="msp-title" className="relative bg-card">
      <SectionWipe />
      <div className="mx-auto max-w-[1360px] px-4 pt-20 pb-28 sm:px-6 lg:px-10 lg:pt-28 lg:pb-24">
        <p className="label-caps text-fg-2">Monte seu plano</p>
        <CutReveal
          as="h2"
          id="msp-title"
          className="display mt-5 text-[clamp(2.4rem,6.4vw,5.6rem)] text-fg"
          lineClassName={(i) => (i === 1 ? "text-accent" : "")}
          lines={["Monte a conta.", "Do seu jeito."]}
        />
        {state.nicho && (
          <p className="mt-5 inline-flex items-center gap-2 rounded-chip border border-line px-3 py-1 text-[13px] text-fg-2">
            Tipo de negócio: <strong className="font-semibold text-fg">{NICHO_LABEL[state.nicho]}</strong>
            <button type="button" onClick={() => update({ nicho: null })} className="ml-1 text-fg-2 hover:text-fg" aria-label="Remover tipo de negócio">
              ×
            </button>
          </p>
        )}

        <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] lg:gap-12">
          <div className="space-y-4">
            <Reveal>
              <Step n={1} title="Plano">
                <Segmented<PlanChoice>
                  label="Plano"
                  variant="chips"
                  value={state.plano}
                  onChange={(plano) => update({ plano })}
                  options={[
                    { value: "base", label: "Base" },
                    { value: "pro", label: "Pro" },
                    { value: "avancado", label: "Avançado" },
                    { value: "sem", label: "Sem plano" },
                  ]}
                />
                {noPlan && <p className="mt-3 text-[14px] text-fg-2">Só landing page ou dashboard sob medida, sem assinatura.</p>}
              </Step>
            </Reveal>

            <AnimatePresence initial={false}>
              {!noPlan && (
                <m.div
                  key="contas"
                  // mesmas props no servidor e no cliente; com movimento reduzido, só a duração muda
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: reduce ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <Step
                    n={2}
                    title="Contas conectadas"
                    aside={
                      <div className="flex gap-2">
                        <button type="button" onClick={() => update({ meta: 1, google: 1, ga4: 0, outras: 0 })} className="rounded-chip border border-line px-3 py-1 text-[13px] text-fg-2 transition-colors hover:border-accent hover:text-fg">
                          1 cliente
                        </button>
                        <button type="button" onClick={() => update({ meta: 5, google: 5, ga4: 0, outras: 0 })} className="rounded-chip border border-line px-3 py-1 text-[13px] text-fg-2 transition-colors hover:border-accent hover:text-fg">
                          Agência 5+5
                        </button>
                      </div>
                    }
                  >
                    <div className="divide-y divide-line">
                      <Stepper label="BMs do Meta" unit="BM do Meta" value={state.meta} max={MAX_PER_PLATFORM} onChange={(meta) => update({ meta })} />
                      <Stepper label="Contas do Google Ads" unit="conta do Google Ads" value={state.google} max={MAX_PER_PLATFORM} onChange={(google) => update({ google })} />
                      <Stepper label="Propriedades do GA4" unit="propriedade do GA4" value={state.ga4} max={MAX_PER_PLATFORM} onChange={(ga4) => update({ ga4 })} />
                      {acceptsOthers ? (
                        <Stepper
                          label="Outras plataformas"
                          unit="conta de outra plataforma"
                          hint="TikTok, LinkedIn, marketplaces, CRMs"
                          value={state.outras}
                          max={MAX_PER_PLATFORM}
                          onChange={(outras) => update({ outras })}
                        />
                      ) : (
                        isBase && (
                          <div className="py-3">
                            <button
                              type="button"
                              onClick={() => {
                                update({ plano: "pro" });
                                toast.show("Mudamos para o Pro.");
                              }}
                              className="group flex w-full items-center justify-between gap-3 rounded-control border border-dashed border-line px-3 py-2.5 text-left text-[14px] text-fg-2 transition-colors hover:border-accent hover:text-fg"
                            >
                              <span>
                                TikTok, LinkedIn e CRMs entram no Pro
                                {state.outras > 0 && ` · ${plural(state.outras, "conta guardada", "contas guardadas")} fora do Base`}
                              </span>
                              <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-accent">
                                Trocar <ArrowRight size={15} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
                              </span>
                            </button>
                          </div>
                        )
                      )}
                    </div>
                    <div className="mt-4 space-y-2">
                      <p className={`text-[13px] tnum ${q.overLimit ? "font-semibold text-warning" : "text-fg-2"}`} aria-live="polite">
                        {counter}
                        {q.overLimit && " · acima de 30, sob consulta"}
                      </p>
                      <AccountTicks accepted={q.accountsAccepted} />
                    </div>
                  </Step>
                </m.div>
              )}
            </AnimatePresence>

            {!noPlan && (
              <Reveal>
                <Step n={3} title="Período">
                  <Segmented
                    label="Período"
                    value={state.periodo}
                    onChange={(periodo) => update({ periodo })}
                    options={[
                      { value: "mensal", label: "Mensal" },
                      { value: "anual", label: `Anual (−${ANNUAL_SAVING_PCT}%)` },
                    ]}
                  />
                </Step>
              </Reveal>
            )}

            <Reveal>
              <Step n={noPlan ? 2 : 4} title="Extras">
                <div className="divide-y divide-line">
                  <div className="pb-1">
                    <Stepper
                      label="Landing page feita pelo time"
                      hint={`${brl(LP_TEAM_PRICE, { decimals: false })} cada, uma vez · já com o GTM`}
                      value={state.lp}
                      max={MAX_EXTRA}
                      unit="landing page"
                      onChange={(lp) => update({ lp })}
                    />
                    <label className={`mb-2 flex items-center gap-2.5 text-[14px] ${state.lp ? "text-fg" : "text-fg-2"}`}>
                      <input
                        type="checkbox"
                        checked={state.lpcare}
                        onChange={(e) => update({ lpcare: e.target.checked })}
                        className="size-4 accent-[var(--accent)]"
                      />
                      Hospedagem e ajustes · {brl(LP_CARE_MONTHLY)}/mês por LP
                    </label>
                  </div>
                  <div className="pb-2">
                    <Stepper
                      label="Dashboard sob medida"
                      hint="Desenhado do zero, até 2 fontes"
                      value={state.sob}
                      max={MAX_EXTRA}
                      onChange={(sob) => update({ sob })}
                    />
                    <Segmented
                      label="Pagamento do dashboard sob medida"
                      size="sm"
                      value={state.sobm}
                      onChange={(sobm) => update({ sobm })}
                      options={[
                        { value: "unico", label: `Pagamento único · ${brl(DASH_CUSTOM.unico, { decimals: false })}` },
                        { value: "recorrente", label: `${brl(DASH_CUSTOM.recorrente.setup, { decimals: false })} + ${brl(DASH_CUSTOM.recorrente.mensal, { decimals: false })}/mês` },
                      ]}
                    />
                    {state.sobm === "recorrente" && (
                      <p className="mt-2 text-[13px] text-fg-2">Inclui manutenção, monitoramento das conexões e até 2 ajustes por mês.</p>
                    )}
                  </div>
                  <Stepper
                    label="Dashboard adicional"
                    hint={noPlan ? "só com plano" : `${brl(DASH_EXTRA_PRICE, { decimals: false })} cada, uma vez`}
                    value={noPlan ? 0 : state.dash}
                    max={MAX_EXTRA}
                    disabled={noPlan}
                    onChange={(dash) => update({ dash })}
                  />
                </div>
                <p className="mt-3 text-[12.5px] text-fg-2">Os extras mensais não têm desconto no anual.</p>
              </Step>
            </Reveal>

            <Reveal>
              <div className="mt-8 rounded-card bg-accent p-6 text-on-accent sm:p-8">
                <h3 className="display text-[clamp(2rem,4vw,2.8rem)]">Precisa de mais?</h3>
                <p className="mt-3 max-w-lg text-[16px] leading-relaxed">
                  Site institucional, bot de WhatsApp, tracking avulso, mais de 30 contas ou uma plataforma fora da lista. A gente monta com
                  você.
                </p>
                <a
                  href={waLink(MSG_SPECIALIST)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex h-12 items-center gap-2 rounded-control bg-on-accent px-6 font-semibold text-accent transition-[opacity,transform] duration-200 hover:opacity-90 active:scale-[0.98]"
                >
                  <WhatsAppIcon /> Falar com especialista
                </a>
              </div>
            </Reveal>
          </div>

          <div className="lg:sticky lg:top-24 lg:self-start">
            <Comanda ref={comandaRef} />
          </div>
        </div>
      </div>

      {/* celular: barra fixa com o total */}
      <AnimatePresence>
        {inSection && !comandaVisible && (
          <m.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: reduce ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-[var(--nav-bg)] backdrop-blur-md lg:hidden"
          >
            <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[12px] text-fg-2">{noPlan ? "Uma vez" : "Todo mês"}</p>
                <p className="text-xl leading-tight font-extrabold tracking-[-0.02em]">
                  {q.overLimit ? "Sob consulta" : <Odometer value={totalForBar} />}
                </p>
              </div>
              <button type="button" onClick={() => scrollToId("sua-conta")} className={btn.small}>
                Ver conta
              </button>
            </div>
          </m.div>
        )}
      </AnimatePresence>
      {toast.node}
    </section>
  );
}
