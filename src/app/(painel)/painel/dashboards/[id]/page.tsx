import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardView } from "@/features/dashboards/DashboardView";

export const metadata: Metadata = { title: "Dashboard" };

// Os ids nascem no navegador: params é dado de execução e fica dentro de Suspense.
export default function Page({ params }: PageProps<"/painel/dashboards/[id]">) {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-card bg-card" />}>
      {params.then(({ id }) => (
        <DashboardView id={id} />
      ))}
    </Suspense>
  );
}
