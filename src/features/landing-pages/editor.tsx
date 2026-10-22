"use client";

// Peças do editor de LP: conteúdo, rastreamento, publicação e a prévia
// desktop/mobile. Usadas no fluxo "Nova landing page" e no editor.

import { Monitor, Plus, Smartphone, Trash2 } from "lucide-react";
import { useState } from "react";
import { Checkbox, LockBadge, PendingChip, TextField } from "@/components/ui/kit";
import { btn } from "@/components/ui/styles";
import { LANDING_SECTIONS, SECTION_LABEL, type LandingContent, type LandingSection, type LandingTemplate } from "@/features/templates/landing-pages";
import type { Tracking } from "@/features/workspace/types";
import { useWorkspace } from "@/features/workspace/workspace";
import { slugify } from "@/lib/ids";
import { LandingRenderer } from "./LandingRenderer";
import { normalizeTracking, TRACKING_FIELDS, validateTracking } from "./tracking";

/** Seções que o template sabe preencher. */
export function sectionsFor(t: LandingTemplate): LandingSection[] {
  const c = t.copy;
  return LANDING_SECTIONS.filter((s) => {
    if (s === "oferta") return !!c.offer;
    if (s === "agenda") return !!c.agenda;
    if (s === "local") return !!c.address;
    if (s === "prova") return !!c.stats;
    if (s === "contagem") return !!c.countdown;
    return true;
  });
}

