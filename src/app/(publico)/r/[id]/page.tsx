import type { Metadata } from "next";
import { Suspense } from "react";
import { SharedDashboard } from "@/features/share/SharedDashboard";

export const metadata: Metadata = { title: "Dashboard compartilhado" };

// Os ids nascem no navegador: params é dado de execução e fica dentro de Suspense.
export default function Page({ params }: PageProps<"/r/[id]">) {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-card bg-card" />}>
      {params.then(({ id }) => (
        <SharedDashboard id={id} />
      ))}
    </Suspense>
  );
}
