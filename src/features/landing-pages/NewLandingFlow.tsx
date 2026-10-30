"use client";

import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { PendingChip } from "@/components/ui/kit";
import { btn } from "@/components/ui/styles";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { TIER_LABEL } from "@/features/pricing/entitlements";
import { landingDefaults, landingTemplate } from "@/features/templates/landing-pages";
import type { LandingDraft } from "@/features/workspace/types";
import { useWorkspace } from "@/features/workspace/workspace";
import { useDoc } from "@/lib/store/hooks";
import { store } from "@/lib/store/store";
import { msgUpgrade, waLink } from "@/lib/whatsapp";
import { createLandingPage } from "@/server/landing-pages/actions";
import { ContentFields, LandingPreview, SlugField, TrackingFields, trackingValid, useHideBadge } from "./editor";
import { LandingGallery } from "./LandingGallery";
import { EMPTY_TRACKING, slugFromBrand, slugIssue } from "./model";

const STEPS = ["Template", "Conteúdo", "Rastreamento", "Publicar"];

function Steps({ step, max, onGo }: { step: number; max: number; onGo: (s: number) => void }) {
  return (
    <ol className="flex gap-1 overflow-x-auto pb-1" aria-label="Passos">
      {STEPS.map((label, i) => {
        const n = i + 1;
        return (
          <li key={label} className="min-w-[2.5rem] flex-1 sm:min-w-[7rem]">
            <button type="button" disabled={n > max} onClick={() => onGo(n)} aria-current={n === step ? "step" : undefined} className="flex w-full flex-col gap-1.5 text-left">
              <span className={`h-[var(--cut)] w-full rounded-full ${n <= step ? "bg-accent" : "bg-line"}`} />
              <span className={`flex items-center gap-1.5 text-[12.5px] ${n === step ? "font-semibold" : n < step ? "" : "text-fg-2"}`}>
                <span className="tnum">{String(n).padStart(2, "0")}</span> <span className={n === step ? "" : "hidden sm:inline"}>{label}</span>
                {n < step && <Check size={13} aria-hidden className="text-accent" />}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function Split({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="rounded-card border border-line bg-card p-5">{left}</div>
      <div className="lg:sticky lg:top-20 lg:self-start">{right}</div>
    </div>
  );
}

/**
 * Fluxo "Nova landing page". O rascunho fica neste navegador a cada passo; no
 * último, a página é criada no servidor (e publicada, se o plano deixar) e
 * segue para o editor.
 */
export function NewLandingFlow({ publishedCount, limit }: { publishedCount: number; limit: number }) {
  const router = useRouter();
  const params = useSearchParams();
  const { ws } = useWorkspace();
  const hideBadge = useHideBadge();
  const saved = useDoc<LandingDraft>("draft:landing");
  const [error, setError] = useState<{ text: string; slug?: string } | null>(null);
  const [creating, startCreate] = useTransition();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    if (params.get("novo")) store.setDoc<LandingDraft>("draft:landing", { step: 1 });
  }, [params]);

  const draft: LandingDraft = saved ?? { step: 1 };
  const save = (patch: Partial<LandingDraft>) => store.setDoc("draft:landing", { ...(store.getDoc<LandingDraft>("draft:landing") ?? { step: 1 }), ...patch });
  const t = draft.templateId ? landingTemplate(draft.templateId) : undefined;
  const step = t && draft.content ? draft.step : 1;
  const content = draft.content;
  const tracking = draft.tracking ?? EMPTY_TRACKING;
  const slug = draft.slug ?? "";
  const atLimit = publishedCount >= limit;
  const slugError = slug ? slugIssue(slug) : "Escolha um endereço.";

  function create(publish: boolean) {
    if (!t || !content) return;
    setError(null);
    startCreate(async () => {
      const { logo, ...rest } = content;
      const r = await createLandingPage({ templateId: t.id, content: rest, tracking, slug, publish, logoDataUrl: logo?.startsWith("data:") ? logo : undefined });
      if (!r.ok) {
        setError({ text: r.error.message, slug: r.error.code === "landing:slug_taken" ? r.error.fields?.slug || undefined : undefined });
        return;
      }
      store.setDoc("draft:landing", null);
      // O editor explica o que não deu certo (publicação recusada pelo plano, logo).
      const notes = new URLSearchParams();
      if (r.data.publishError) notes.set("aviso", r.data.publishError.code === "limit:landing_pages" ? "limite" : "rascunho");
      if (r.data.logoError) notes.set("logo", "falhou");
      router.push(`/painel/landing-pages/${r.data.id}${notes.size ? `?${notes}` : ""}`);
    });
  }

  return (
    <div className="space-y-6">
      <Steps step={step} max={t ? 4 : 1} onGo={(s) => save({ step: s })} />

      {step === 1 && (
        <LandingGallery
          onUse={(id) => {
            const tt = landingTemplate(id)!;
            const c = landingDefaults(tt, ws.name || "Sua marca");
            save({ templateId: id, content: c, tracking: EMPTY_TRACKING, slug: slugFromBrand(c.brand), step: 2 });
          }}
        />
      )}

      {t && content && step === 2 && <Split left={<ContentFields t={t} value={content} onChange={(c) => save({ content: c })} />} right={<LandingPreview t={t} content={content} hideBadge={hideBadge} />} />}

      {t && content && step === 3 && (
        <Split
          left={
            <div className="space-y-3">
              <h2 className="title text-lg">Rastreamento</h2>
              <p className="text-[14px] text-fg-2">Cole os IDs. A página sai com o GTM e as tags base configurados.</p>
              <TrackingFields value={tracking} onChange={(v) => save({ tracking: v })} />
            </div>
          }
          right={<LandingPreview t={t} content={content} hideBadge={hideBadge} />}
        />
      )}

      {t && content && step === 4 && (
        <Split
          left={
            <div className="space-y-4">
              <h2 className="title text-lg">Publicar</h2>
              <SlugField value={slug} onChange={(v) => save({ slug: v })} error={slug && slugError ? slugError : null} />
              {error?.slug && (
                <button type="button" className={`${btn.ghost} h-8 px-2 text-[13px]`} onClick={() => save({ slug: error.slug })}>
                  Usar {error.slug}
                </button>
              )}
              <PendingChip label="Subdomínio em breve" detail={`A página fica em /p/${slug || "sua-marca"}. Com a hospedagem, ela vai para ${slug || "sua-marca"}.vyz.app.`} />
              {atLimit ? (
                <div className="space-y-2 rounded-control border border-warning/60 bg-warning/10 p-3 text-[14px]">
                  <p>
                    O {TIER_LABEL[ws.tier]} permite {limit} {limit === 1 ? "landing page publicada" : "landing pages publicadas"} e você já tem {publishedCount} no ar. Salve como
                    rascunho, ou despublique outra.
                  </p>
                  <a href={waLink(msgUpgrade(TIER_LABEL[ws.tier], "um plano maior", "Preciso publicar mais landing pages."))} target="_blank" rel="noopener noreferrer" className={btn.small}>
                    <WhatsAppIcon size={16} /> Fazer upgrade
                  </a>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={creating || atLimit || !trackingValid(tracking) || !!slugError} onClick={() => create(true)} className={btn.small}>
                  {creating ? "Aguarde…" : "Publicar"}
                </button>
                <button type="button" disabled={creating || !trackingValid(tracking) || !!slugError} onClick={() => create(false)} className={`${btn.ghost} h-9`}>
                  Salvar como rascunho
                </button>
              </div>
              {error && (
                <p role="alert" className="text-[13px] text-error-fg">
                  {error.text}
                </p>
              )}
              {!trackingValid(tracking) && <p className="text-[12.5px] text-error-fg">Corrija os IDs de rastreamento antes de publicar.</p>}
            </div>
          }
          right={<LandingPreview t={t} content={content} hideBadge={hideBadge} />}
        />
      )}

      {t && step > 1 && (
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => save({ step: step - 1 })} className={`${btn.ghost} h-10`}>
            <ArrowLeft size={16} aria-hidden /> Voltar
          </button>
          {step < 4 && (
            <button type="button" onClick={() => save({ step: step + 1 })} disabled={step === 3 && !trackingValid(tracking)} className={btn.small}>
              Continuar <ArrowRight size={16} aria-hidden />
            </button>
          )}
        </div>
      )}
      {t && <p className="text-[12px] text-fg-2">O progresso fica salvo neste navegador até você criar a página.</p>}
    </div>
  );
}
