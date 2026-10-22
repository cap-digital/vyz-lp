"use client";

import { Check, Copy, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { EmptyState, PageHeader, PendingChip } from "@/components/ui/kit";
import { btn } from "@/components/ui/styles";
import type { ExportRecord, Report, ShareLink } from "@/features/workspace/types";
import { ddmmyyyy } from "@/lib/format";
import { useHydrated } from "@/lib/hooks";
import { useCollection } from "@/lib/store/hooks";
import { store } from "@/lib/store/store";
import { reportWhen } from "./ReportModal";
import { copyText } from "./ShareModal";

const date = (iso: string | null) => (iso ? ddmmyyyy(new Date(iso)) : "Nunca");

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-card border border-line bg-card">
      <table className="w-full min-w-[640px] text-left text-[13.5px]">
        <thead>
          <tr className="border-b border-line text-fg-2">
            {head.map((h) => (
              <th key={h} scope="col" className="px-4 py-2.5 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export function SharePage() {
  const links = useCollection<ShareLink>("shareLinks");
  const reports = useCollection<Report>("reports");
  const exportsList = useCollection<ExportRecord>("exports");
  const [copied, setCopied] = useState<string | null>(null);
  // "agora" só no navegador (no HTML pré-renderizado não há data)
  const now = useHydrated() ? new Date().toISOString() : "";

  return (
    <div className="space-y-10">
      <PageHeader eyebrow="Compartilhar" title="Links, relatórios e exportações" text="Tudo o que saiu dos seus dashboards para os clientes." />

      <section className="space-y-3" aria-labelledby="h-links">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="h-links" className="title text-lg">
            Links
          </h2>
          <PendingChip label="Links com dados reais e revogação precisam do Supabase" detail="Hoje a revogação vale só neste navegador." />
        </div>
        {links.length === 0 ? (
          <EmptyState
            title="Nenhum link ainda"
            text="Abra um dashboard e use Compartilhar para gerar um link só de leitura."
            action={
              <Link href="/painel/dashboards" className={btn.small}>
                Ver dashboards
              </Link>
            }
          />
        ) : (
          <Table head={["Dashboard", "Criado em", "Expira", "Status", ""]}>
            {links.map((l) => {
              const expired = !!now && !!l.expiresAt && l.expiresAt < now;
              return (
                <tr key={l.id}>
                  <td className="px-4 py-3 font-medium">
                    {l.dashboardName}
                    {l.hideSpend && <span className="ml-2 text-[11.5px] text-fg-2">sem investimento</span>}
                  </td>
                  <td className="px-4 py-3 tnum">{date(l.createdAt)}</td>
                  <td className="px-4 py-3 tnum">{date(l.expiresAt)}</td>
                  <td className="px-4 py-3">{l.revoked ? <span className="text-error-fg">Revogado</span> : expired ? <span className="text-warning">Expirado</span> : <span className="text-accent">Ativo</span>}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="inline-flex h-8 items-center gap-1 rounded-control border border-line px-2.5 text-[12.5px] hover:border-accent"
                        onClick={async () => {
                          await copyText(l.url);
                          setCopied(l.id);
                        }}
                      >
                        {copied === l.id ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />} {copied === l.id ? "Copiado" : "Copiar"}
                      </button>
                      {!l.revoked && (
                        <button type="button" className="inline-flex h-8 items-center rounded-control border border-line px-2.5 text-[12.5px] hover:border-error" onClick={() => store.put("shareLinks", { ...l, revoked: true })}>
                          Revogar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="h-rel">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="h-rel" className="title text-lg">
            Relatórios agendados
          </h2>
          <PendingChip label="Envio agendado precisa de backend" detail="Os agendamentos ficam salvos aqui; o envio automático entra com o servidor." />
        </div>
        {reports.length === 0 ? (
          <p className="rounded-card border border-dashed border-line p-6 text-[14px] text-fg-2">Nenhum relatório agendado. Use “Agendar relatório” num dashboard.</p>
        ) : (
          <Table head={["Dashboard", "Quando", "Formato", "Destinatários", ""]}>
            {reports.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 font-medium">{r.dashboardName}</td>
                <td className="px-4 py-3">{reportWhen(r)}</td>
                <td className="px-4 py-3">{r.format === "pdf" ? "PDF por e-mail" : "Resumo no WhatsApp"}</td>
                <td className="max-w-[16rem] truncate px-4 py-3 text-fg-2">{r.recipients}</td>
                <td className="px-4 py-3 text-right">
                  <button type="button" aria-label={`Remover agendamento de ${r.dashboardName}`} className="inline-flex size-8 items-center justify-center rounded-control border border-line hover:border-error" onClick={() => store.remove("reports", r.id)}>
                    <Trash2 size={14} aria-hidden />
                  </button>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="h-exp">
        <h2 id="h-exp" className="title text-lg">
          Histórico de exportações
        </h2>
        {exportsList.length === 0 ? (
          <p className="rounded-card border border-dashed border-line p-6 text-[14px] text-fg-2">Nenhum PDF exportado ainda.</p>
        ) : (
          <Table head={["Dashboard", "Formato", "Data"]}>
            {exportsList.map((x) => (
              <tr key={x.id}>
                <td className="px-4 py-3 font-medium">{x.dashboardName}</td>
                <td className="px-4 py-3">PDF (A4 paisagem)</td>
                <td className="px-4 py-3 tnum">{date(x.createdAt)}</td>
              </tr>
            ))}
          </Table>
        )}
      </section>
    </div>
  );
}
