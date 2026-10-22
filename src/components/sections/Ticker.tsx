"use client";

import { useInView } from "motion/react";
import { Fragment, useRef } from "react";

type Item = { label: string; value: string; delta?: string; good?: boolean };

const ITEMS: Item[] = [
  { label: "CPA", value: "R$ 61,20", delta: "▼ 8,2%", good: true },
  { label: "ROAS", value: "3,1" },
  { label: "CTR", value: "1,7%" },
  { label: "CPL qualificado", value: "R$ 64,20", delta: "▼ R$ 8,10", good: true },
  { label: "Vendas confirmadas", value: "812" },
  { label: "Receita", value: "R$ 48.320" },
  { label: "Leads qualificados", value: "1.248" },
  { label: "Visitas agendadas", value: "302", delta: "▲ 12%", good: true },
  { label: "CPM", value: "R$ 18,40" },
  { label: "Frequência", value: "1,9" },
  { label: "Checkout", value: "27%" },
  { label: "Janela", value: "7d clique · 1d view" },
];

function Row() {
  return (
    <>
      {ITEMS.map((it) => (
        <Fragment key={it.label}>
          <span className="inline-flex items-baseline gap-2 px-5">
            <span className="text-fg-2">{it.label}</span>
            <span className="font-semibold text-fg">{it.value}</span>
            {it.delta && <span className={it.good ? "text-accent" : "text-error"}>{it.delta}</span>}
          </span>
          <span className="text-line" aria-hidden>
            ·
          </span>
        </Fragment>
      ))}
    </>
  );
}

/** Faixa de transição: métricas fictícias em loop, como terminal de mercado. */
export function Ticker() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);

  function speed(rate: number) {
    ref.current?.querySelector(".ticker-track")?.getAnimations().forEach((a) => (a.playbackRate = rate));
  }

  return (
    <div
      ref={ref}
      className="ticker relative overflow-hidden border-y border-line bg-card py-3.5"
      data-paused={inView ? undefined : ""}
      onPointerEnter={() => speed(0.25)}
      onPointerLeave={() => speed(1)}
    >
      <p className="sr-only">
        Exemplo de métricas fictícias: CPA de R$ 61,20 caindo 8,2%, ROAS 3,1, CTR 1,7%, CPL qualificado de R$ 64,20 caindo R$ 8,10 e 812
        vendas confirmadas.
      </p>
      <div className="ticker-track label-caps text-[13px] tnum" aria-hidden>
        <Row />
        <Row />
      </div>
    </div>
  );
}
