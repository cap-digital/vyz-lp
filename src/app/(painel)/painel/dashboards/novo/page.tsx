import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/kit";
import { NewDashboardFlow } from "@/features/dashboards/NewDashboardFlow";

export const metadata: Metadata = { title: "Novo dashboard" };

// useSearchParams precisa de Suspense com Cache Components
export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Dashboards" title="Novo dashboard" />
      <Suspense fallback={<div className="h-64 animate-pulse rounded-card bg-card" />}>
        <NewDashboardFlow />
      </Suspense>
    </div>
  );
}
