"use client";

import { ArrowRight, Lock, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { LockBadge, Modal } from "@/components/ui/kit";
import { ScaledPreview } from "@/components/ui/ScaledPreview";
import { btn } from "@/components/ui/styles";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { availableIn, canUse, TIER_LABEL } from "@/features/pricing/entitlements";
import { LANDING_TEMPLATES, landingDefaults, type LandingTemplate } from "@/features/templates/landing-pages";
import { useWorkspace } from "@/features/workspace/workspace";
import { msgUpgrade, waLink } from "@/lib/whatsapp";
import { LandingPreview } from "./editor";
import { LandingRenderer } from "./LandingRenderer";

const SAMPLE: Record<string, string> = { Leads: "Escola Aurora", "E-commerce": "Loja Verde", "Negócio local": "Clínica Sol", Imobiliário: "Incorporadora Sul", Infoproduto: "Academia Tráfego", Saúde: "Clínica Sol", Educação: "Escola Aurora" };

export function LandingGallery({ onUse }: { onUse: (id: string) => void }) {
  const { ws } = useWorkspace();
  const [category, setCategory] = useState("Todos");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<LandingTemplate | null>(null);
  const categories = ["Todos", ...Array.from(new Set(LANDING_TEMPLATES.map((t) => t.category)))];
  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return LANDING_TEMPLATES.filter((t) => (category === "Todos" || t.category === category) && (!q || `${t.name} ${t.description}`.toLowerCase().includes(q)));
  }, [category, query]);
  const locked = open ? !canUse(ws.tier, open.tier) : false;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div role="radiogroup" aria-label="Categoria" className="flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={category === c}
              onClick={() => setCategory(c)}
              className={`rounded-chip px-3 py-1.5 text-[13px] ${category === c ? "bg-accent font-semibold text-on-accent" : "border border-line text-fg-2 hover:text-fg"}`}
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
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((t) => {
          const isLocked = !canUse(ws.tier, t.tier);
          return (
            <li key={t.id}>
              <button type="button" onClick={() => setOpen(t)} className="flex h-full w-full flex-col overflow-hidden rounded-card border border-line bg-card text-left transition-colors hover:border-accent">
                <div className="relative border-b border-line">
                  <ScaledPreview height={180} width={900}>
                    <LandingRenderer template={t} content={landingDefaults(t, SAMPLE[t.category] ?? "Sua marca")} />
                  </ScaledPreview>
                  {isLocked && (
                    <span className="absolute inset-0 flex items-center justify-center bg-bg/55">
                      <span className="inline-flex items-center gap-1.5 rounded-chip bg-card px-3 py-1 text-[12.5px] font-semibold">
                        <Lock size={13} aria-hidden /> {availableIn(t.tier)}
                      </span>
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold">{t.name}</p>
                    <span className={`shrink-0 rounded-chip px-2 py-0.5 text-[11px] font-semibold ${t.tier === "base" ? "border border-line text-fg-2" : "bg-accent-soft text-fg"}`}>{TIER_LABEL[t.tier]}</span>
                  </div>
                  <p className="text-[13px] text-fg-2">{t.description}</p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.name ?? ""} wide>
        {open && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[14px] text-fg-2">{open.description}</p>
              {locked ? (
                <div className="flex shrink-0 items-center gap-2">
                  <LockBadge label={availableIn(open.tier)} />
                  <a href={waLink(msgUpgrade(TIER_LABEL[ws.tier], TIER_LABEL[open.tier], `Quero o template de LP ${open.name}.`))} target="_blank" rel="noopener noreferrer" className={btn.small}>
                    <WhatsAppIcon size={16} /> Fazer upgrade
                  </a>
                </div>
              ) : (
                <button type="button" onClick={() => onUse(open.id)} className={`${btn.small} shrink-0`}>
                  Usar este template <ArrowRight size={16} aria-hidden />
                </button>
              )}
            </div>
            <LandingPreview t={open} content={landingDefaults(open, SAMPLE[open.category] ?? "Sua marca")} />
          </div>
        )}
      </Modal>
    </div>
  );
}
