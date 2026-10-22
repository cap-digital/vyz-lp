"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { EmptyState, PendingChip, Tabs } from "@/components/ui/kit";
import { btn } from "@/components/ui/styles";
import { landingTemplate } from "@/features/templates/landing-pages";
import type { LandingPage } from "@/features/workspace/types";
import { useItem } from "@/lib/store/hooks";
import { store } from "@/lib/store/store";
import { ContentFields, LandingPreview, SlugField, TrackingFields, useHideBadge } from "./editor";
import { previewUrl } from "./NewLandingFlow";

/** Formulário à esquerda, prévia ao vivo à direita. Salva a cada mudança. */
export function LandingEditor({ id }: { id: string }) {
  const lp = useItem<LandingPage>("landingPages", id);
  const hideBadge = useHideBadge();
  const [tab, setTab] = useState<"conteudo" | "rastreamento" | "publicar">("conteudo");

  if (lp === undefined) return <div className="h-64 animate-pulse rounded-card bg-card" aria-label="Carregando" />;
  const t = lp ? landingTemplate(lp.templateId) : undefined;
  if (!lp || !t)
    return (
      <EmptyState
        title="Landing page não encontrada"
        text="Ela pode ter sido removida, ou foi criada em outro navegador."
        action={
          <Link href="/painel/landing-pages" className={btn.small}>
            Ver landing pages
          </Link>
        }
      />
    );

  const update = (patch: Partial<LandingPage>) => store.put("landingPages", { ...lp, ...patch, updatedAt: new Date().toISOString() });

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label-caps text-fg-2">Landing page · {t.name}</p>
          <h1 className="display mt-1 text-[clamp(1.6rem,3vw,2.2rem)]">{lp.content.brand}</h1>
          <p className="mt-1 text-[13px] text-fg-2">{lp.published ? "Publicada (preview)" : "Rascunho"} · salva automaticamente neste navegador</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btn.small} onClick={async () => window.open(await previewUrl(lp), "_blank", "noopener")}>
            <ExternalLink size={15} aria-hidden /> Abrir preview
          </button>
        </div>
      </header>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-card border border-line bg-card p-5">
          <Tabs
            label="Editor"
            value={tab}
            onChange={setTab}
            items={[
              { value: "conteudo", label: "Conteúdo" },
              { value: "rastreamento", label: "Rastreamento" },
              { value: "publicar", label: "Publicar" },
            ]}
          />
          <div className="pt-5">
            {tab === "conteudo" && <ContentFields t={t} value={lp.content} onChange={(content) => update({ content })} />}
            {tab === "rastreamento" && <TrackingFields value={lp.tracking} onChange={(tracking) => update({ tracking })} />}
            {tab === "publicar" && (
              <div className="space-y-4">
                <SlugField value={lp.slug} onChange={(slug) => update({ slug })} />
                <PendingChip label="Publicação precisa de hospedagem" detail="Por enquanto, só o preview em /p/[id]." />
                <button type="button" onClick={() => update({ published: !lp.published })} className={btn.small}>
                  {lp.published ? "Voltar para rascunho" : "Publicar"}
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="lg:sticky lg:top-20 lg:self-start">
          <LandingPreview t={t} content={lp.content} hideBadge={hideBadge} />
        </div>
      </div>
    </div>
  );
}
