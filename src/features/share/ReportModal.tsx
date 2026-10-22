"use client";

import { useState } from "react";
import { Modal, PendingChip, SelectField, TextField } from "@/components/ui/kit";
import { btn } from "@/components/ui/styles";
import type { Dashboard, Report } from "@/features/workspace/types";
import { newId } from "@/lib/ids";
import { store } from "@/lib/store/store";

export const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export function reportWhen(r: Pick<Report, "frequency" | "day">): string {
  return r.frequency === "semanal" ? `Toda ${WEEKDAYS[r.day].toLowerCase()}` : `Todo dia ${r.day}`;
}

/** Relatório agendado: salvo localmente; o envio depende de backend. */
export function ReportModal({ open, onClose, dashboard }: { open: boolean; onClose: () => void; dashboard: Dashboard }) {
  const [frequency, setFrequency] = useState<Report["frequency"]>("semanal");
  const [day, setDay] = useState(1);
  const [format, setFormat] = useState<Report["format"]>("pdf");
  const [recipients, setRecipients] = useState("");
  const [saved, setSaved] = useState(false);

  function save() {
    const r: Report = { id: newId("rp_"), dashboardId: dashboard.id, dashboardName: dashboard.name, frequency, day, format, recipients: recipients.trim(), createdAt: new Date().toISOString() };
    store.put("reports", r);
    setSaved(true);
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        onClose();
        setSaved(false);
      }}
      title="Agendar relatório"
    >
      <div className="space-y-4 text-[14px]">
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Frequência"
            value={frequency}
            onChange={(v) => {
              setFrequency(v as Report["frequency"]);
              setDay(1);
            }}
            options={[
              { value: "semanal", label: "Semanal" },
              { value: "mensal", label: "Mensal" },
            ]}
          />
          <SelectField
            label="Dia"
            value={String(day)}
            onChange={(v) => setDay(Number(v))}
            options={frequency === "semanal" ? WEEKDAYS.map((w, i) => ({ value: String(i), label: w })) : Array.from({ length: 28 }, (_, i) => ({ value: String(i + 1), label: `Dia ${i + 1}` }))}
          />
        </div>
        <SelectField
          label="Formato"
          value={format}
          onChange={(v) => setFormat(v as Report["format"])}
          options={[
            { value: "pdf", label: "PDF por e-mail" },
            { value: "whatsapp", label: "Resumo no WhatsApp" },
          ]}
        />
        <TextField label="Destinatários" value={recipients} onChange={setRecipients} placeholder={format === "pdf" ? "cliente@empresa.com, gestor@agencia.com" : "71 99999-0000"} hint="Separe por vírgula." />
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={save} disabled={!recipients.trim()} className={btn.small}>
            Salvar agendamento
          </button>
          {saved && (
            <span className="text-[13px] text-accent" role="status">
              Salvo · {reportWhen({ frequency, day })}
            </span>
          )}
        </div>
        <PendingChip label="Envio agendado precisa de backend" detail="O agendamento fica salvo neste navegador. O envio automático entra quando houver servidor." />
      </div>
    </Modal>
  );
}
