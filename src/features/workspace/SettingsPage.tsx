"use client";

import { useState } from "react";
import { LockBadge, Modal, PageHeader, PendingChip, TextField } from "@/components/ui/kit";
import { btn } from "@/components/ui/styles";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { BrandFields } from "@/features/dashboards/NewDashboardFlow";
import { availableIn, TIER_LABEL } from "@/features/pricing/entitlements";
import { store, type Collection } from "@/lib/store/store";
import { msgUpgrade, waLink } from "@/lib/whatsapp";
import { useWorkspace } from "./workspace";

const COLLECTIONS: Collection[] = ["accounts", "dashboards", "landingPages", "shareLinks", "reports", "exports"];

export function SettingsPage() {
  const { ws, update } = useWorkspace();
  const [clearing, setClearing] = useState(false);
  const white = ws.tier === "personalizado";

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Configurações" title="Workspace e marca" />
      <section className="space-y-4 rounded-card border border-line bg-card p-5" aria-labelledby="h-ws">
        <h2 id="h-ws" className="title text-lg">
          Workspace
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Nome do workspace" value={ws.name} onChange={(name) => update({ name })} />
          <TextField label="Seu nome (para a saudação)" value={ws.userName} onChange={(userName) => update({ userName })} />
        </div>
        <PendingChip label="Precisa conectar Supabase" detail="Login, membros da equipe e o plano real entram com o backend. Hoje tudo fica salvo neste navegador." />
      </section>

      <section className="space-y-4 rounded-card border border-line bg-card p-5" aria-labelledby="h-marca">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="h-marca" className="title text-lg">
            Marca própria (white-label)
          </h2>
          {!white && <LockBadge label={availableIn("personalizado")} />}
        </div>
        {white ? (
          <>
            <p className="text-[14px] text-fg-2">Vale como padrão para os novos dashboards: logo e cor no dashboard, no link e no PDF.</p>
            <BrandFields value={ws.brand} onChange={(brand) => update({ brand })} />
          </>
        ) : (
          <div className="flex flex-col gap-3 text-[14px] sm:flex-row sm:items-center sm:justify-between">
            <p className="text-fg-2">Seu logo e suas cores no dashboard, no link e no PDF, sem a marca VYZ. Para agências que entregam como se fosse delas.</p>
            <a href={waLink(msgUpgrade(TIER_LABEL[ws.tier], "Personalizado", "Quero a marca própria."))} target="_blank" rel="noopener noreferrer" className={`${btn.small} shrink-0`}>
              <WhatsAppIcon size={16} /> Falar com especialista
            </a>
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-card border border-line bg-card p-5" aria-labelledby="h-dados">
        <h2 id="h-dados" className="title text-lg">
          Dados deste navegador
        </h2>
        <p className="text-[14px] text-fg-2">Contas, dashboards, landing pages, links e relatórios ficam salvos aqui até o backend chegar.</p>
        <button type="button" onClick={() => setClearing(true)} className={`${btn.ghost} h-9 border border-line`}>
          Apagar dados locais
        </button>
      </section>

      <Modal open={clearing} onClose={() => setClearing(false)} title="Apagar dados locais">
        <div className="space-y-4 text-[14px]">
          <p>Isso apaga contas, dashboards, landing pages, links, relatórios e rascunhos deste navegador. Não dá para desfazer.</p>
          <div className="flex gap-2">
            <button
              type="button"
              className={`${btn.small} bg-error`}
              onClick={() => {
                COLLECTIONS.forEach((c) => store.list(c).forEach((x) => store.remove(c, x.id)));
                store.setDoc("draft:dashboard", null);
                store.setDoc("draft:landing", null);
                setClearing(false);
              }}
            >
              Apagar
            </button>
            <button type="button" className={`${btn.ghost} h-9`} onClick={() => setClearing(false)}>
              Cancelar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
