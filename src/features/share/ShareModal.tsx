"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Checkbox, Modal, PendingChip, SelectField } from "@/components/ui/kit";
import { btn } from "@/components/ui/styles";
import type { Dashboard, ShareLink } from "@/features/workspace/types";
import { newId } from "@/lib/ids";
import { store } from "@/lib/store/store";
import { encodeShare, payloadFrom } from "./encode";

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
}

/** Gera o link /r/[id] com a configuração no fragmento (#). */
export function ShareModal({ open, onClose, dashboard }: { open: boolean; onClose: () => void; dashboard: Dashboard }) {
  const [expires, setExpires] = useState<"7" | "30" | "nunca">("30");
  const [hideSpend, setHideSpend] = useState(false);
  const [link, setLink] = useState<ShareLink | null>(null);
  const [copied, setCopied] = useState(false);

  async function create() {
    const days = expires === "nunca" ? null : Number(expires);
    const code = await encodeShare(payloadFrom(dashboard, { expiresInDays: days, hideSpend }));
    const id = newId("r_");
    const now = Date.now();
    const l: ShareLink = {
      id,
      dashboardId: dashboard.id,
      dashboardName: dashboard.name,
      url: `${window.location.origin}/r/${id}#${code}`,
      createdAt: new Date(now).toISOString(),
      expiresAt: days ? new Date(now + days * 86_400_000).toISOString() : null,
      hideSpend,
      revoked: false,
    };
    store.put("shareLinks", l);
    setLink(l);
    setCopied(false);
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        onClose();
        setLink(null);
      }}
      title="Compartilhar dashboard"
    >
      <div className="space-y-4 text-[14px]">
        <p className="text-fg-2">O link abre o dashboard só para leitura, com dados de amostra{dashboard.brand ? " e a sua marca" : ""}.</p>
        <SelectField
          label="Expiração"
          value={expires}
          onChange={(v) => setExpires(v as typeof expires)}
          options={[
            { value: "7", label: "7 dias" },
            { value: "30", label: "30 dias" },
            { value: "nunca", label: "Nunca" },
          ]}
        />
        <Checkbox label="Esconder valores de investimento" checked={hideSpend} onChange={setHideSpend} />
        <button type="button" onClick={create} className={btn.small}>
          Gerar link
        </button>
        {link && (
          <div className="space-y-2 rounded-control border border-line bg-card p-3">
            <p className="break-all text-[12.5px] text-fg-2 tnum">{link.url}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={`${btn.small}`}
                onClick={async () => {
                  await copyText(link.url);
                  setCopied(true);
                }}
              >
                {copied ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />} {copied ? "Copiado" : "Copiar link"}
              </button>
              <a href={link.url} target="_blank" rel="noopener noreferrer" className={`${btn.ghost} h-9`}>
                Abrir
              </a>
            </div>
            <span className="sr-only" aria-live="polite">
              {copied ? "Link copiado" : ""}
            </span>
          </div>
        )}
        <PendingChip label="Links com dados reais e revogação precisam do Supabase" detail="Hoje a revogação vale só neste navegador, e o link mostra dados de amostra." />
      </div>
    </Modal>
  );
}
