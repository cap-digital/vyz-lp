"use client";

// Passo 4: o dashboard. Templates com dados reais que servem ao negócio e às
// plataformas com conta ativa, prévia com dados de exemplo, nome, cliente e
// metas opcionais. Criar conclui o onboarding e abre o primeiro dashboard.

import { Check, Lock } from "lucide-react";
import { useMemo, useState } from "react";
import { TextField } from "@/components/ui/kit";
import { Segmented } from "@/components/ui/Segmented";
import { LiveDashboardPreview } from "@/features/analytics/LiveDashboardPreview";
import { PROVIDERS, type ProviderId } from "@/features/integrations/providers";
import type { ConnectState } from "@/features/integrations/types";
import type { Tier } from "@/features/pricing/entitlements";
import { createOnboardingDashboards, finishOnboarding } from "@/server/onboarding/actions";
import { allowedPages, centsFromReais, marginFromPercent, templatePages, templateProvider, templatesFor } from "./steps";
import { ChoiceCard, StepFooter, StepHeader, useStepAction } from "./ui";

type DashboardStepProps = {
  businessTypeId: string | null;
  platforms: ProviderId[];
  state: ConnectState;
  pagesTier: Tier | null;
  dashboardsLeft: number;
  workspaceName: string;
};

export function DashboardStep({ businessTypeId, platforms, state, pagesTier, dashboardsLeft, workspaceName }: DashboardStepProps) {
  const templates = useMemo(() => templatesFor(businessTypeId, platforms), [businessTypeId, platforms]);
  const enabledOf = (id: string) => {
    const p = templates.find((t) => t.id === id);
    const provider = p && templateProvider(p);
    return provider ? state.platforms[provider].enabledCount : 0;
  };
  const ready = templates.filter((t) => enabledOf(t.id) > 0);

  const [chosen, setChosen] = useState<string[]>(() => ready.slice(0, Math.max(1, dashboardsLeft)).map((t) => t.id));
  const [names, setNames] = useState<Record<string, string>>(() => Object.fromEntries(templates.map((t) => [t.id, t.name])));
  const [clientName, setClientName] = useState(workspaceName);
  const [margin, setMargin] = useState("");
  const [goal, setGoal] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(ready[0]?.id ?? null);
  const { pending, error, setError, run } = useStepAction();
  const skip = useStepAction();

  const marginValue = marginFromPercent(margin);
  const goalValue = centsFromReais(goal);
  const shown = templates.find((t) => t.id === (previewId && chosen.includes(previewId) ? previewId : chosen[0])) ?? ready[0];
  const overLimit = chosen.length > dashboardsLeft;

  function toggle(id: string) {
    setError(null);
    setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
    setPreviewId(id);
  }

  function submit() {
    if (marginValue === "invalid") return setError("A margem vai de 1% a 100%.");
    if (goalValue === "invalid") return setError("Confira a meta de custo por compra.");
    const list = templates.filter((t) => chosen.includes(t.id)).map((t) => ({ templateId: t.id, name: (names[t.id] ?? "").trim() || t.name }));
    run(() => createOnboardingDashboards({ dashboards: list, clientName: clientName.trim(), margin: marginValue, goalCents: goalValue }));
  }

  return (
    <section aria-labelledby="passo-titulo">
      <StepHeader
        eyebrow="Passo 4 · Dashboard"
        title="Escolha o dashboard"
        text="Ele nasce com os números das contas que você ativou. Páginas, metas e contas podem mudar depois."
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-6">
          <div role="group" aria-label="Dashboards" className="space-y-3">
            {templates.length === 0 && <p className="rounded-card border border-dashed border-line p-4 text-[14px] text-fg-2">Nenhum dashboard serve a estas plataformas ainda.</p>}
            {templates.map((t) => {
              const provider = templateProvider(t);
              const accounts = enabledOf(t.id);
              const selected = chosen.includes(t.id);
              const disabled = accounts === 0;
              return (
                <ChoiceCard key={t.id} selected={selected} disabled={disabled} onToggle={() => toggle(t.id)}>
                  <span className="flex w-full items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block text-[16px] font-semibold text-fg">{t.name}</span>
                      <span className="mt-1 block text-[13px] leading-snug text-fg-2">{t.description}</span>
                    </span>
                    <span
                      aria-hidden
                      className={`inline-flex size-6 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors duration-200 ${selected ? "border-accent bg-accent text-on-accent" : "border-fg-2/60"}`}
                    >
                      {selected && <Check size={14} strokeWidth={3} />}
                    </span>
                  </span>
                  <span className="flex flex-wrap gap-1.5">
                    {templatePages(t, pagesTier).map((p) => (
                      <span
                        key={p.id}
                        title={p.lockLabel ?? undefined}
                        className={`inline-flex items-center gap-1 rounded-chip px-2 py-0.5 text-[11.5px] ${p.allowed ? "bg-accent-soft text-fg" : "border border-dashed border-line text-fg-2"}`}
                      >
                        {!p.allowed && <Lock size={10} aria-hidden />}
                        {p.name}
                        {!p.allowed && <span className="sr-only"> ({p.lockLabel})</span>}
                      </span>
                    ))}
                  </span>
                  <span className="text-[12.5px] text-fg-2">
                    {disabled && provider
                      ? `Ative uma conta do ${PROVIDERS[provider].name} no passo anterior.`
                      : `${accounts} ${accounts === 1 ? "conta ativa" : "contas ativas"}${provider ? ` do ${PROVIDERS[provider].name}` : ""}`}
                  </span>
                </ChoiceCard>
              );
            })}
          </div>

          {chosen.length > 0 && (
            <div className="space-y-4 rounded-card border border-line bg-card p-4 sm:p-5">
              <TextField label="Cliente" value={clientName} onChange={setClientName} placeholder="Ex.: Loja Exemplo" hint="Aparece no topo do dashboard e nos links." />
              {templates
                .filter((t) => chosen.includes(t.id))
                .map((t) => (
                  <TextField
                    key={t.id}
                    label={chosen.length > 1 ? `Nome · ${t.name}` : "Nome do dashboard"}
                    value={names[t.id] ?? ""}
                    onChange={(v) => setNames((n) => ({ ...n, [t.id]: v }))}
                    placeholder={t.name}
                  />
                ))}
              <div className="grid gap-4 min-[420px]:grid-cols-2">
                <TextField
                  label="Margem (opcional)"
                  value={margin}
                  onChange={setMargin}
                  inputMode="decimal"
                  suffix="%"
                  placeholder="40"
                  error={marginValue === "invalid" ? "De 1% a 100%." : null}
                  hint={typeof marginValue === "number" ? `ROAS de equilíbrio: ${(1 / marginValue).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}` : "Mostra o ROAS de equilíbrio."}
                />
                <TextField
                  label="Meta de custo por compra (opcional)"
                  value={goal}
                  onChange={setGoal}
                  inputMode="decimal"
                  prefix="R$"
                  placeholder="45,00"
                  error={goalValue === "invalid" ? "Confira o valor." : null}
                />
              </div>
            </div>
          )}
          {overLimit && (
            <p className="text-[13.5px] text-error-fg">
              Seu plano tem espaço para {dashboardsLeft} {dashboardsLeft === 1 ? "dashboard" : "dashboards"}. Desmarque {chosen.length - dashboardsLeft === 1 ? "um" : "alguns"}.
            </p>
          )}
        </div>

        <div className="min-w-0 lg:sticky lg:top-4">
          {shown ? (
            <figure className="overflow-hidden rounded-[20px] border border-line bg-bg">
              <figcaption className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-card px-4 py-2.5 text-[13px] text-fg-2">
                <span>Prévia com dados de exemplo</span>
                {chosen.length > 1 && (
                  <Segmented
                    size="sm"
                    label="Prévia"
                    value={shown.id}
                    onChange={setPreviewId}
                    options={templates.filter((t) => chosen.includes(t.id)).map((t) => ({ value: t.id, label: t.sources[0] === "google" ? "Google Ads" : "Meta Ads" }))}
                  />
                )}
              </figcaption>
              <div className="max-h-[70dvh] overflow-y-auto p-3 sm:p-4">
                <LiveDashboardPreview
                  key={shown.id}
                  templateId={shown.id}
                  pageIds={allowedPages(shown, pagesTier)}
                  name={names[shown.id]}
                  clientName={clientName}
                  margin={typeof marginValue === "number" ? marginValue : undefined}
                />
              </div>
            </figure>
          ) : (
            <div className="rounded-[20px] border border-dashed border-line p-8 text-center text-[14px] text-fg-2">Ative uma conta no passo anterior para ver a prévia.</div>
          )}
        </div>
      </div>

      <StepFooter
        back="connect"
        pending={pending}
        error={error ?? skip.error}
        disabled={chosen.length === 0 || overLimit || skip.pending}
        continueLabel={chosen.length > 1 ? "Criar os dashboards" : "Criar o dashboard"}
        pendingLabel="Criando…"
        onContinue={submit}
        aside={
          <button
            type="button"
            onClick={() => skip.run(finishOnboarding)}
            disabled={pending || skip.pending}
            className="inline-flex h-10 items-center px-3 text-[14px] font-semibold text-fg-2 underline-offset-4 hover:text-fg hover:underline"
          >
            {skip.pending ? "Abrindo o painel…" : "Criar depois"}
          </button>
        }
      />
    </section>
  );
}
