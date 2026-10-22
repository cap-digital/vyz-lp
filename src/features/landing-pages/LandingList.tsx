"use client";

import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/ui/kit";
import { ScaledPreview } from "@/components/ui/ScaledPreview";
import { btn } from "@/components/ui/styles";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { UsageBar } from "@/features/accounts/AccountsPage";
import { LP_TEAM_PRICE } from "@/features/pricing/pricing";
import { landingTemplate } from "@/features/templates/landing-pages";
import type { LandingDraft, LandingPage } from "@/features/workspace/types";
import { useWorkspace } from "@/features/workspace/workspace";
import { brl } from "@/lib/format";
import { useCollection, useDoc } from "@/lib/store/hooks";
import { store } from "@/lib/store/store";
import { MSG_LP_TEAM, waLink } from "@/lib/whatsapp";
import { LandingRenderer } from "./LandingRenderer";

function TeamCard() {
  return (
    <li className="flex flex-col justify-between gap-4 rounded-card bg-accent p-5 text-on-accent">
      <div>
        <p className="title text-lg">Prefere que o time faça?</p>
        <p className="mt-1 text-[14px]">Landing page feita pelo time · {brl(LP_TEAM_PRICE, { decimals: false })}, já com o GTM configurado.</p>
      </div>
      <a href={waLink(MSG_LP_TEAM)} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 w-fit items-center gap-2 rounded-control bg-on-accent px-4 text-[14px] font-semibold text-accent">
        <WhatsAppIcon size={16} /> Falar com o time
      </a>
    </li>
  );
}

export function LandingList() {
  const { ent } = useWorkspace();
  const pages = useCollection<LandingPage>("landingPages");
  const draft = useDoc<LandingDraft>("draft:landing");
  const published = pages.filter((p) => p.published).length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Landing pages"
        title="Landing pages"
        text="Monte a partir de um template, cole o rastreamento e publique o preview."
        actions={
          <>
            {draft?.templateId && (
              <Link href="/painel/landing-pages/novo" className={`${btn.ghost} h-9`}>
                Continuar rascunho
              </Link>
            )}
            <Link href="/painel/landing-pages/novo?novo=1" className={btn.small}>
              <Plus size={16} aria-hidden /> Nova landing page
            </Link>
          </>
        }
      />
      <div className="rounded-card border border-line bg-card p-4">
        <UsageBar used={published} limit={ent.maxLandingPages} label="Landing pages publicadas × limite do plano" />
      </div>
      {pages.length === 0 && (
        <EmptyState
          title="Nenhuma landing page ainda"
          text="Escolha um template, troque os textos e a cor, cole o GTM e veja o preview no desktop e no celular."
          action={
            <Link href="/painel/landing-pages/novo?novo=1" className={btn.small}>
              <Plus size={16} aria-hidden /> Nova landing page
            </Link>
          }
        />
      )}
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {pages.map((p) => {
          const t = landingTemplate(p.templateId);
          if (!t) return null;
          return (
            <li key={p.id} className="group relative overflow-hidden rounded-card border border-line bg-card transition-colors hover:border-accent">
              <Link href={`/painel/landing-pages/${p.id}`} className="block">
                <div className="border-b border-line">
                  <ScaledPreview height={170} width={900}>
                    <LandingRenderer template={t} content={p.content} />
                  </ScaledPreview>
                </div>
                <div className="p-4">
                  <p className="truncate font-semibold">{p.content.brand}</p>
                  <p className="text-[13px] text-fg-2">
                    {t.name} · {p.published ? "Publicada (preview)" : "Rascunho"}
                  </p>
                </div>
              </Link>
              <button
                type="button"
                aria-label={`Remover ${p.content.brand}`}
                onClick={() => store.remove("landingPages", p.id)}
                className="absolute top-2 right-2 inline-flex size-8 items-center justify-center rounded-control border border-line bg-card opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              >
                <Trash2 size={14} aria-hidden />
              </button>
            </li>
          );
        })}
        <TeamCard />
      </ul>
    </div>
  );
}
