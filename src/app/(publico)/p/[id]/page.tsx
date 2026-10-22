import type { Metadata } from "next";
import { Suspense } from "react";
import { PublicLanding } from "@/features/landing-pages/PublicLanding";

export const metadata: Metadata = { title: "Prévia da landing page" };

// Os ids nascem no navegador: params é dado de execução e fica dentro de Suspense.
export default function Page({ params }: PageProps<"/p/[id]">) {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-card bg-card" />}>
      {params.then(({ id }) => (
        <PublicLanding id={id} />
      ))}
    </Suspense>
  );
}
