import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/kit";
import { NewLandingFlow } from "@/features/landing-pages/NewLandingFlow";

export const metadata: Metadata = { title: "Nova landing page" };

// useSearchParams precisa de Suspense com Cache Components
export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Landing pages" title="Nova landing page" />
      <Suspense fallback={<div className="h-64 animate-pulse rounded-card bg-card" />}>
        <NewLandingFlow />
      </Suspense>
    </div>
  );
}
