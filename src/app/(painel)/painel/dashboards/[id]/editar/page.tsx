import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { EmptyState, PageHeader } from "@/components/ui/kit";
import { btn } from "@/components/ui/styles";
import { NewDashboardFlow } from "@/features/dashboards/NewDashboardFlow";
import { requireWorkspace } from "@/server/auth/workspace";
import { getDashboard, listSourceOptions } from "@/server/dashboards/queries";

export const metadata: Metadata = { title: "Editar dashboard" };

export default function Page({ params }: PageProps<"/painel/dashboards/[id]/editar">) {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Dashboards" title="Editar dashboard" />
      <Suspense fallback={<div className="h-64 animate-pulse rounded-card bg-card motion-reduce:animate-none" aria-busy="true" aria-label="Carregando" />}>
        <Editar params={params} />
      </Suspense>
    </div>
  );
}

async function Editar({ params }: { params: PageProps<"/painel/dashboards/[id]/editar">["params"] }) {
  await connection();
  const { id } = await params;
  const session = await requireWorkspace({ minRole: "member", next: `/painel/dashboards/${id}/editar` });
  const [dashboard, sources] = await Promise.all([getDashboard(id), listSourceOptions()]);
  if (!dashboard)
    return (
      <EmptyState
        title="Dashboard não encontrado"
        text="Ele pode ter sido apagado ou ser de outro workspace."
        action={
          <Link href="/painel/dashboards" className={btn.small}>
            Ver meus dashboards
          </Link>
        }
      />
    );
  return (
    <NewDashboardFlow
      dashboard={dashboard}
      sources={sources}
      tier={session.access.tier ?? "base"}
      pagesTier={session.access.entitlements?.pages ?? "base"}
      whiteLabel={!!session.access.entitlements?.whiteLabel}
      used={session.usage.dashboards}
      limit={session.access.entitlements?.maxDashboards ?? 0}
    />
  );
}
