"use client";

import { LocateFixed } from "lucide-react";
import type { ReactNode } from "react";
import type { AgentAnswer, AgentTarget } from "./engine";

/** Texto com **negrito** (só essa marcação). */
export function RichText({ text }: { text: string }): ReactNode {
  const parts = text.split(/(\*\*[^*]*\*\*?)/g);
  return parts.map((p, i) =>
    p.startsWith("**") ? (
      <strong key={i} className="font-semibold text-fg tnum">
        {p.replace(/\*/g, "")}
      </strong>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

/** KPI + variação + mini barras, e o "Mostrar no painel" quando o card existe. */
export function AnswerCard({ answer, onShow }: { answer: AgentAnswer; onShow: (t: AgentTarget) => void }) {
  // o alvo só vem quando o dashboard está no contexto do servidor e tem o card
  const { card, chart, target } = answer;
  if (!card && !chart) return null;
  const max = chart ? Math.max(...chart.items.map((i) => i.value)) || 1 : 1;
  return (
    <div className="mt-2.5 rounded-card border border-line bg-bg p-3">
      {card && (
        <div>
          <div className="flex items-start justify-between gap-2">
            <p className="text-[11px] font-medium tracking-[0.06em] text-fg-2 uppercase">{card.label}</p>
            {card.hint && <span className="shrink-0 rounded-chip border border-line px-2 py-px text-[11px] text-fg-2">{card.hint}</span>}
          </div>
          <p className="mt-1 text-[22px] leading-none font-bold tracking-[-0.02em] tnum">{card.value}</p>
          {card.delta && (
            <p className={`mt-1.5 text-[12px] font-medium tnum ${card.delta.good === null ? "text-fg-2" : card.delta.good ? "text-accent" : "text-error-fg"}`}>{card.delta.text}</p>
          )}
          {card.note && <p className="mt-1.5 text-[12px] text-fg-2">{card.note}</p>}
        </div>
      )}
      {chart && (
        <div className={card ? "mt-3 border-t border-line pt-3" : ""} role="img" aria-label={`${chart.title}: ${chart.items.map((i) => `${i.label} ${i.display}`).join(", ")}`}>
          <p className="mb-2 text-[11px] font-medium text-fg-2" aria-hidden>
            {chart.title}
          </p>
          <ul className="space-y-1.5" aria-hidden>
            {chart.items.slice(0, 6).map((it, i) => (
              <li key={it.label} className="grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-2 text-[12px]">
                <span className="truncate text-fg-2">{it.label}</span>
                <span className="h-2.5">
                  <span className="block h-full rounded-[2px]" style={{ width: `${Math.max(3, (it.value / max) * 100)}%`, background: i === 0 ? "var(--accent)" : "var(--seq-c)" }} />
                </span>
                <span className="font-semibold tnum">{it.display}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {target && (
        <button type="button" onClick={() => onShow(target)} className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-control border border-line px-2.5 text-[12.5px] font-medium text-fg outline-none hover:border-accent hover:text-accent focus-visible:ring-2 focus-visible:ring-accent">
          <LocateFixed size={14} aria-hidden /> Mostrar no painel
        </button>
      )}
    </div>
  );
}
