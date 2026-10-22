"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { EmptyState, Modal, PageHeader, PendingChip } from "@/components/ui/kit";
import { btn } from "@/components/ui/styles";
import type { Account, Dashboard } from "@/features/workspace/types";
import { useWorkspace } from "@/features/workspace/workspace";
import { useCollection } from "@/lib/store/hooks";
import { store } from "@/lib/store/store";
import { AccountForm, accountIdLabel } from "./AccountForm";
import { PLATFORM_ORDER, PLATFORMS } from "./platforms";

export function UsageBar({ used, limit, label }: { used: number; limit: number; label: string }) {
  const over = used > limit;
  return (
    <div className="min-w-[12rem]">
      <p className="flex justify-between gap-3 text-[13px]">
        <span className="text-fg-2">{label}</span>
        <span className={`font-semibold tnum ${over ? "text-error-fg" : "text-fg"}`}>
          {used}/{limit}
        </span>
      </p>
      <div className="mt-1.5 h-2 rounded-full bg-line">
        <div className={`h-full rounded-full ${over ? "bg-error" : used / limit >= 0.8 ? "bg-warning" : "bg-accent"}`} style={{ width: `${Math.min(100, (used / Math.max(1, limit)) * 100)}%` }} />
      </div>
    </div>
  );
}

export function usedIn(account: Account, dashboards: Dashboard[]): Dashboard[] {
  return dashboards.filter((d) => Object.values(d.accounts).includes(account.id));
}

export function AccountsPage() {
  const { ws } = useWorkspace();
  const accounts = useCollection<Account>("accounts");
  const dashboards = useCollection<Dashboard>("dashboards");
  const [editing, setEditing] = useState<Account | "new" | null>(null);
  const [removing, setRemoving] = useState<Account | null>(null);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Contas"
        title="Contas e IDs"
        text="Cadastre as contas de anúncio, as propriedades do GA4 e os CRMs pelo ID. Cada conta entra no limite do plano."
        actions={
          <button type="button" onClick={() => setEditing("new")} className={btn.small}>
            <Plus size={16} aria-hidden /> Adicionar conta
          </button>
        }
      />
      <div className="flex flex-wrap items-center gap-4 rounded-card border border-line bg-card p-4">
        <UsageBar used={accounts.length} limit={ws.contractedAccounts} label="Contas cadastradas × contratadas" />
        <PendingChip label="Conexão automática (OAuth) em breve" detail="As contas ficam como “Aguardando conexão”. Enquanto isso, os dashboards usam dados de amostra." />
      </div>

      {accounts.length === 0 ? (
        <EmptyState
          title="Nenhuma conta ainda"
          text="Comece pela BM do Meta e pela conta do Google Ads do seu cliente. Você também pode cadastrar direto no fluxo de um novo dashboard."
          action={
            <button type="button" onClick={() => setEditing("new")} className={btn.small}>
              <Plus size={16} aria-hidden /> Adicionar conta
            </button>
          }
        />
      ) : (
        <div className="space-y-6">
          {PLATFORM_ORDER.filter((p) => accounts.some((a) => a.platform === p)).map((p) => (
            <section key={p} aria-labelledby={`pl-${p}`}>
              <h2 id={`pl-${p}`} className="title mb-2 text-lg">
                {PLATFORMS[p].name}
              </h2>
              <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-card">
                {accounts
                  .filter((a) => a.platform === p)
                  .map((a) => {
                    const used = usedIn(a, dashboards);
                    return (
                      <li key={a.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{a.name}</p>
                          <p className="text-[13px] text-fg-2 tnum">{accountIdLabel(a)}</p>
                          <p className="mt-1 text-[12.5px] text-fg-2">{used.length ? `Usada em: ${used.map((d) => d.name).join(", ")}` : "Não usada em nenhum dashboard"}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="rounded-chip border border-dashed border-line px-2.5 py-0.5 text-[12px] text-fg-2">Aguardando conexão</span>
                          <button type="button" aria-label={`Editar ${a.name}`} onClick={() => setEditing(a)} className="inline-flex size-9 items-center justify-center rounded-control border border-line hover:border-accent">
                            <Pencil size={15} aria-hidden />
                          </button>
                          <button type="button" aria-label={`Remover ${a.name}`} onClick={() => setRemoving(a)} className="inline-flex size-9 items-center justify-center rounded-control border border-line hover:border-error">
                            <Trash2 size={15} aria-hidden />
                          </button>
                        </div>
                      </li>
                    );
                  })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Adicionar conta" : "Editar conta"}>
        {editing && <AccountForm account={editing === "new" ? undefined : editing} onSaved={() => setEditing(null)} onCancel={() => setEditing(null)} />}
      </Modal>
      <Modal open={removing !== null} onClose={() => setRemoving(null)} title="Remover conta">
        {removing && (
          <div className="space-y-4 text-[14px]">
            <p>
              Remover <strong>{removing.name}</strong>?
            </p>
            {usedIn(removing, dashboards).length > 0 ? (
              <p className="rounded-control border border-warning/60 bg-warning/10 p-3">
                Esta conta está em: {usedIn(removing, dashboards).map((d) => d.name).join(", ")}. Esses dashboards continuam abrindo com dados de amostra, mas ficam sem a conta.
              </p>
            ) : (
              <p className="text-fg-2">Ela não está em nenhum dashboard.</p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                className={`${btn.small} bg-error`}
                onClick={() => {
                  store.remove("accounts", removing.id);
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
