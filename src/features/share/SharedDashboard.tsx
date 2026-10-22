"use client";

import { useEffect, useState } from "react";
import { Wordmark } from "@/components/brand/Wordmark";
import { DashboardBody } from "@/features/dashboards/DashboardBody";
import type { ShareLink } from "@/features/workspace/types";
import { ddmmyyyy } from "@/lib/format";
import { useItem } from "@/lib/store/hooks";
import { decodeShare, isExpired, type SharePayload } from "./encode";

type State = { kind: "loading" } | { kind: "ok"; payload: SharePayload } | { kind: "invalid" } | { kind: "expired"; at: number };

/** Página pública do link (/r/[id]#payload): só leitura, sem o painel. */
export function SharedDashboard({ id }: { id: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const local = useItem<ShareLink>("shareLinks", id);

  useEffect(() => {
    let alive = true;
    const hash = window.location.hash;
    if (!hash || hash.length < 4) {
      Promise.resolve().then(() => alive && setState({ kind: "invalid" }));
      return;
    }
    decodeShare(hash)
      .then((payload) => {
        if (!alive) return;
        setState(isExpired(payload) ? { kind: "expired", at: payload.expiresAt! } : { kind: "ok", payload });
      })
      .catch(() => alive && setState({ kind: "invalid" }));
    return () => {
      alive = false;
    };
  }, []);

  const shell = (children: React.ReactNode, showVyz = true) => (
    <div className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6">
      {children}
      {showVyz && (
        <footer className="mt-10 flex items-center justify-between border-t border-line pt-4 text-[12px] text-fg-2">
          <span>Amostra · dados fictícios · somente leitura</span>
          <span className="flex items-center gap-2">
            Feito com <Wordmark className="w-10 text-accent" />
          </span>
        </footer>
      )}
    </div>
  );

  if (local?.revoked) return shell(<Message title="Link revogado" text="Quem compartilhou revogou este link." />);
  if (state.kind === "loading") return shell(<div className="h-72 animate-pulse rounded-card bg-card" aria-label="Carregando" />);
  if (state.kind === "invalid") return shell(<Message title="Link inválido" text="O endereço está incompleto. Peça um link novo para quem compartilhou." />);
  if (state.kind === "expired") return shell(<Message title="Link expirado" text={`Este link expirou em ${ddmmyyyy(new Date(state.at))}. Peça um link novo.`} />);

  const p = state.payload;
  return shell(<DashboardBody spec={p} hideSpend={p.hideSpend} />, !p.brand?.hideVyz);
}

function Message({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-card border border-dashed border-line p-10 text-center">
      <h1 className="title text-2xl">{title}</h1>
      <p className="mt-2 text-fg-2">{text}</p>
    </div>
  );
}
