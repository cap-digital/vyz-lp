"use client";

import { ArrowDown, ArrowLeft, ArrowRight, Check, GripVertical, Lock, Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Checkbox, LockBadge, PendingChip, SelectField, TextField } from "@/components/ui/kit";
import { btn } from "@/components/ui/styles";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { AccountForm, accountIdLabel } from "@/features/accounts/AccountForm";
import { UsageBar } from "@/features/accounts/AccountsPage";
import { PLATFORMS, type PlatformId } from "@/features/accounts/platforms";
import { availableIn, canUse, TIER_LABEL } from "@/features/pricing/entitlements";
import { dashboardTemplate } from "@/features/templates/dashboards";
import { PAGE_LIBRARY, PAGES } from "@/features/templates/pages";
import type { PageId } from "@/features/templates/types";
import { ATTRIBUTIONS, PERIODS, type Account, type Dashboard, type DashboardDraft, type PeriodId } from "@/features/workspace/types";
import { useWorkspace } from "@/features/workspace/workspace";
import { brl } from "@/lib/format";
import { newId } from "@/lib/ids";
import { useCollection, useDoc } from "@/lib/store/hooks";
import { store } from "@/lib/store/store";
import { msgUpgrade, waLink } from "@/lib/whatsapp";
import { DEFAULT_SETTINGS } from "./data";
import { TemplateGallery } from "./TemplateGallery";

const STEPS = ["Template", "Contas", "Páginas", "Metas e ajustes", "Revisar e gerar"];

const reais = (cents: number) => (cents ? String(Math.round(cents / 100)) : "");
const cents = (v: string) => Math.round((Number(v.replace(/\./g, "").replace(",", ".")) || 0) * 100);

