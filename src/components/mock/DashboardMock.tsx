"use client";

import { useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Wordmark } from "@/components/brand/Wordmark";
import { Odometer, zeroed } from "@/components/motion/Odometer";
import { brl, brlCompact, decimal, int, pct } from "@/lib/format";
import { liveJitter, type EcommerceData, type ImobData } from "@/lib/mock-data";
import { CpvChart } from "./charts/CpvChart";
import { Funnel } from "./charts/Funnel";
import { Scatter } from "./charts/Scatter";

type DashboardMockProps = {
  data: EcommerceData | ImobData;
  name: string;
  /** Monta peça por peça (depois de "Gerar" ou da intro). */
  assemble: boolean;
  /** Vira "ao vivo" depois de montado e varia um KPI a cada ~5 s. */
  live?: boolean;
  seed: number;
  introTarget?: boolean;
};

const NAV = ["Dashboards", "Landing pages", "Contas conectadas", "Relatórios"];
const ASSEMBLE_MS = 1900;

function Kpi({
  label,
  value,
  sub,
  strong,
  delay,
}: {
  label: string;
  value: string;
  sub: ReactNode;
  strong?: boolean;
  delay: number;
}) {
  return (
    <div
      className={`m-in min-w-0 rounded-[9px] border p-2.5 ${strong ? "border-transparent bg-accent text-on-accent" : "border-line bg-card"}`}
      style={{ "--d": `${delay}ms` } as CSSProperties}
    >
      <p className={`line-clamp-2 min-h-[2.3em] text-[9px] leading-[1.15] font-medium tracking-[0.08em] uppercase ${strong ? "" : "text-fg-2"}`}>
        {label}
      </p>
      <p className={`mt-1 leading-none font-bold tracking-[-0.02em] ${value.length > 10 ? "text-[15px] @[560px]:text-[16px]" : "text-[17px] @[560px]:text-[19px]"}`}>
        <Odometer value={value} />
      </p>
      <p className={`mt-1.5 text-[10px] leading-tight ${strong ? "" : "text-fg-2"}`}>{sub}</p>
    </div>
  );
}

function Delta({ good, children }: { good: boolean; children: ReactNode }) {
  return <span className={`font-semibold ${good ? "text-accent" : "text-error-fg"}`}>{children}</span>;
}

export function DashboardMock({ data, name, assemble, live = false, seed, introTarget }: DashboardMockProps) {
  const reduce = useReducedMotion();
  const animate = assemble && !reduce;
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "0px 0px -10% 0px" });

  // nome digitado letra por letra
  const [typed, setTyped] = useState(animate ? 0 : name.length);
  // números começam zerados e rolam até o valor
  const [counting, setCounting] = useState(!animate);
  const [isLive, setIsLive] = useState(false);
  const [factors, setFactors] = useState([1, 1, 1]);
  const tick = useRef(0);

  useEffect(() => {
    if (!animate) return;
    const t1 = window.setTimeout(() => setCounting(true), 380);
    let n = 0;
    const iv = window.setInterval(() => {
      n += 1;
      setTyped(n);
      if (n >= name.length) window.clearInterval(iv);
    }, 42);
    return () => {
      window.clearTimeout(t1);
      window.clearInterval(iv);
    };
  }, [animate, name]);

  useEffect(() => {
    if (!live || reduce) return;
    const t = window.setTimeout(() => setIsLive(true), animate ? ASSEMBLE_MS : 600);
    return () => window.clearTimeout(t);
  }, [live, reduce, animate]);

  useEffect(() => {
    if (!isLive || !inView) return;
    const iv = window.setInterval(() => {
      tick.current += 1;
      const { kpi, factor } = liveJitter(seed, tick.current);
      setFactors((f) => f.map((v, i) => (i === kpi ? Math.min(1.05, Math.max(0.95, v * factor)) : v)));
    }, 5000);
    return () => window.clearInterval(iv);
  }, [isLive, inView, seed]);

  const show = (v: string) => (counting ? v : zeroed(v));
  const shownName = name.slice(0, typed);

  const header =
    data.kind === "ecommerce"
      ? { title: "Visão geral", sources: "Meta Ads + Google Ads + GA4" }
      : { title: "Leads", sources: "Meta Ads + Google Ads + CRM" };

  return (
    <div ref={ref} className="@container relative" data-anim={animate ? "on" : "off"}>
      <div className="scanner" aria-hidden />
      <div className="m-unveil flex min-h-[340px] text-fg">
        <aside className="m-side hidden w-[124px] shrink-0 flex-col border-r border-line p-3 @[540px]:flex" aria-hidden>
          <Wordmark className="w-12 text-accent" decorative />
          <ul className="mt-5 space-y-0.5 text-[10px] whitespace-nowrap">
            {NAV.map((n, i) => (
              <li key={n} className={`rounded-[6px] px-2 py-1.5 ${i === 0 ? "bg-accent-soft font-semibold text-fg" : "text-fg-2"}`}>
                {n}
              </li>
            ))}
            <li className="px-2 py-1.5 text-fg-2 opacity-60">
              Automações
              <span className="mt-0.5 block w-fit rounded-chip bg-accent-soft px-1.5 text-[8px] text-fg">em breve</span>
            </li>
          </ul>
          <div className="mt-auto rounded-[8px] border border-line bg-card p-2">
            <p className="truncate text-[10px] font-semibold">{name}</p>
            <p className="text-[9px] text-fg-2">Pro · 4 projetos</p>
          </div>
        </aside>

        <div className="min-w-0 flex-1 p-3">
          <div className="m-in" style={{ "--d": "80ms" } as CSSProperties}>
            <p className="truncate text-[15px] font-bold tracking-[-0.02em]">
              <span>{shownName}</span>
              {typed < name.length && <span className="caret" aria-hidden />}
              <span> · {header.title}</span>
            </p>
            <p className="flex items-center gap-1.5 text-[10.5px] text-fg-2">
              <span className="truncate">{header.sources} ·</span>
              {isLive ? (
                <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-accent">
                  <span className="live-dot" aria-hidden /> ao vivo
                </span>
              ) : (
                <span className="shrink-0">atualizado há 4 min</span>
              )}
            </p>
          </div>

          {data.kind === "ecommerce" ? (
            <EcommerceBody data={data} show={show} factors={factors} introTarget={introTarget} />
          ) : (
            <ImobBody data={data} show={show} factors={factors} />
          )}
        </div>
      </div>
    </div>
  );
}

