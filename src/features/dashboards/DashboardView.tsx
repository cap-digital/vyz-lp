"use client";

import { CalendarClock, Copy, FileDown, Pencil, Share2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/kit";
import { btn } from "@/components/ui/styles";
import { ReportModal } from "@/features/share/ReportModal";
import { ShareModal } from "@/features/share/ShareModal";
import type { Dashboard, ExportRecord } from "@/features/workspace/types";
import { newId } from "@/lib/ids";
import { useItem } from "@/lib/store/hooks";
import { store } from "@/lib/store/store";
import { DashboardBody } from "./DashboardBody";

export function DashboardView({ id }: { id: string }) {
  const d = useItem<Dashboard>("dashboards", id);
  const router = useRouter();
  const params = useSearchParams();
  const [share, setShare] = useState(false);
  const [report, setReport] = useState(false);
  const [printing, setPrinting] = useState(false);
  const fresh = params.get("novo") === "1";

  useEffect(() => {
    if (!printing || !d) return;
    const done = () => setPrinting(false);
    window.addEventListener("afterprint", done, { once: true });
    // espera os gráficos medirem a largura do A4 (ResizeObserver + 1 quadro)
    const t = window.setTimeout(() => {
      window.print();
      const rec: ExportRecord = { id: newId("x_"), dashboardId: d.id, dashboardName: d.name, kind: "pdf", createdAt: new Date().toISOString() };
      store.put("exports", rec);
    }, 300);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("afterprint", done);
    };
  }, [printing, d]);

  if (d === undefined) return <div className="h-64 animate-pulse rounded-card bg-card" aria-label="Carregando" />;
  if (d === null)
    return (
      <EmptyState
        title="Dashboard não encontrado"
        text="Ele pode ter sido removido, ou foi criado em outro navegador (por enquanto, tudo fica salvo só neste navegador)."
        action={
          <Link href="/painel/dashboards" className={btn.small}>
            Ver meus dashboards
          </Link>
        }
      />
    );

  function duplicate() {
    if (!d) return;
    const now = new Date().toISOString();
    const copy: Dashboard = { ...d, id: newId("d_"), name: `${d.name} (cópia)`, createdAt: now, updatedAt: now };
    store.put("dashboards", copy);
    router.push(`/painel/dashboards/${copy.id}`);
  }

  const action = "inline-flex h-9 items-center gap-1.5 rounded-control border border-line px-3 text-[13.5px] font-medium hover:border-accent";
  return (
    <>
      <DashboardBody
        spec={d}
        assemble={fresh}
        printing={printing}
        actions={
          <>
            <Link href={`/painel/dashboards/novo?editar=${d.id}&passo=3`} className={action}>
              <Pencil size={15} aria-hidden /> Editar
            </Link>
            <button type="button" onClick={duplicate} className={action}>
              <Copy size={15} aria-hidden /> Duplicar
            </button>
            <button type="button" onClick={() => setShare(true)} className={action}>
              <Share2 size={15} aria-hidden /> Compartilhar
            </button>
            <button type="button" onClick={() => setPrinting(true)} className={action}>
              <FileDown size={15} aria-hidden /> Exportar PDF
            </button>
            <button type="button" onClick={() => setReport(true)} className={action}>
              <CalendarClock size={15} aria-hidden /> Agendar relatório
            </button>
          </>
        }
      />
      <ShareModal open={share} onClose={() => setShare(false)} dashboard={d} />
      <ReportModal open={report} onClose={() => setReport(false)} dashboard={d} />
    </>
  );
}
