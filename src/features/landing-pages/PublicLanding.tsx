"use client";

import { useEffect, useState } from "react";
import { decodeData } from "@/features/share/encode";
import { landingTemplate, type LandingContent } from "@/features/templates/landing-pages";
import type { LandingPage } from "@/features/workspace/types";
import { useItem } from "@/lib/store/hooks";
import { LandingRenderer } from "./LandingRenderer";

/** Prévia pública da LP: lê o conteúdo do fragmento (#) ou, no mesmo navegador, do Store. */
export function PublicLanding({ id }: { id: string }) {
  const local = useItem<LandingPage>("landingPages", id);
  const [fromHash, setFromHash] = useState<{ t: string; c: LandingContent } | null | "erro">(null);

  useEffect(() => {
    const h = window.location.hash;
    if (!h) return;
    decodeData<{ t: string; c: LandingContent }>(h)
      .then(setFromHash)
      .catch(() => setFromHash("erro"));
  }, []);

  const data = fromHash && fromHash !== "erro" ? fromHash : local ? { t: local.templateId, c: local.content } : null;
  const t = data ? landingTemplate(data.t) : undefined;

  if (!data || !t) {
    const loading = local === undefined && fromHash === null;
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        {loading ? (
          <div className="h-64 w-full max-w-3xl animate-pulse rounded-card bg-card" aria-label="Carregando" />
        ) : (
          <div className="max-w-md rounded-card border border-dashed border-line p-8 text-center">
            <h1 className="title text-2xl">Prévia indisponível</h1>
            <p className="mt-2 text-fg-2">O link está incompleto ou a página foi criada em outro navegador. Peça o link de preview de novo.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <main className="min-h-dvh bg-[#f7f8f3]">
      <p className="bg-[#1e1e1e] px-4 py-1.5 text-center text-[12px] text-[#e8ece1]">Preview · a publicação no subdomínio precisa de hospedagem</p>
      <div className="mx-auto max-w-[1100px]">
        <LandingRenderer template={t} content={data.c} />
      </div>
    </main>
  );
}
