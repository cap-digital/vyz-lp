import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { SharePage } from "@/features/share/SharePage";
import { hasRole } from "@/features/workspace/session";
import { requireWorkspace } from "@/server/auth/workspace";
import { getShareCenter } from "@/server/share/queries";

export const metadata: Metadata = { title: "Compartilhar" };

export default function Page() {
  return (
    <Suspense fallback={<div className="h-72 animate-pulse rounded-card bg-card motion-reduce:animate-none" aria-busy="true" aria-label="Carregando" />}>
      <Compartilhar />
    </Suspense>
  );
}

// connection(): a situação dos links (expirado ou não) depende da hora atual.
async function Compartilhar() {
  await connection();
  const session = await requireWorkspace({ next: "/painel/compartilhar" });
  const center = await getShareCenter();
  return <SharePage center={center} now={new Date().toISOString()} timeZone={session.workspace.timezone || "America/Sao_Paulo"} canEdit={hasRole(session.role, "member")} />;
}
