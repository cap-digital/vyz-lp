"use client";

import { ArrowRight, Check, Copy, Link2 } from "lucide-react";
import { AnimatePresence, m, useAnimate, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode, type Ref } from "react";
import { Wordmark } from "@/components/brand/Wordmark";
import { Magnetic } from "@/components/motion/Magnetic";
import { Odometer } from "@/components/ui/Odometer";
import { buildOrder } from "@/features/checkout/order";
import { usePlan } from "@/features/marketing/state/PlanProvider";
import { simulationUrl } from "@/features/marketing/state/UrlSync";
import { btn } from "@/components/ui/styles";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { brl, ddmmyyyy } from "@/lib/format";
import { useHydrated } from "@/lib/hooks";
import { PERIOD_LABEL, PLAN_LABEL, PRO_TRACKING_VALUE, toQuery } from "@/features/pricing/pricing";
import { buildPlanMessage, buildSummary } from "@/features/pricing/messages";
import { MSG_SPECIALIST, waLink } from "@/lib/whatsapp";

const noop = () => () => {};
function useToday(): string {
  // data do navegador; no HTML pré-renderizado fica vazia (Cache Components)
  return useSyncExternalStore(noop, () => ddmmyyyy(new Date()), () => "");
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
}

/** Linha "impressa" no cupom: entra deslizando de cima e se recolhe ao sair. */
function PrintRow({ children, className = "" }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <m.div
      initial={reduce ? false : { opacity: 0, y: -10, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0, y: -4 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className={`overflow-hidden ${className}`}
    >
      {children}
    </m.div>
  );
}

function Row({ label, value, sub }: { label: ReactNode; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <span className="text-[14px] text-fg-2">{label}</span>
      <span className="text-right">
        <span className="font-semibold text-fg tnum">{value}</span>
        {sub && <span className="block text-[12px] text-fg-2">{sub}</span>}
      </span>
    </div>
  );
}

export function Comanda({ ref }: { ref?: Ref<HTMLElement> }) {
  const { state, quote: q, update } = usePlan();
  const hydrated = useHydrated();
  const today = useToday();
  const [copied, setCopied] = useState<"link" | "resumo" | null>(null);
  const [scope, animate] = useAnimate();
  const reduce = useReducedMotion();

  const noPlan = state.plano === "sem";
  const over = q.overLimit;
  const query = toQuery(state);
  const url = hydrated ? simulationUrl(query) : `/?${query}`;
  const message = hydrated ? buildPlanMessage(state, q, url) : MSG_SPECIALIST;
  // assinatura direta no checkout; acima de 30 contas ou mensal sem plano, o especialista
  const canSubscribe = !buildOrder(state).blocked;

  // o cupom desce um pouco quando uma linha nova é impressa
  const rows = q.lines.length + (q.oneTime > 0 ? 1 : 0);
  const prevRows = useRef(rows);
  useEffect(() => {
    if (rows > prevRows.current && scope.current && !reduce) {
      animate(scope.current, { y: [-6, 0] }, { duration: 0.35, ease: [0.22, 1, 0.36, 1] });
    }
    prevRows.current = rows;
  }, [rows, animate, scope, reduce]);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(null), 1800);
    return () => window.clearTimeout(t);
  }, [copied]);

  const headline = noPlan ? "Sem plano · só extras" : `Plano ${PLAN_LABEL[state.plano]} · ${PERIOD_LABEL[state.periodo]}`;
  const bigLabel = noPlan ? "Uma vez" : "Todo mês";
  const bigValue = noPlan ? brl(q.oneTime) : brl(q.monthly);
  const altMonthly = state.periodo === "mensal" ? q.monthlyAnual : q.monthlyMensal;

  return (
    <aside ref={ref} id="sua-conta" aria-labelledby="sua-conta-title" className="relative">
      <div ref={scope} className="receipt relative bg-bg px-5 pt-7 pb-8 text-fg sm:px-7">
        <div className="flex items-center justify-between">
          <h3 id="sua-conta-title" className="label-caps text-fg-2">
            Sua conta
          </h3>
          <Wordmark className="w-10 text-fg-2" decorative />
        </div>
        <p className="mt-2 text-[17px] font-semibold">{headline}</p>

        <div className="dotted mt-4 pt-4" aria-live="polite" aria-atomic="true">
          <p className="text-[13px] text-fg-2">{over ? "Todo mês" : bigLabel}</p>
          <div className="relative mt-1">
            {over ? (
              <>
                <p className="display text-[2.6rem] text-fg">Sob consulta</p>
                <span className="stamp absolute top-0 right-0 rotate-[-10deg] rounded-control border border-current px-2.5 py-1 text-[13px] font-bold tracking-[0.12em] text-error-fg uppercase">
                  Personalizado
                </span>
              </>
            ) : (
              <p className="text-[3rem] leading-none font-extrabold tracking-[-0.03em] sm:text-[3.4rem]">
                <Odometer value={bigValue} />
              </p>
            )}
          </div>
          {!noPlan && !over && q.extrasMonthly > 0 && (
            <p className="mt-2 text-[13px] text-fg-2 tnum">
              Plano {brl(q.planMonthly)} + extras {brl(q.extrasMonthly)}
            </p>
          )}
          {!noPlan && !over && (
            <div className="mt-2 text-[13px] text-fg-2">
              {state.periodo === "mensal" ? (
                <p className="flex flex-wrap items-center gap-x-2">
                  No anual sairia <strong className="text-fg tnum">{brl(altMonthly)}/mês</strong>
                  <button type="button" onClick={() => update({ periodo: "anual" })} className="font-semibold text-accent underline-offset-4 hover:underline">
                    Ver no anual
                  </button>
                </p>
              ) : (
                <p>
                  <span className="tnum">{brl(q.yearly)}</span> por ano · economia de{" "}
                  <strong className="text-accent tnum">{brl(q.annualSaving)}</strong>
                </p>
              )}
            </div>
          )}
        </div>

        {!over && (!noPlan || q.monthly > 0) && (
          <div className="dotted mt-4 pt-1">
            <AnimatePresence initial={false}>
              {noPlan && q.monthly > 0 && (
                <PrintRow key="month">
                  <Row label="Todo mês" value={brl(q.monthly)} />
                </PrintRow>
              )}
              {!noPlan && q.oneTime > 0 && (
                <PrintRow key="once">
                  <Row label="Uma vez" value={brl(q.oneTime)} />
                </PrintRow>
              )}
              <PrintRow key="12">
                <Row label="Em 12 meses" value={brl(q.twelveMonths)} />
              </PrintRow>
            </AnimatePresence>
          </div>
        )}

        {!over && (
          <details className="lines dotted group mt-3 pt-3">
            <summary className="flex list-none items-center justify-between text-[14px] font-medium text-fg">
              Ver linha por linha
              <span aria-hidden className="text-fg-2 transition-transform duration-200 group-open:rotate-45">
                +
              </span>
            </summary>
            <div className="pt-2">
              <AnimatePresence initial={false}>
                {q.lines.map((l) => (
                  <PrintRow key={l.id}>
                    <div className="flex items-baseline justify-between gap-3 py-1.5 text-[13px]">
                      <span className="min-w-0">
                        <span className="text-fg">{l.label}</span>
                        {l.detail && <span className="block text-[12px] text-fg-2">{l.detail}</span>}
                      </span>
                      <span className="shrink-0 font-medium tnum">
                        {l.kind === "included" ? (
                          <>
                            <s className="mr-1.5 text-fg-2">{brl(PRO_TRACKING_VALUE, { decimals: false })}</s>R$ 0,00
                          </>
                        ) : (
                          brl(l.amount)
                        )}
                        {l.kind === "monthly" && <span className="text-fg-2">/mês</span>}
                      </span>
                    </div>
                  </PrintRow>
                ))}
              </AnimatePresence>
              {q.lines.length === 0 && <p className="py-1.5 text-[13px] text-fg-2">Escolha um plano ou um extra.</p>}
            </div>
          </details>
        )}

        <div className="dotted mt-4 space-y-2 pt-5">
          {canSubscribe ? (
            <>
              <Magnetic className="w-full" strength={0.15}>
                <Link href={`/assinar?${query}`} className={`${btn.primary} w-full`}>
                  Assinar agora
                  <ArrowRight size={17} aria-hidden />
                </Link>
              </Magnetic>
              <a href={waLink(message)} target="_blank" rel="noopener noreferrer" className={`${btn.secondary} h-11 w-full px-3 text-sm`}>
                <WhatsAppIcon />
                Enviar no WhatsApp
              </a>
            </>
          ) : (
            <Magnetic className="w-full" strength={0.15}>
              <a href={waLink(message)} target="_blank" rel="noopener noreferrer" className={`${btn.primary} w-full`}>
                <WhatsAppIcon />
                {over ? "Falar com especialista" : "Enviar no WhatsApp"}
              </a>
            </Magnetic>
          )}
          <div className="grid grid-cols-2 gap-2">
            <CopyButton
              done={copied === "link"}
              icon={<Link2 size={16} aria-hidden />}
              label="Copiar link"
              onClick={async () => {
                await copyText(simulationUrl(query));
                setCopied("link");
              }}
            />
            <CopyButton
              done={copied === "resumo"}
              icon={<Copy size={16} aria-hidden />}
              label="Copiar resumo"
              onClick={async () => {
                await copyText(buildSummary(state, q, simulationUrl(query), today));
                setCopied("resumo");
              }}
            />
          </div>
        </div>

        <p className="mt-5 text-center text-[12px] text-fg-2 tnum">
          Simulação · não é cobrança{today ? ` · ${today}` : ""}
        </p>
      </div>
    </aside>
  );
}

function CopyButton({ done, icon, label, onClick }: { done: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`${btn.secondary} relative h-11 overflow-hidden px-3 text-sm`}>
      <span className="sr-only" aria-live="polite">
        {done ? "Copiado" : ""}
      </span>
      <AnimatePresence mode="wait" initial={false}>
        <m.span
          key={done ? "ok" : "idle"}
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -12, opacity: 0 }}
          transition={{ duration: 0.18 }}
          className={`inline-flex items-center gap-1.5 ${done ? "text-accent" : ""}`}
          aria-hidden
        >
          {done ? <Check size={16} /> : icon}
          {done ? "Copiado" : label}
        </m.span>
      </AnimatePresence>
      <span className="sr-only">{label}</span>
    </button>
  );
}
