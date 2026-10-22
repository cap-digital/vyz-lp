"use client";

import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { EmptyState, Modal, PageHeader } from "@/components/ui/kit";
import { ScaledPreview } from "@/components/ui/ScaledPreview";
import { btn } from "@/components/ui/styles";
import { UsageBar } from "@/features/accounts/AccountsPage";
import { TIER_LABEL } from "@/features/pricing/entitlements";
import { dashboardTemplate } from "@/features/templates/dashboards";
import type { Dashboard, DashboardDraft } from "@/features/workspace/types";
import { useWorkspace } from "@/features/workspace/workspace";
import { useCollection, useDoc } from "@/lib/store/hooks";
import { store } from "@/lib/store/store";
import { datasetFor, pageLayout } from "./data";
import { PageView } from "./widgets/PageView";
import { makeContext } from "./widgets/Widgets";

export function DashboardThumb({ d }: { d: Dashboard }) {
  const t = dashboardTemplate(d.templateId);
  if (!t) return null;
  const ds = datasetFor(d, 30);
  return (
    <ScaledPreview height={150} width={760}>
      <div className="bg-bg p-3">
        <PageView layout={pageLayout(t, d.pages[0] ?? t.pages[0])} ctx={makeContext(ds)} variant="compact" />
      </div>
    </ScaledPreview>
  );
}

export function DashboardsList() {
  const { ws, ent } = useWorkspace();
  const dashboards = useCollection<Dashboard>("dashboards");
  const draft = useDoc<DashboardDraft>("draft:dashboard");
  const [removing, setRemoving] = useState<Dashboard | null>(null);
  const hasDraft = !!draft?.templateId && !draft.editingId;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Dashboards"
        title="Meus dashboards"
        text="Cada dashboard parte de um template e usa as contas que você cadastrou."
        actions={
          <>
            {hasDraft && (
              <Link href="/painel/dashboards/novo" className={`${btn.ghost} h-9`}>
                Continuar rascunho
              </Link>
            )}
            <Link href="/painel/dashboards/novo?novo=1" className={btn.small}>
              <Plus size={16} aria-hidden /> Novo dashboard
            </Link>
          </>
        }
      />
      <div className="rounded-card border border-line bg-card p-4">
        <UsageBar used={dashboards.length} limit={ent.maxDashboards} label={`Dashboards × limite do ${TIER_LABEL[ws.tier]}`} />
      </div>
      {dashboards.length === 0 ? (
        <EmptyState
          title="Nenhum dashboard ainda"
          text="Escolha um template, aponte as contas e mande o link para o cliente. Leva poucos minutos."
          action={
            <Link href="/painel/dashboards/novo?novo=1" className={btn.small}>
              <Plus size={16} aria-hidden /> Novo dashboard
            </Link>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {dashboards.map((d) => (
            <li key={d.id} className="group relative overflow-hidden rounded-card border border-line bg-card transition-colors hover:border-accent">
              <Link href={`/painel/dashboards/${d.id}`} className="block">
                <div className="border-b border-line">
                  <DashboardThumb d={d} />
                </div>
                <div className="p-4">
                  <p className="truncate font-semibold">{d.name}</p>
                  <p className="text-[13px] text-fg-2">
                    {d.client} · {dashboardTemplate(d.templateId)?.name}
                  </p>
                </div>
              </Link>
              <button
                type="button"
                aria-label={`Remover ${d.name}`}
                onClick={() => setRemoving(d)}
                className="absolute top-2 right-2 inline-flex size-8 items-center justify-center rounded-control border border-line bg-card opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              >
                <Trash2 size={14} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Modal open={!!removing} onClose={() => setRemoving(null)} title="Remover dashboard">
        {removing && (
          <div className="space-y-4 text-[14px]">
            <p>
              Remover <strong>{removing.name}</strong>? Os links já enviados continuam abrindo (a configuração vai no próprio link).
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className={`${btn.small} bg-error`}
                onClick={() => {
                  store.remove("dashboards", removing.id);
                  setRemoving(null);
                }}
              >
                Remover
              </button>
              <button type="button" className={`${btn.ghost} h-9`} onClick={() => setRemoving(null)}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
