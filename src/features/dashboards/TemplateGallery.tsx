"use client";

import { ArrowRight, Lock, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { LockBadge, Modal, Tabs } from "@/components/ui/kit";
import { ScaledPreview } from "@/components/ui/ScaledPreview";
import { btn } from "@/components/ui/styles";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { PLATFORMS } from "@/features/accounts/platforms";
import { availableIn, canUse, TIER_LABEL } from "@/features/pricing/entitlements";
import { DASHBOARD_CATEGORIES, DASHBOARD_TEMPLATES } from "@/features/templates/dashboards";
import { PAGES } from "@/features/templates/pages";
import type { DashboardTemplate, PageId } from "@/features/templates/types";
import { useWorkspace } from "@/features/workspace/workspace";
import { msgUpgrade, waLink } from "@/lib/whatsapp";
import { datasetFor, pageLayout } from "./data";
import { PageView } from "./widgets/PageView";
import { makeContext } from "./widgets/Widgets";

const SAMPLE_CLIENT: Record<string, string> = {
  "E-commerce": "Loja Verde",
  Leads: "Escola Aurora",
  Imobiliário: "Incorporadora Sul",
  "Negócio local": "Clínica Sol",
  Agência: "Minha agência",
  Mídia: "Pet Mais",
  Executivo: "Grupo Horizonte",
};

export function TemplatePreview({ t, page, variant = "full" }: { t: DashboardTemplate; page?: PageId; variant?: "full" | "compact" }) {
  const client = SAMPLE_CLIENT[t.category];
  const ds = datasetFor({ templateId: t.id, name: t.name, client }, 30);
  return (
    <div className="bg-bg p-3">
      <p className="mb-2 text-[14px] font-bold tracking-[-0.02em]">
        {client} · {PAGES[page ?? t.pages[0]].name}
      </p>
      <PageView layout={pageLayout(t, page ?? t.pages[0])} ctx={makeContext(ds)} variant={variant} />
    </div>
  );
}

function Card({ t, locked, onOpen }: { t: DashboardTemplate; locked: boolean; onOpen: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="group flex h-full w-full flex-col overflow-hidden rounded-card border border-line bg-card text-left transition-colors duration-200 hover:border-accent"
      >
        <div className="relative border-b border-line">
          <ScaledPreview height={168} width={760}>
            <TemplatePreview t={t} variant="compact" />
          </ScaledPreview>
          {locked && (
            <span className="absolute inset-0 flex items-center justify-center bg-bg/55">
              <span className="inline-flex items-center gap-1.5 rounded-chip bg-card px-3 py-1 text-[12.5px] font-semibold">
                <Lock size={13} aria-hidden /> {availableIn(t.tier)}
              </span>
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold leading-snug">{t.name}</p>
            <span className={`shrink-0 rounded-chip px-2 py-0.5 text-[11px] font-semibold ${t.tier === "base" ? "border border-line text-fg-2" : "bg-accent-soft text-fg"}`}>{TIER_LABEL[t.tier]}</span>
          </div>
          <p className="line-clamp-2 text-[13px] text-fg-2">{t.description}</p>
          <p className="mt-auto flex flex-wrap gap-1 pt-1">
            {t.sources.map((s) => (
              <span key={s} className="rounded-chip border border-line px-2 py-0.5 text-[11px] text-fg-2">
                {PLATFORMS[s].short}
              </span>
            ))}
          </p>
        </div>
      </button>
    </li>
  );
}

/** Galeria de templates, estilo Planilhas: miniatura real, filtros, busca e cadeado. */
export function TemplateGallery({ onUse }: { onUse: (templateId: string) => void }) {
  const { ws } = useWorkspace();
  const [category, setCategory] = useState<string>("Todos");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<DashboardTemplate | null>(null);
  const [page, setPage] = useState<PageId | null>(null);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DASHBOARD_TEMPLATES.filter((t) => (category === "Todos" || t.category === category) && (!q || `${t.name} ${t.description} ${t.category}`.toLowerCase().includes(q)));
  }, [category, query]);

  const locked = open ? !canUse(ws.tier, open.tier) : false;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div role="radiogroup" aria-label="Categoria" className="flex flex-wrap gap-1.5">
          {["Todos", ...DASHBOARD_CATEGORIES].map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={category === c}
              onClick={() => setCategory(c)}
              className={`rounded-chip px-3 py-1.5 text-[13px] transition-colors duration-150 ${category === c ? "bg-accent font-semibold text-on-accent" : "border border-line text-fg-2 hover:text-fg"}`}
            >
              {c}
            </button>
          ))}
        </div>
        <label className="flex h-10 items-center gap-2 rounded-control border border-line bg-field px-3 focus-within:border-accent lg:w-72">
          <Search size={16} aria-hidden className="text-fg-2" />
          <span className="sr-only">Buscar template</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar template" className="h-full min-w-0 flex-1 bg-transparent text-[14px] outline-none" />
        </label>
      </div>

      {items.length === 0 ? (
        <p className="rounded-card border border-dashed border-line p-8 text-center text-fg-2">Nenhum template com esse filtro.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((t) => (
            <Card
              key={t.id}
              t={t}
              locked={!canUse(ws.tier, t.tier)}
              onOpen={() => {
                setOpen(t);
                setPage(t.pages[0]);
              }}
            />
          ))}
        </ul>
      )}

      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.name ?? ""} full={!locked} wide={locked}>
        {open && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-2xl text-[14px] text-fg-2">{open.description}</p>
              {locked ? (
                <div className="flex shrink-0 items-center gap-2">
                  <LockBadge label={availableIn(open.tier)} />
                  <a href={waLink(msgUpgrade(TIER_LABEL[ws.tier], TIER_LABEL[open.tier], `Quero o template ${open.name}.`))} target="_blank" rel="noopener noreferrer" className={btn.small}>
                    <WhatsAppIcon size={16} /> Fazer upgrade
                  </a>
                </div>
              ) : (
                <button type="button" onClick={() => onUse(open.id)} className={`${btn.small} shrink-0`}>
                  Usar este template <ArrowRight size={16} aria-hidden />
                </button>
              )}
            </div>
            <Tabs
              label="Páginas do template"
              value={page ?? open.pages[0]}
              onChange={setPage}
              items={open.pages.map((p) => ({ value: p, label: PAGES[p].name }))}
            />
            <div className={`overflow-hidden rounded-card border border-line ${locked ? "max-h-[420px]" : ""}`}>
              <TemplatePreview t={open} page={page ?? open.pages[0]} />
            </div>
            <p className="text-[12px] text-fg-2">Amostra · dados fictícios</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