type BodyProps<T> = { data: T; show: (v: string) => string; factors: number[] };

function EcommerceBody({ data, show, factors, introTarget }: BodyProps<EcommerceData> & { introTarget?: boolean }) {
  const cpv = data.cpv * factors[0];
  const sales = Math.round(data.sales * factors[1]);
  const revenue = data.revenue * factors[2];
  return (
    <>
      <div className="mt-3 grid grid-cols-2 gap-2 @[440px]:grid-cols-4">
        <Kpi
          label="Custo por venda"
          value={show(brl(cpv))}
          sub={<Delta good={data.cpvDelta < 0}>{data.cpvDelta < 0 ? "▼" : "▲"} {pct(Math.abs(data.cpvDelta))}</Delta>}
          delay={200}
        />
        <Kpi label="Vendas confirmadas" value={show(int(sales))} sub={`Meta ${int(data.salesMeta)} · Google ${int(data.salesGoogle)}`} delay={270} />
        <Kpi
          label="Receita"
          value={show(brl(revenue, { decimals: false }))}
          sub={
            <Delta good={data.revenueDelta >= 0}>
              {data.revenueDelta >= 0 ? "▲" : "▼"} {pct(Math.abs(data.revenueDelta))} vs 4 sem.
            </Delta>
          }
          delay={340}
        />
        <Kpi label="ROAS geral" value={show(decimal(data.roas))} sub={`Equilíbrio ${decimal(data.breakEven)}`} strong delay={410} />
      </div>
      <div className="mt-2 grid gap-2 @[440px]:grid-cols-[1.55fr_1fr]">
        <div className="m-in rounded-[9px] border border-line bg-card p-2.5" style={{ "--d": "440ms" } as CSSProperties}>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[11px] font-semibold">Custo por venda · média móvel 7 dias</p>
          </div>
          <div className="mt-1.5">
            <CpvChart daily={data.daily} avg={data.avg} goal={data.goal} maturingDays={data.maturingDays} introTarget={introTarget} />
          </div>
        </div>
        <div className="m-in rounded-[9px] border border-line bg-card p-2.5" style={{ "--d": "500ms" } as CSSProperties}>
          <p className="mb-2 text-[11px] font-semibold">Onde o cliente desiste</p>
          <Funnel steps={data.funnel} title="Funil de compra" />
        </div>
      </div>
    </>
  );
}

function ImobBody({ data, show, factors }: BodyProps<ImobData>) {
  const cpl = data.cpl * factors[0];
  const qualified = Math.round(data.qualified * factors[1]);
  const visits = Math.round(data.visits * factors[2]);
  return (
    <>
      <div className="mt-3 grid grid-cols-2 gap-2 @[440px]:grid-cols-4">
        <Kpi
          label="Custo por lead qualificado"
          value={show(brl(cpl))}
          sub={
            <Delta good={data.cplDelta < 0}>
              {data.cplDelta < 0 ? "▼" : "▲"} {brl(Math.abs(data.cplDelta))} vs mês anterior
            </Delta>
          }
          delay={200}
        />
        <Kpi label="Leads qualificados" value={show(int(qualified))} sub={`de ${int(data.leads)} leads`} delay={270} />
        <Kpi label="Visitas agendadas" value={show(int(visits))} sub={<Delta good>▲ {pct(data.visitsDelta, 0)}</Delta>} delay={340} />
        <Kpi label="Investimento" value={show(brlCompact(data.invest))} sub={`${pct(data.budgetShare, 0)} da verba do mês`} strong delay={410} />
      </div>
      <div className="mt-2 grid gap-2 @[440px]:grid-cols-[1.55fr_1fr]">
        <div className="m-in rounded-[9px] border border-line bg-card p-2.5" style={{ "--d": "440ms" } as CSSProperties}>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[11px] font-semibold">Investimento × custo por lead</p>
            <p className="text-[9.5px] text-fg-2">1 ponto = 1 empreendimento</p>
          </div>
          <div className="mt-1.5">
            <Scatter projects={data.projects} />
          </div>
        </div>
        <div className="m-in rounded-[9px] border border-line bg-card p-2.5" style={{ "--d": "500ms" } as CSSProperties}>
          <p className="mb-2 text-[11px] font-semibold">Lead → visita → proposta</p>
          <Funnel steps={data.funnel} title="Funil comercial" />
        </div>
      </div>
    </>
  );
}
