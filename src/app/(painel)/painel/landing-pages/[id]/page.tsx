import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { LandingEditor } from "@/features/landing-pages/LandingEditor";
import { hasRole } from "@/features/workspace/session";
import { requireWorkspace } from "@/server/auth/workspace";
import { getLandingPage, listLandingVersions } from "@/server/landing-pages/queries";

export const metadata: Metadata = { title: "Landing page" };

export default function Page({ params, searchParams }: PageProps<"/painel/landing-pages/[id]">) {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-card bg-card motion-reduce:animate-none" aria-busy="true" aria-label="Carregando" />}>
      <Editor params={params} searchParams={searchParams} />
    </Suspense>
  );
}

// Avisos que o fluxo "Nova landing page" deixa na URL (códigos, nunca texto livre).
function noticeFor(q: Record<string, string | string[] | undefined>, limit: number): string | null {
  const parts: string[] = [];
  if (q.aviso === "limite") parts.push(`A página foi salva como rascunho: seu plano permite até ${limit} ${limit === 1 ? "landing page publicada" : "landing pages publicadas"}.`);
  if (q.aviso === "rascunho") parts.push("A página foi salva como rascunho: não foi possível publicar agora.");
  if (q.logo === "falhou") parts.push("O logo não foi enviado. Envie de novo na aba Conteúdo.");
  return parts.length ? parts.join(" ") : null;
}

async function Editor({ params, searchParams }: Pick<PageProps<"/painel/landing-pages/[id]">, "params" | "searchParams">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const session = await requireWorkspace({ next: `/painel/landing-pages/${encodeURIComponent(id)}` });
  if (!z.uuid().safeParse(id).success) notFound();
  const [lp, versions] = await Promise.all([getLandingPage(id), listLandingVersions(id)]);
  if (!lp) notFound();
  return (
    <LandingEditor
      key={lp.id}
      initial={lp}
      versions={versions}
      canEdit={hasRole(session.role, "member")}
      limit={session.access.entitlements?.maxLandingPages ?? 0}
      publishedCount={session.usage.publishedLandingPages}
      hideBadge={session.workspace.hideVyzBrand && !!session.access.entitlements?.whiteLabel}
      notice={noticeFor(query, session.access.entitlements?.maxLandingPages ?? 0)}
    />
  );
}
