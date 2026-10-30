import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { LandingUnavailable, PublicLanding } from "@/features/landing-pages/PublicLanding";
import { SLUG_PATTERN } from "@/features/landing-pages/model";
import { getSessionUser } from "@/server/auth/session";
import { getLandingPreview, getPublishedLanding } from "@/server/landing-pages/queries";

export async function generateMetadata({ params }: PageProps<"/p/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const lp = SLUG_PATTERN.test(slug) ? await getPublishedLanding(slug) : null;
  return lp ? { title: { absolute: lp.content.brand || "Landing page" }, description: lp.content.sub || undefined } : { title: "Landing page" };
}

// Bloqueante de propósito (sem Suspense em volta): a existência é conferida
// antes de a resposta começar, para o endereço errado responder 404 de verdade
// (com streaming, o status 200 já teria saído). A LP publicada vem do cache.
export const instant = false;

// Visitante: a versão publicada (em cache por endereço). Com ?previa=1, quem é
// do workspace vê o rascunho atual (sessão: dado da requisição, sem cache).
export default async function Page({ params, searchParams }: PageProps<"/p/[slug]">) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  if (!SLUG_PATTERN.test(slug)) notFound();

  if (query.previa === "1") {
    await connection();
    const user = await getSessionUser();
    if (!user) redirect(`/entrar?next=${encodeURIComponent(`/p/${slug}?previa=1`)}`);
    const lp = await getLandingPreview(slug);
    return lp ? <PublicLanding lp={lp} preview /> : <LandingUnavailable preview />;
  }

  const lp = await getPublishedLanding(slug);
  if (!lp) notFound();
  return <PublicLanding lp={lp} />;
}
