import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/kit";
import { NewLandingFlow } from "@/features/landing-pages/NewLandingFlow";
import { requireWorkspace } from "@/server/auth/workspace";

export const metadata: Metadata = { title: "Nova landing page" };

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Landing pages" title="Nova landing page" />
      <Suspense fallback={<div className="h-64 animate-pulse rounded-card bg-card motion-reduce:animate-none" />}>
        <Fluxo />
      </Suspense>
    </div>
  );
}

// Sessão e useSearchParams são dados da requisição: dentro do Suspense.
async function Fluxo() {
  const session = await requireWorkspace({ minRole: "member", next: "/painel/landing-pages/novo" });
  return <NewLandingFlow publishedCount={session.usage.publishedLandingPages} limit={session.access.entitlements?.maxLandingPages ?? 0} />;
}
