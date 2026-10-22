"use client";

import { ArrowLeft, ArrowRight, Check, ExternalLink } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { PendingChip } from "@/components/ui/kit";
import { btn } from "@/components/ui/styles";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { TIER_LABEL } from "@/features/pricing/entitlements";
import { encodeData } from "@/features/share/encode";
import { landingDefaults, landingTemplate } from "@/features/templates/landing-pages";
import type { LandingDraft, LandingPage, Tracking } from "@/features/workspace/types";
import { useWorkspace } from "@/features/workspace/workspace";
import { newId, slugify } from "@/lib/ids";
import { useCollection, useDoc } from "@/lib/store/hooks";
import { store } from "@/lib/store/store";
import { msgUpgrade, waLink } from "@/lib/whatsapp";
import { ContentFields, LandingPreview, SlugField, TrackingFields, trackingValid, useHideBadge } from "./editor";
import { LandingGallery } from "./LandingGallery";

const STEPS = ["Template", "Conteúdo", "Rastreamento", "Publicar"];
export const EMPTY_TRACKING: Tracking = { gtm: "", pixel: "", adsConversion: "", ga4: "" };

/** Abre a prévia pública (/p/[id]#conteúdo), que funciona em qualquer navegador. */
export async function previewUrl(lp: Pick<LandingPage, "id" | "templateId" | "content">): Promise<string> {
  const code = await encodeData({ t: lp.templateId, c: lp.content });
  return `${window.location.origin}/p/${lp.id}#${code}`;
}

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

export function NewLandingFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const { ws, ent } = useWorkspace();
  const hideBadge = useHideBadge();
  const saved = useDoc<LandingDraft>("draft:landing");
  const pages = useCollection<LandingPage>("landingPages");
  const [published, setPublished] = useState<LandingPage | null>(null);
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
  const publishedCount = pages.filter((p) => p.published).length;
  const atLimit = publishedCount >= ent.maxLandingPages;

  function persist(publish: boolean): LandingPage | null {
    if (!t || !content) return null;
    const now = new Date().toISOString();
    const lp: LandingPage = {
      id: draft.id ?? newId("lp_"),
      templateId: t.id,
      content,
      tracking,
      slug: draft.slug || slugify(content.brand, "-"),
      published: publish,
      createdAt: draft.createdAt ?? now,
      updatedAt: now,
    };
    store.put("landingPages", lp);
    store.setDoc("draft:landing", null);
    return lp;
  }

  if (published) {
    return (
      <div className="space-y-4 rounded-card border border-line bg-card p-6">
        <h2 className="title text-xl">Pronto: {published.content.brand} está no preview.</h2>
        <PendingChip label="Publicação precisa de hospedagem" detail="Por enquanto, a página existe só como preview em /p/[id]. Com a hospedagem, ela vai para o subdomínio escolhido." />
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btn.small} onClick={async () => window.open(await previewUrl(published), "_blank", "noopener")}>
            <ExternalLink size={15} aria-hidden /> Abrir preview
          </button>
          <button type="button" className={`${btn.ghost} h-9`} onClick={() => router.push(`/painel/landing-pages/${published.id}`)}>
            Abrir no editor
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Steps step={step} max={t ? 4 : 1} onGo={(s) => save({ step: s })} />

      {step === 1 && (
        <LandingGallery
          onUse={(id) => {
            const tt = landingTemplate(id)!;
            const c = landingDefaults(tt, ws.name || "Sua marca");
            save({ templateId: id, content: c, tracking: EMPTY_TRACKING, slug: slugify(c.brand, "-"), step: 2 });
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
              <SlugField value={draft.slug ?? ""} onChange={(slug) => save({ slug })} />
              <p className="text-[13px] text-fg-2 tnum">
                Endereço: <strong className="text-fg">{draft.slug || "sua-marca"}.vyz.app</strong>
              </p>
              <PendingChip label="Publicação precisa de hospedagem" detail="Por enquanto, só o preview em /p/[id]." />
              {atLimit ? (
                <div className="space-y-2 rounded-control border border-warning/60 bg-warning/10 p-3 text-[14px]">
                  <p>
                    O {TIER_LABEL[ws.tier]} permite {ent.maxLandingPages} {ent.maxLandingPages === 1 ? "landing page publicada" : "landing pages publicadas"}.
                  </p>
                  <a href={waLink(msgUpgrade(TIER_LABEL[ws.tier], "um plano maior", "Preciso publicar mais landing pages."))} target="_blank" rel="noopener noreferrer" className={btn.small}>
                    <WhatsAppIcon size={16} /> Fazer upgrade
                  </a>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={atLimit || !trackingValid(tracking)} onClick={() => setPublished(persist(true))} className={btn.small}>
                  Publicar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const lp = persist(false);
                    if (lp) router.push(`/painel/landing-pages/${lp.id}`);
                  }}
                  className={`${btn.ghost} h-9`}
                >
                  Salvar como rascunho
                </button>
              </div>
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
      {t && <p className="text-[12px] text-fg-2">O progresso fica salvo neste navegador a cada passo.</p>}
    </div>
  );
}