const maskPhone = (raw: string) => {
  const d = raw.replace(/\D/g, "").slice(0, 13);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`;
};

export function ContentFields({ t, value, onChange }: { t: LandingTemplate; value: LandingContent; onChange: (v: LandingContent) => void }) {
  const set = (patch: Partial<LandingContent>) => onChange({ ...value, ...patch });
  const [logoError, setLogoError] = useState<string | null>(null);
  return (
    <div className="space-y-5">
      <fieldset className="space-y-3">
        <legend className="mb-1 text-[13px] font-semibold text-fg-2">Marca</legend>
        <TextField label="Nome da marca" value={value.brand} onChange={(brand) => set({ brand })} placeholder="Loja Verde" />
        <div className="flex flex-wrap items-end gap-4">
          <label className="block text-[13px] font-medium">
            Logo (até 300 KB)
            <input
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              className="mt-1 block text-[13px] file:mr-3 file:rounded-control file:border file:border-line file:bg-card file:px-3 file:py-1.5 file:text-fg"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > 300_000) return setLogoError("Use uma imagem de até 300 KB.");
                const r = new FileReader();
                r.onload = () => {
                  setLogoError(null);
                  set({ logo: String(r.result) });
                };
                r.readAsDataURL(f);
              }}
            />
          </label>
          {value.logo && (
            <button type="button" onClick={() => set({ logo: undefined })} className={`${btn.ghost} h-8 px-2 text-[13px]`}>
              Remover logo
            </button>
          )}
          <label className="flex items-center gap-2 text-[13px] font-medium">
            Cor principal
            <input type="color" value={value.color} onChange={(e) => set({ color: e.target.value })} className="h-9 w-14 rounded-control border border-line bg-field" />
          </label>
        </div>
        {logoError && <p className="text-[12px] text-error-fg">{logoError}</p>}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-1 text-[13px] font-semibold text-fg-2">Textos</legend>
        <TextField label="Headline" value={value.headline} onChange={(headline) => set({ headline: headline.slice(0, 90) })} hint={`${value.headline.length}/90`} />
        <TextField label="Subtítulo" value={value.sub} onChange={(sub) => set({ sub: sub.slice(0, 180) })} hint={`${value.sub.length}/180`} />
        <TextField label="Texto do botão (CTA)" value={value.cta} onChange={(cta) => set({ cta: cta.slice(0, 32) })} />
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-[13px] font-semibold text-fg-2">Seções</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {sectionsFor(t).map((s) => (
            <Checkbox key={s} label={SECTION_LABEL[s]} checked={!!value.sections[s]} onChange={(on) => set({ sections: { ...value.sections, [s]: on } })} />
          ))}
        </div>
      </fieldset>

      {t.hero === "form" && (
        <fieldset className="space-y-2">
          <legend className="mb-1 text-[13px] font-semibold text-fg-2">Campos do formulário</legend>
          {value.fields.map((f, i) => (
            <div key={i} className="flex items-end gap-2">
              <div className="flex-1">
                <TextField
                  label={`Campo ${i + 1}`}
                  value={f}
                  onChange={(v) => {
                    const next = [...value.fields];
                    next[i] = v.slice(0, 32);
                    set({ fields: next });
                  }}
                />
              </div>
              <button
                type="button"
                aria-label={`Remover campo ${i + 1}`}
                disabled={value.fields.length <= 1}
                onClick={() => set({ fields: value.fields.filter((_, j) => j !== i) })}
                className="mb-0.5 inline-flex size-10 items-center justify-center rounded-control border border-line disabled:opacity-30"
              >
                <Trash2 size={15} aria-hidden />
              </button>
            </div>
          ))}
          {value.fields.length < 4 && (
            <button type="button" onClick={() => set({ fields: [...value.fields, "Novo campo"] })} className={`${btn.ghost} h-9 px-2 text-[14px]`}>
              <Plus size={15} aria-hidden /> Adicionar campo
            </button>
          )}
        </fieldset>
      )}

      <TextField
        label="WhatsApp da marca"
        value={value.whatsapp}
        inputMode="tel"
        placeholder="(71) 99999-0000"
        hint="O botão de WhatsApp da página abre a conversa com este número."
        onChange={(v) => set({ whatsapp: maskPhone(v) })}
      />
    </div>
  );
}

export function TrackingFields({ value, onChange }: { value: Tracking; onChange: (v: Tracking) => void }) {
  return (
    <div className="space-y-3">
      {TRACKING_FIELDS.map((f) => (
        <TextField
          key={f.key}
          label={`${f.label} (opcional)`}
          value={value[f.key]}
          placeholder={f.placeholder}
          hint={f.hint}
          error={validateTracking(f.key, value[f.key])}
          onChange={(v) => onChange({ ...value, [f.key]: normalizeTracking(f.key, v) })}
        />
      ))}
      <PendingChip label="Teste do disparo precisa de publicação" detail="Com a página no ar, o time confere se GTM, Pixel e conversões disparam. No preview, as tags não rodam." />
    </div>
  );
}

export function trackingValid(t: Tracking): boolean {
  return TRACKING_FIELDS.every((f) => validateTracking(f.key, t[f.key]) === null);
}

export function SlugField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <TextField
      label="Endereço (subdomínio)"
      value={value}
      suffix=".vyz.app"
      placeholder="lojaverde"
      hint="Só letras minúsculas, números e hífen."
      onChange={(v) => onChange(slugify(v, "-"))}
    />
  );
}

/** Prévia com o toggle desktop/mobile. */
export function LandingPreview({ t, content, hideBadge }: { t: LandingTemplate; content: LandingContent; hideBadge?: boolean }) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div role="radiogroup" aria-label="Dispositivo" className="inline-flex rounded-chip border border-line bg-bg p-1">
          {(
            [
              ["desktop", Monitor, "Desktop"],
              ["mobile", Smartphone, "Mobile"],
            ] as const
          ).map(([v, I, label]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={device === v}
              onClick={() => setDevice(v)}
              className={`inline-flex h-8 items-center gap-1.5 rounded-chip px-3 text-[13px] ${device === v ? "bg-accent text-on-accent" : "text-fg-2"}`}
            >
              <I size={14} aria-hidden /> {label}
            </button>
          ))}
        </div>
        <span className="text-[12px] text-fg-2">Prévia ao vivo</span>
      </div>
      <div className={`mx-auto overflow-hidden rounded-card border border-line bg-card transition-[max-width] duration-200 ${device === "mobile" ? "max-w-[390px]" : "max-w-full"}`}>
        <div className="flex items-center gap-1 border-b border-line px-3 py-2" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span key={i} className="size-2 rounded-full bg-muted" />
          ))}
        </div>
        <div className="max-h-[70vh] overflow-y-auto">
          <LandingRenderer template={t} content={content} hideBadge={hideBadge} />
        </div>
      </div>
    </div>
  );
}

export function LockedTemplateNote({ label }: { label: string }) {
  return <LockBadge label={label} />;
}

export function useHideBadge() {
  const { ws } = useWorkspace();
  return ws.tier === "personalizado" && ws.brand.hideVyz;
}
