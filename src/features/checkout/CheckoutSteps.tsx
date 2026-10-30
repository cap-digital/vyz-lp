// Etapas da assinatura: dados → pagamento → pronto.

import { Check } from "lucide-react";

const STEPS = ["Seus dados", "Pagamento", "Pronto"] as const;

export function CheckoutSteps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol aria-label="Etapas da assinatura" className="flex flex-wrap items-center gap-x-2 gap-y-2 text-[13px]">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <li key={label} aria-current={active ? "step" : undefined} className="flex items-center gap-2">
            <span
              className={`inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold tnum ${
                done || active ? "bg-accent text-on-accent" : "border border-line text-fg-2"
              }`}
            >
              {done ? <Check size={13} strokeWidth={3} aria-hidden /> : n}
            </span>
            <span className={active ? "font-semibold text-fg" : done ? "text-fg" : "text-fg-2"}>
              {label}
              {done && <span className="sr-only"> (concluída)</span>}
            </span>
            {n < STEPS.length && <span aria-hidden className="mx-1 h-px w-5 bg-line sm:w-10" />}
          </li>
        );
      })}
    </ol>
  );
}
