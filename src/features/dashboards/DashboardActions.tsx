"use client";

// Botões do topo do dashboard no painel: editar, duplicar, compartilhar,
// exportar PDF, agendar relatório e apagar. Tudo passa pelo servidor.

import { CalendarClock, Copy, FileDown, Pencil, Share2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ReportModal } from "@/features/share/ReportModal";
import { ShareModal } from "@/features/share/ShareModal";
import { deleteDashboard, duplicateDashboard, recordExport } from "@/server/dashboards/actions";
import { DeleteDashboardModal } from "./DashboardsList";

const action =
  "inline-flex h-9 items-center gap-1.5 rounded-control border border-line px-3 text-[13.5px] font-medium outline-none hover:border-accent focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent disabled:opacity-50";

type Props = {
  dashboard: { id: string; name: string; live: boolean };
  /** Período aberto e páginas (vão para o histórico da exportação). */
  period: string;
  pages: number;
  /** Exportação própria (dashboards de exemplo imprimem todas as páginas); padrão: imprime a tela. */
  onExport?: () => void;
};

/** Registra a exportação no servidor e abre a impressão (Salvar como PDF). */
export function useExport(input: { dashboardId: string; period: string; pages: number }, print: () => void) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = () => {
    setError(null);
    start(async () => {
      const r = await recordExport(input);
      if (!r.ok) return setError(r.error.message);
      print();
    });
  };
  return { run, pending, error };
}

export function DashboardActions({ dashboard, period, pages, onExport }: Props) {
  const router = useRouter();
  const [share, setShare] = useState(false);
  const [report, setReport] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const exporter = useExport({ dashboardId: dashboard.id, period, pages }, onExport ?? (() => window.print()));

  // a mensagem de erro some sozinha
  useEffect(() => {
    if (!error) return;
    const t = window.setTimeout(() => setError(null), 6000);
    return () => window.clearTimeout(t);
  }, [error]);

  function duplicate() {
    setError(null);
    start(async () => {
      const r = await duplicateDashboard(dashboard.id);
      if (r && !r.ok) setError(r.error.message);
    });
  }

  function remove() {
    setError(null);
    start(async () => {
      const r = await deleteDashboard(dashboard.id);
      if (!r.ok) return setError(r.error.message);
      setRemoving(false);
      router.push("/painel/dashboards");
    });
  }

  const shown = error ?? exporter.error;
  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <Link href={`/painel/dashboards/${dashboard.id}/editar`} className={action}>
        <Pencil size={15} aria-hidden /> Editar
      </Link>
      <button type="button" onClick={duplicate} disabled={pending} className={action}>
        <Copy size={15} aria-hidden /> {pending && !removing ? "Duplicando…" : "Duplicar"}
      </button>
      <button type="button" onClick={() => setShare(true)} className={action}>
        <Share2 size={15} aria-hidden /> Compartilhar
      </button>
      <button type="button" onClick={exporter.run} disabled={exporter.pending} className={action}>
        <FileDown size={15} aria-hidden /> {exporter.pending ? "Preparando…" : "Exportar PDF"}
      </button>
      <button type="button" onClick={() => setReport(true)} className={action}>
        <CalendarClock size={15} aria-hidden /> Agendar relatório
      </button>
      <button type="button" onClick={() => setRemoving(true)} aria-label={`Apagar ${dashboard.name}`} className={`${action} px-2.5 hover:border-error`}>
        <Trash2 size={15} aria-hidden />
      </button>
      {shown && (
        <p role="alert" className="w-full rounded-control bg-error-soft px-3 py-2 text-[13px] text-error-fg">
          {shown}
        </p>
      )}
      <ShareModal open={share} onClose={() => setShare(false)} dashboard={dashboard} />
      <ReportModal open={report} onClose={() => setReport(false)} dashboard={dashboard} />
      <DeleteDashboardModal dashboard={removing ? dashboard : null} pending={pending} error={removing ? error : null} onConfirm={remove} onClose={() => setRemoving(false)} />
    </div>
  );
}
