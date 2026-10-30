"use client";

import { Pause, Play, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";
import { EmptyState, PageHeader, PendingChip } from "@/components/ui/kit";
import { btn } from "@/components/ui/styles";
import { int } from "@/lib/format";
import { deleteScheduledReport, revokeShareLink, setReportActive } from "@/server/share/actions";
import { dateIn, LINK_STATUS_LABEL, linkStatus } from "./links";
import { FORMAT_LABEL, scheduleLabel } from "./schedule";
import type { ShareCenter } from "./types";

function Table({ head, children, label }: { head: string[]; children: ReactNode; label: string }) {
  return (
    <div className="overflow-x-auto rounded-card border border-line bg-card">
      <table className="w-full min-w-[640px] text-left text-[13.5px]" aria-label={label}>
        <thead>
          <tr className="border-b border-line text-fg-2">
            {head.map((h, i) => (
              <th key={h || i} scope="col" className="px-4 py-2.5 font-medium">
                {h || <span className="sr-only">Ações</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

const small = "inline-flex h-8 items-center gap-1 rounded-control border border-line px-2.5 text-[12.5px] outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:opacity-50";

type Props = {
  center: ShareCenter;
  /** Hora do servidor (situação dos links igual no servidor e no navegador). */
  now: string;
  /** Fuso do workspace para as datas. */
  timeZone: string;
  canEdit: boolean;
};

export function SharePage({ center, now, timeZone, canEdit }: Props) {
  const date = (iso: string | null, empty = "Nunca") => (iso ? dateIn(iso, timeZone) : empty);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [, start] = useTransition();
  const at = new Date(now);

  function run(id: string, task: () => Promise<{ ok: boolean; error?: { message: string } }>) {
    setError(null);
    setBusy(id);
    start(async () => {
      const r = await task();
      if (!r.ok) setError(r.error?.message ?? "Algo deu errado. Tente de novo.");
      setBusy(null);
    });
  }

  return (
    <div className="space-y-10">
      <PageHeader eyebrow="Compartilhar" title="Links, relatórios e exportações" text="Tudo o que saiu dos seus dashboards para os clientes." />
      {error && (
        <p role="alert" className="rounded-control bg-error-soft px-3 py-2 text-[13.5px] text-error-fg">
          {error}
        </p>
      )}

      <section className="space-y-3" aria-labelledby="h-links">
        <div>
          <h2 id="h-links" className="title text-lg">
            Links
          </h2>
          <p className="text-[13.5px] text-fg-2">Só leitura. O link completo aparece uma vez, ao gerar; aqui fica o final dele para você reconhecer.</p>
        </div>
        {center.links.length === 0 ? (
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
          <Table label="Links compartilhados" head={["Dashboard", "Link", "Criado em", "Expira", "Visitas", "Situação", ""]}>
            {center.links.map((l) => {
              const status = linkStatus(l, at);
              return (
                <tr key={l.id}>
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/painel/dashboards/${l.dashboardId}`} className="hover:text-accent">
                      {l.dashboardName}
                    </Link>
                    {l.hideSpend && <span className="ml-2 text-[11.5px] font-normal text-fg-2">sem investimento</span>}
                  </td>
                  <td className="px-4 py-3 text-fg-2 tnum">…{l.tokenHint}</td>
                  <td className="px-4 py-3 tnum">{date(l.createdAt)}</td>
                  <td className="px-4 py-3 tnum">{date(l.expiresAt)}</td>
                  <td className="px-4 py-3 tnum">
                    {int(l.viewCount)}
                    {l.lastViewedAt && <span className="block text-[11.5px] text-fg-2">última em {date(l.lastViewedAt)}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={status === "active" ? "text-accent" : status === "expired" ? "text-warning" : "text-error-fg"}>{LINK_STATUS_LABEL[status]}</span>
                    {l.revokedAt && <span className="block text-[11.5px] text-fg-2">em {date(l.revokedAt)}</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {status === "active" && l.canRevoke && (
                      <button type="button" disabled={busy === l.id} className={`${small} hover:border-error`} onClick={() => run(l.id, () => revokeShareLink(l.id))}>
                        {busy === l.id ? "Revogando…" : "Revogar"}
                      </button>
                    )}
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
          <PendingChip label="Envio automático pendente" detail="Os agendamentos ficam gravados. O envio por e-mail e WhatsApp entra quando o serviço de envio estiver ligado." />
        </div>
        {center.reports.length === 0 ? (
          <p className="rounded-card border border-dashed border-line p-6 text-[14px] text-fg-2">Nenhum relatório agendado. Use “Agendar relatório” num dashboard.</p>
        ) : (
          <Table label="Relatórios agendados" head={["Dashboard", "Quando", "Formato", "Destinatários", "Próximo envio", ""]}>
            {center.reports.map((r) => (
              <tr key={r.id} className={r.isActive ? "" : "text-fg-2"}>
                <td className="px-4 py-3 font-medium">{r.dashboardName}</td>
                <td className="px-4 py-3">
                  {scheduleLabel(r)}
                  {!r.isActive && <span className="block text-[11.5px]">pausado</span>}
                </td>
                <td className="px-4 py-3">{FORMAT_LABEL[r.format]}</td>
                <td className="max-w-[16rem] px-4 py-3 text-fg-2">
                  <span className="line-clamp-2 break-all">{r.recipients.join(", ")}</span>
                </td>
                <td className="px-4 py-3 tnum">{r.isActive ? date(r.nextRunAt, "—") : "—"}</td>
                <td className="px-4 py-3">
                  {canEdit && (
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        disabled={busy === r.id}
                        aria-label={`${r.isActive ? "Pausar" : "Retomar"} o relatório de ${r.dashboardName}`}
                        className={`${small} hover:border-accent`}
                        onClick={() => run(r.id, () => setReportActive(r.id, !r.isActive))}
                      >
                        {r.isActive ? <Pause size={13} aria-hidden /> : <Play size={13} aria-hidden />} {r.isActive ? "Pausar" : "Retomar"}
                      </button>
                      <button
                        type="button"
                        disabled={busy === r.id}
                        aria-label={`Apagar o relatório de ${r.dashboardName}`}
                        className={`${small} px-2 hover:border-error`}
                        onClick={() => run(r.id, () => deleteScheduledReport(r.id))}
                      >
                        <Trash2 size={14} aria-hidden />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="h-env">
        <h2 id="h-env" className="title text-lg">
          Histórico de envios
        </h2>
        {center.deliveries.length === 0 ? (
          <p className="rounded-card border border-dashed border-line p-6 text-[14px] text-fg-2">Nenhum envio ainda. Eles aparecem aqui quando o envio automático estiver ligado.</p>
        ) : (
          <Table label="Histórico de envios" head={["Dashboard", "Canal", "Destinatários", "Período", "Situação", "Data"]}>
            {center.deliveries.map((d) => (
              <tr key={d.id}>
                <td className="px-4 py-3 font-medium">{d.dashboardName ?? "Dashboard apagado"}</td>
                <td className="px-4 py-3">{d.channel === "email" ? "E-mail" : "WhatsApp"}</td>
                <td className="px-4 py-3 tnum">{d.recipientsCount}</td>
                <td className="px-4 py-3 tnum">{d.periodStart && d.periodEnd ? `${d.periodStart.split("-").reverse().join("/")} a ${d.periodEnd.split("-").reverse().join("/")}` : "—"}</td>
                <td className="px-4 py-3">{d.status === "sent" ? "Enviado" : d.status === "queued" ? "Na fila" : <span className="text-error-fg">Falhou</span>}</td>
                <td className="px-4 py-3 tnum">{date(d.createdAt)}</td>
              </tr>
            ))}
          </Table>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="h-exp">
        <h2 id="h-exp" className="title text-lg">
          Histórico de exportações
        </h2>
        {center.exports.length === 0 ? (
          <p className="rounded-card border border-dashed border-line p-6 text-[14px] text-fg-2">Nenhum PDF exportado ainda.</p>
        ) : (
          <Table label="Histórico de exportações" head={["Dashboard", "Formato", "Data"]}>
            {center.exports.map((x) => (
              <tr key={x.id}>
                <td className="px-4 py-3 font-medium">
                  {x.dashboardId ? (
                    <Link href={`/painel/dashboards/${x.dashboardId}`} className="hover:text-accent">
                      {x.dashboardName}
                    </Link>
                  ) : (
                    <>
                      {x.dashboardName} <span className="text-[11.5px] font-normal text-fg-2">(apagado)</span>
                    </>
                  )}
                </td>
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