function Stepper({ step, onGo, max }: { step: number; onGo: (s: number) => void; max: number }) {
  return (
    <ol className="flex gap-1 overflow-x-auto pb-1" aria-label="Passos">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < step;
        const current = n === step;
        return (
          <li key={label} className={step === i + 1 ? "min-w-0 flex-[3] sm:flex-1" : "min-w-0 flex-1"}>
            <button
              type="button"
              disabled={n > max}
              onClick={() => onGo(n)}
              aria-current={current ? "step" : undefined}
              className="group flex w-full min-w-[2.5rem] flex-col gap-1.5 text-left disabled:cursor-default sm:min-w-[7.5rem]"
            >
              <span className={`h-[var(--cut)] w-full rounded-full ${done || current ? "bg-accent" : "bg-line"}`} />
              <span className={`flex items-center gap-1.5 text-[12.5px] ${current ? "font-semibold text-fg" : done ? "text-fg" : "text-fg-2"}`}>
                <span className="tnum">{String(n).padStart(2, "0")}</span> <span className={n === step ? "" : "hidden sm:inline"}>{label}</span>
                {done && <Check size={13} aria-hidden className="text-accent" />}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="rounded-card border border-line bg-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="title text-lg">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function NewDashboardFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const { ws, ent } = useWorkspace();
  const saved = useDoc<DashboardDraft>("draft:dashboard");
  const accounts = useCollection<Account>("accounts");
  const dashboards = useCollection<Dashboard>("dashboards");
  const [adding, setAdding] = useState<PlatformId | null>(null);
  const [generating, setGenerating] = useState(false);
  const [dragging, setDragging] = useState<number | null>(null);
  const handled = useRef(false);

  const draft: DashboardDraft = saved ?? { step: 1 };
  const save = (patch: Partial<DashboardDraft>) => {
    const cur = store.getDoc<DashboardDraft>("draft:dashboard") ?? { step: 1 };
    store.setDoc("draft:dashboard", { ...cur, ...patch });
  };

  // ?novo=1 começa do zero; ?template= pula para as contas; ?editar=id volta nos passos 3 e 4
  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    const editar = params.get("editar");
    const template = params.get("template");
    if (editar) {
      const d = store.get<Dashboard>("dashboards", editar);
      if (d) store.setDoc<DashboardDraft>("draft:dashboard", { ...d, step: Number(params.get("passo")) || 3, editingId: d.id });
    } else if (template && dashboardTemplate(template)) {
      store.setDoc<DashboardDraft>("draft:dashboard", { step: 2, templateId: template, pages: dashboardTemplate(template)!.pages });
    } else if (params.get("novo")) {
      store.setDoc<DashboardDraft>("draft:dashboard", { step: 1 });
    }
  }, [params]);

  const t = draft.templateId ? dashboardTemplate(draft.templateId) : undefined;
  const step = t ? draft.step : 1;
  const settings = { ...DEFAULT_SETTINGS, ...draft.settings };
  const pages = draft.pages ?? t?.pages ?? [];
  const editing = !!draft.editingId;
  const atLimit = !editing && dashboards.length >= ent.maxDashboards;
  const isLeadProfile = t && ["leads", "imob", "saude", "educacao", "infoproduto"].includes(t.profile);

  const go = (s: number) => save({ step: s });

  function generate() {
    if (!t) return;
    setGenerating(true);
    const now = new Date().toISOString();
    const existing = draft.editingId ? store.get<Dashboard>("dashboards", draft.editingId) : null;
    const d: Dashboard = {
      id: draft.editingId ?? newId("d_"),
      templateId: t.id,
      name: draft.name?.trim() || t.name,
      client: draft.client?.trim() || "Cliente",
      accounts: draft.accounts ?? {},
      pages: pages.length ? pages : t.pages,
      settings,
      brand: ws.tier === "personalizado" ? (draft.brand ?? ws.brand) : undefined,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    store.put("dashboards", d);
    // a varredura do scanner roda enquanto o dashboard "se monta"
    window.setTimeout(() => {
      store.setDoc("draft:dashboard", null);
      router.push(`/painel/dashboards/${d.id}?novo=1`);
    }, 750);
  }

  const libraryPages: PageId[] = t ? [...t.pages, ...PAGE_LIBRARY.filter((p) => !t.pages.includes(p))] : [];

  function togglePage(p: PageId, on: boolean) {
    const next = on ? [...pages, p] : pages.filter((x) => x !== p);
    save({ pages: next });
  }
  function move(i: number, dir: number) {
    const j = i + dir;
    if (j < 0 || j >= pages.length) return;
    const next = [...pages];
    [next[i], next[j]] = [next[j], next[i]];
    save({ pages: next });
  }

  return (
    <div className="space-y-6">
      <Stepper step={step} max={t ? 5 : 1} onGo={go} />

      {step === 1 && (
        <TemplateGallery
          onUse={(id) => {
            const tt = dashboardTemplate(id)!;
            save({ templateId: id, pages: tt.pages, step: 2, accounts: {} });
          }}
        />
      )}

      {t && step === 2 && (
        <Section
          title={`Contas · ${t.name}`}
          aside={<UsageBar used={accounts.length} limit={ws.contractedAccounts} label="Contas × contratadas" />}
        >
          <p className="mb-4 text-[14px] text-fg-2">Este template usa {t.sources.map((s) => PLATFORMS[s].name).join(", ")}. Escolha uma conta já cadastrada ou cadastre pelo ID.</p>
          <div className="space-y-4">
            {t.sources.map((src) => {
              const p = PLATFORMS[src];
              const locked = !canUse(ws.tier, p.tier);
              const options = accounts.filter((a) => a.platform === src);
              const chosen = draft.accounts?.[src];
              return (
                <div key={src} className="rounded-card border border-line bg-bg p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{p.name}</p>
                    {locked ? <LockBadge label={availableIn(p.tier)} /> : <span className="rounded-chip border border-dashed border-line px-2.5 py-0.5 text-[12px] text-fg-2">Aguardando conexão</span>}
                  </div>
                  {!locked && (
                    <div className="mt-3 space-y-2">
                      {options.map((a) => (
                        <label key={a.id} className={`flex cursor-pointer items-center gap-3 rounded-control border p-3 text-[14px] ${chosen === a.id ? "border-accent" : "border-line"}`}>
                          <input type="radio" name={`acc-${src}`} checked={chosen === a.id} onChange={() => save({ accounts: { ...draft.accounts, [src]: a.id } })} className="accent-[var(--accent)]" />
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{a.name}</span>
                            <span className="block text-[12.5px] text-fg-2 tnum">{accountIdLabel(a)}</span>
                          </span>
                        </label>
                      ))}
                      {adding === src ? (
                        <div className="rounded-control border border-line p-3">
                          <AccountForm
                            platform={src}
                            onSaved={(a) => {
                              save({ accounts: { ...draft.accounts, [src]: a.id } });
                              setAdding(null);
                            }}
                            onCancel={() => setAdding(null)}
                          />
                        </div>
                      ) : (
                        <button type="button" onClick={() => setAdding(src)} className={`${btn.ghost} h-9 px-2 text-[14px]`}>
                          <Plus size={15} aria-hidden /> Cadastrar {options.length ? "outra conta" : "conta"} pelo ID
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-4">
            <PendingChip label="Conexão automática (OAuth) em breve" detail="Por enquanto, o dashboard usa dados de amostra. Quando a conexão chegar, os mesmos widgets passam a ler os dados reais." />
          </div>
        </Section>
      )}

      {t && step === 3 && (
        <Section title="Páginas do dashboard">
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-[13px] font-medium text-fg-2">Biblioteca de páginas</p>
              <ul className="space-y-2">
                {libraryPages.map((p) => {
                  const def = PAGES[p];
                  const locked = !canUse(ws.tier, def.tier);
                  return (
                    <li key={p} className={`rounded-control border border-line bg-bg p-3 ${locked ? "opacity-70" : ""}`}>
                      <Checkbox
                        label={
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{def.name}</span>
                            {locked && <LockBadge label={availableIn(def.tier)} />}
                            {def.soon && <span className="rounded-chip bg-accent-soft px-2 py-0.5 text-[11px]">em breve</span>}
                          </span>
                        }
                        hint={def.description}
                        checked={pages.includes(p)}
                        disabled={locked}
                        onChange={(on) => togglePage(p, on)}
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-[13px] font-medium text-fg-2">Ordem das abas (arraste ou use as setas)</p>
              {pages.length === 0 ? (
                <p className="rounded-control border border-dashed border-line p-4 text-[14px] text-fg-2">Escolha pelo menos uma página.</p>
              ) : (
                <ol className="space-y-2">
                  {pages.map((p, i) => (
                    <li
                      key={p}
                      draggable
                      onDragStart={() => setDragging(i)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (dragging === null || dragging === i) return;
                        const next = [...pages];
                        const [it] = next.splice(dragging, 1);
                        next.splice(i, 0, it);
                        save({ pages: next });
                        setDragging(null);
                      }}
                      className="flex items-center gap-2 rounded-control border border-line bg-bg p-2.5 text-[14px]"
                    >
                      <GripVertical size={16} aria-hidden className="cursor-grab text-fg-2" />
                      <span className="w-6 text-fg-2 tnum">{i + 1}</span>
                      <span className="flex-1 font-medium">{PAGES[p].name}</span>
                      <button type="button" aria-label={`Subir ${PAGES[p].name}`} onClick={() => move(i, -1)} disabled={i === 0} className="inline-flex size-8 items-center justify-center rounded-control border border-line disabled:opacity-30">
                        <ArrowDown size={14} aria-hidden className="rotate-180" />
                      </button>
                      <button type="button" aria-label={`Descer ${PAGES[p].name}`} onClick={() => move(i, 1)} disabled={i === pages.length - 1} className="inline-flex size-8 items-center justify-center rounded-control border border-line disabled:opacity-30">
                        <ArrowDown size={14} aria-hidden />
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </Section>
      )}

      {t && step === 4 && (
        <div className="space-y-4">
          <Section title="Metas e ajustes">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Nome do dashboard" value={draft.name ?? ""} placeholder={t.name} onChange={(name) => save({ name })} />
              <TextField label="Cliente" value={draft.client ?? ""} placeholder="Ex.: Loja Verde" onChange={(client) => save({ client })} />
              <TextField
                label={isLeadProfile ? "Meta de CPL" : "Meta de CPA"}
                prefix="R$"
                inputMode="numeric"
                value={reais(settings.goal)}
                placeholder="60"
                hint="Vira a linha tracejada nos gráficos."
                onChange={(v) => save({ settings: { ...draft.settings, goal: cents(v) } })}
              />
              <TextField
                label="Margem"
                suffix="%"
                inputMode="numeric"
                value={String(Math.round(settings.margin * 100))}
                hint={`ROAS de equilíbrio = 1 ÷ margem = ${(1 / Math.max(0.01, settings.margin)).toFixed(1).replace(".", ",")}`}
                onChange={(v) => save({ settings: { ...draft.settings, margin: Math.min(0.95, Math.max(0.01, (Number(v) || 0) / 100)) } })}
              />
              <TextField
                label="Verba mensal"
                prefix="R$"
                inputMode="numeric"
                value={reais(settings.budget)}
                placeholder="50000"
                hint="Usada no pacing e na projeção do mês."
                onChange={(v) => save({ settings: { ...draft.settings, budget: cents(v) } })}
              />
              <SelectField label="Período padrão" value={settings.period} onChange={(v) => save({ settings: { ...draft.settings, period: v as PeriodId } })} options={PERIODS} />
              <SelectField label="Moeda" value="BRL" onChange={() => {}} options={[{ value: "BRL", label: "Real (R$)" }]} />
              <SelectField label="Janela de atribuição exibida" value={settings.attribution} onChange={(v) => save({ settings: { ...draft.settings, attribution: v } })} options={ATTRIBUTIONS} />
            </div>
          </Section>

          <Section title="Marca" aside={ws.tier !== "personalizado" ? <LockBadge label={availableIn("personalizado")} /> : undefined}>
            {ws.tier === "personalizado" ? (
              <BrandFields value={draft.brand ?? ws.brand} onChange={(brand) => save({ brand })} />
            ) : (
              <div className="flex flex-col gap-3 text-[14px] sm:flex-row sm:items-center sm:justify-between">
                <p className="text-fg-2">Seu logo e suas cores no dashboard, no link e no PDF, sem a marca VYZ.</p>
                <a href={waLink(msgUpgrade(TIER_LABEL[ws.tier], "Personalizado", "Quero a marca própria."))} target="_blank" rel="noopener noreferrer" className={`${btn.small} shrink-0`}>
                  <WhatsAppIcon size={16} /> Fazer upgrade
                </a>
              </div>
            )}
          </Section>
        </div>
      )}

      {t && step === 5 && (
        <Section title="Revisar e gerar">
          <dl className="grid gap-x-6 gap-y-3 text-[14px] sm:grid-cols-2">
            <Info label="Template" value={t.name} />
            <Info label="Dashboard" value={`${draft.name?.trim() || t.name} · ${draft.client?.trim() || "Cliente"}`} />
            <Info
              label="Contas"
              value={
                t.sources
                  .map((s) => {
                    const a = accounts.find((x) => x.id === draft.accounts?.[s]);
                    return `${PLATFORMS[s].short}: ${a ? a.name : "sem conta (amostra)"}`;
                  })
                  .join(" · ") || "—"
              }
            />
            <Info label="Páginas" value={pages.map((p) => PAGES[p].name).join(", ")} />
            <Info label={isLeadProfile ? "Meta de CPL" : "Meta de CPA"} value={settings.goal ? brl(settings.goal, { decimals: false }) : "automática"} />
            <Info label="Margem e equilíbrio" value={`${Math.round(settings.margin * 100)}% · ROAS ${(1 / settings.margin).toFixed(1).replace(".", ",")}`} />
            <Info label="Verba mensal" value={settings.budget ? brl(settings.budget, { decimals: false }) : "automática"} />
            <Info label="Período e atribuição" value={`${PERIODS.find((p) => p.value === settings.period)?.label} · ${ATTRIBUTIONS.find((a) => a.value === settings.attribution)?.label}`} />
          </dl>
          {atLimit ? (
            <div className="mt-5 flex flex-col gap-3 rounded-control border border-warning/60 bg-warning/10 p-4 text-[14px] sm:flex-row sm:items-center sm:justify-between">
              <p>
                O plano {TIER_LABEL[ws.tier]} permite {ent.maxDashboards} dashboards e você já tem {dashboards.length}.
              </p>
              <a href={waLink(msgUpgrade(TIER_LABEL[ws.tier], "um plano maior", "Preciso de mais dashboards."))} target="_blank" rel="noopener noreferrer" className={`${btn.small} shrink-0`}>
                <WhatsAppIcon size={16} /> Fazer upgrade
              </a>
            </div>
          ) : (
            <div className="relative mt-6 overflow-hidden rounded-card">
              <button type="button" onClick={generate} disabled={generating} className={`${btn.primary} w-full sm:w-auto`}>
                {generating ? "Gerando…" : editing ? "Salvar e abrir" : "Gerar dashboard"}
              </button>
            </div>
          )}
          {generating && (
            <div className="relative mt-4 h-24 overflow-hidden rounded-card border border-line bg-bg" data-anim="on" aria-hidden>
              <div className="scanner" />
              <div className="m-unveil grid h-full grid-cols-4 gap-2 p-3">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className="rounded-[8px] bg-card" />
                ))}
              </div>
            </div>
          )}
        </Section>
      )}

      {t && step > 1 && (
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={() => go(step - 1)} className={`${btn.ghost} h-10`}>
            <ArrowLeft size={16} aria-hidden /> Voltar
          </button>
          {step < 5 && (
            <button type="button" onClick={() => go(step + 1)} disabled={step === 3 && pages.length === 0} className={btn.small}>
              Continuar <ArrowRight size={16} aria-hidden />
            </button>
          )}
        </div>
      )}
      {t && <p className="text-[12px] text-fg-2">O progresso fica salvo neste navegador a cada passo.</p>}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[12.5px] text-fg-2">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

/** Logo (upload em memória, guardado como dataURL), cor principal e "ocultar VYZ". */
export function BrandFields({ value, onChange }: { value: { logo?: string; color: string; hideVyz: boolean }; onChange: (v: { logo?: string; color: string; hideVyz: boolean }) => void }) {
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-start">
      <div className="flex size-24 items-center justify-center overflow-hidden rounded-card border border-dashed border-line bg-bg">
        {value.logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- dataURL local
          <img src={value.logo} alt="Logo atual" className="max-h-20 max-w-20 object-contain" />
        ) : (
          <Lock size={18} aria-hidden className="text-fg-2" />
        )}
      </div>
      <div className="space-y-3">
        <label className="block text-[13px] font-medium">
          Logo (PNG, JPG ou SVG, até 300 KB)
          <input
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            className="mt-1 block w-full text-[13px] file:mr-3 file:rounded-control file:border file:border-line file:bg-card file:px-3 file:py-1.5 file:text-fg"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              if (f.size > 300_000) return setError("Use uma imagem de até 300 KB.");
              const r = new FileReader();
              r.onload = () => {
                setError(null);
                onChange({ ...value, logo: String(r.result) });
              };
              r.readAsDataURL(f);
            }}
          />
        </label>
        {error && <p className="text-[12px] text-error-fg">{error}</p>}
        <label className="flex items-center gap-3 text-[13px] font-medium">
          Cor principal
          <input type="color" value={value.color} onChange={(e) => onChange({ ...value, color: e.target.value })} className="h-9 w-14 rounded-control border border-line bg-field" />
          <span className="text-fg-2 tnum">{value.color.toUpperCase()}</span>
        </label>
        <Checkbox label="Ocultar a marca VYZ (dashboard, link e PDF)" checked={value.hideVyz} onChange={(hideVyz) => onChange({ ...value, hideVyz })} />
        {value.logo && (
          <button type="button" className={`${btn.ghost} h-8 px-2 text-[13px]`} onClick={() => onChange({ ...value, logo: undefined })}>
            Remover logo
          </button>
        )}
      </div>
    </div>
  );
}
