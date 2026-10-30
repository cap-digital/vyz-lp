import type { Metadata } from "next";
import { Suspense } from "react";
import { LeadsPage } from "@/features/landing-pages/LeadsPage";
import { parseLeadFilters } from "@/features/landing-pages/leads";
import { PageSkeleton } from "@/features/workspace/PageSkeleton";
import { requireWorkspace } from "@/server/auth/workspace";
import { getLeadsPage } from "@/server/landing-pages/leads";

export const metadata: Metadata = { title: "Leads das landing pages" };

export default function Page({ searchParams }: PageProps<"/painel/landing-pages/leads">) {
  return (
    <Suspense fallback={<PageSkeleton label="Carregando os leads" blocks={[16, 56]} />}>
      <Leads searchParams={searchParams} />
    </Suspense>
  );
}

async function Leads({ searchParams }: Pick<PageProps<"/painel/landing-pages/leads">, "searchParams">) {
  const query = await searchParams;
  const session = await requireWorkspace({ next: "/painel/landing-pages/leads" });
  const filters = parseLeadFilters(query);
  const data = await getLeadsPage(session, filters);
  return <LeadsPage data={data} filters={filters} timeZone={session.workspace.timezone} />;
}
