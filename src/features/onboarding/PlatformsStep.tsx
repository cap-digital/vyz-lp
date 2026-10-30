"use client";

// Passo 2: plataformas. Meta Ads e Google Ads conectam por login; as outras
// aparecem com o motivo (em breve ou de um plano acima).

import { Check } from "lucide-react";
import { useState } from "react";
import { LockBadge } from "@/components/ui/kit";
import { PLATFORMS } from "@/features/accounts/platforms";
import type { ProviderId } from "@/features/integrations/providers";
import type { Tier } from "@/features/pricing/entitlements";
import { choosePlatforms } from "@/server/onboarding/actions";
import { platformOptions } from "./steps";
import { ChoiceCard, StepFooter, StepHeader, useStepAction } from "./ui";

const DETAIL: Partial<Record<string, string>> = {
  meta: "Facebook e Instagram: compras, funil, criativos e público.",
  google: "Pesquisa, Shopping, Performance Max e YouTube: termos e produtos.",
};

export function PlatformsStep({ initial, tier }: { initial: ProviderId[]; tier: Tier | null }) {
  const options = platformOptions(tier);
  const [chosen, setChosen] = useState<string[]>(initial);
  const { pending, error, run } = useStepAction();

  const toggle = (id: string) => setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  const ready = options.filter((o) => o.available);
  const later = options.filter((o) => !o.available);

  return (
    <section aria-labelledby="passo-titulo">
      <StepHeader
        eyebrow="Passo 2 · Plataformas"
        title="Onde estão os anúncios?"
        text="Marque as plataformas que você vai conectar agora. Dá para mudar depois, em Contas."
      />

      <div role="group" aria-labelledby="passo-titulo" className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ready.map((o) => {
          const selected = chosen.includes(o.id);
          return (
            <ChoiceCard key={o.id} selected={selected} onToggle={() => toggle(o.id)}>
              <span className="flex w-full items-center justify-between gap-3">
                <span className="inline-flex h-10 min-w-10 items-center justify-center rounded-control bg-accent-soft px-2.5 text-[13px] font-bold text-fg" aria-hidden>
                  {PLATFORMS[o.id].short}
                </span>
                <span
                  aria-hidden
                  className={`inline-flex size-6 items-center justify-center rounded-full border-[1.5px] transition-colors duration-200 ${selected ? "border-accent bg-accent text-on-accent" : "border-fg-2/60"}`}
                >
                  {selected && <Check size={14} strokeWidth={3} />}
                </span>
              </span>
              <span>
                <span className="block text-[17px] font-semibold text-fg">{o.name}</span>
                <span className="mt-1 block text-[13.5px] leading-snug text-fg-2">{DETAIL[o.id]}</span>
              </span>
            </ChoiceCard>
          );
        })}
      </div>

      {later.length > 0 && (
        <div className="mt-8">
          <h2 className="text-[13px] font-medium text-fg-2">Mais plataformas</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {later.map((o) => (
              <li key={o.id} className="inline-flex items-center gap-2 rounded-chip border border-dashed border-line px-3 py-1.5 text-[13px] text-fg-2">
                {o.name}
                {o.reason === "Em breve" ? <span className="text-[11.5px]">· em breve</span> : <LockBadge label={o.reason ?? ""} />}
              </li>
            ))}
          </ul>
        </div>
      )}

      <StepFooter back="business" pending={pending} error={error} disabled={chosen.length === 0} onContinue={() => run(() => choosePlatforms(chosen))} />
    </section>
  );
}
