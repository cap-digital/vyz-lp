import type { Metadata } from "next";
import { Suspense } from "react";
import { HomePage } from "@/features/workspace/HomePage";
import { PageSkeleton } from "@/features/workspace/PageSkeleton";
import { requireWorkspace } from "@/server/auth/workspace";
import { getHomeData } from "@/server/workspace/queries";

export const metadata: Metadata = { title: "Início" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton label="Carregando o início" blocks={[22, 64, 32]} />}>
      <Inicio />
    </Suspense>
  );
}

// Sessão e banco são dados da requisição: dentro do Suspense.
async function Inicio() {
  await requireWorkspace({ next: "/painel" });
  return <HomePage data={await getHomeData()} />;
}
