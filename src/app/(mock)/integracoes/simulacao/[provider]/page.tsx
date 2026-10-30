import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { isProviderId, PROVIDER_IDS, type ProviderId } from "@/features/integrations/providers";
import { ConsentFrame, ConsentProblem, ConsentSkeleton, SimulatedConsent } from "@/features/integrations/SimulatedConsent";
import { isMockIntegrations } from "@/server/env";
import { loadMockConsent } from "@/server/integrations/mock-consent";

export const metadata: Metadata = { title: "Conexão simulada" };

export function generateStaticParams() {
  return PROVIDER_IDS.map((provider) => ({ provider }));
}

/** Consentimento simulado do Meta/Google (só com INTEGRATIONS_MODE=mock). */
export default async function Page({ params, searchParams }: PageProps<"/integracoes/simulacao/[provider]">) {
  // Antes de qualquer streaming, para o 404 sair com o status certo.
  if (!isMockIntegrations()) notFound();
  const { provider } = await params;
  if (!isProviderId(provider)) notFound();
  return (
    <ConsentFrame>
      <Suspense fallback={<ConsentSkeleton />}>
        <Consent provider={provider} searchParams={searchParams} />
      </Suspense>
    </ConsentFrame>
  );
}

// State e sessão são dados da requisição: ficam dentro do Suspense. connection():
// a tela confere a validade do pedido na hora e gera um código novo a cada visita.
async function Consent({ provider, searchParams }: { provider: ProviderId; searchParams: PageProps<"/integracoes/simulacao/[provider]">["searchParams"] }) {
  await connection();
  const view = await loadMockConsent(provider, (await searchParams).state);
  if (!view.ok) return <ConsentProblem reason={view.reason} back={view.back} />;
  return <SimulatedConsent provider={provider} state={view.state} code={view.code} workspaceName={view.workspaceName} expiresAt={view.expiresAt} timeZone={view.timeZone} />;
}
