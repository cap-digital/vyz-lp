"use client";

import { BarChart3, Check, PanelsTopLeft } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/kit";
import { UsageBar } from "@/features/accounts/AccountsPage";
import { TIER_LABEL } from "@/features/pricing/entitlements";
import { dashboardTemplate } from "@/features/templates/dashboards";
import { landingTemplate } from "@/features/templates/landing-pages";
import { useHydrated } from "@/lib/hooks";
import { useCollection } from "@/lib/store/hooks";
import type { Account, Dashboard, LandingPage, ShareLink } from "./types";
import { useWorkspace } from "./workspace";

function greeting(hydrated: boolean): string {
  if (!hydrated) return "Olá";
  const h = new Date().getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

export function HomePage() {
  const { ws, ent } = useWorkspace();
  const hydrated = useHydrated();
  const accounts = useCollection<Account>("accounts");
  const dashboards = useCollection<Dashboard>("dashboards");
  const pages = useCollection<LandingPage>("landingPages");
  const links = useCollection<ShareLink>("shareLinks");

  const recent = [
    ...dashboards.map((d) => ({ href: `/painel/dashboards/${d.id}`, title: d.name, sub: `Dashboard · ${dashboardTemplate(d.templateId)?.name ?? ""}`, at: d.updatedAt })),
    ...pages.map((p) => ({ href: `/painel/landing-pages/${p.id}`, title: p.content.brand, sub: `Landing page · ${landingTemplate(p.templateId)?.name ?? ""}`, at: p.updatedAt })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 5);

  const checklist = [
    { done: accounts.length > 0, label: "Conectar as contas", text: "Cadastre a BM do Meta e a conta do Google Ads pelo ID.", href: "/painel/contas" },
    { done: dashboards.length > 0, label: "Criar o primeiro dashboard", text: "Escolha um template e aponte as contas.", href: "/painel/dashboards/novo?novo=1" },
    { done: links.length > 0, label: "Compartilhar com o cliente", text: "Gere o link só de leitura ou exporte o PDF.", href: dashboards[0] ? `/painel/dashboards/${dashboards[0].id}` : "/painel/dashboards" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader eyebrow={`${ws.name} · ${TIER_LABEL[ws.tier]}`} title={`${greeting(hydrated)}${ws.userName ? `, ${ws.userName}` : ""}.`} text="O número que decide o mês, para cada cliente." />

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/painel/dashboards/novo?novo=1" className="group flex items-center gap-4 rounded-card bg-accent p-5 text-on-accent">
          <BarChart3 size={28} aria-hidden />
          <span>
            <span className="title block text-lg">Novo dashboard</span>
            <span className="text-[13.5px]">20 templates, do e-commerce ao relatório executivo</span>
          </span>
        </Link>
        <Link href="/painel/landing-pages/novo?novo=1" className="flex items-center gap-4 rounded-card border border-line bg-card p-5 hover:border-accent">
          <PanelsTopLeft size={28} aria-hidden className="text-accent" />
          <span>
            <span className="title block text-lg">Nova landing page</span>
            <span className="text-[13.5px] text-fg-2">Template, textos, GTM e preview</span>
          </span>
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <section className="rounded-card border border-line bg-card p-5" aria-labelledby="h-recentes">
          <h2 id="h-recentes" className="title mb-3 text-lg">
            Recentes
          </h2>
          {recent.length === 0 ? (
            <p className="text-[14px] text-fg-2">Nada por aqui ainda. Comece por um dashboard.</p>
          ) : (
            <ul className="divide-y divide-line">
              {recent.map((r) => (
                <li key={r.href}>
                  <Link href={r.href} className="flex flex-col py-2.5 hover:text-accent">
                    <span className="font-medium">{r.title}</span>
                    <span className="text-[12.5px] text-fg-2">{r.sub}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="space-y-4 rounded-card border border-line bg-card p-5" aria-labelledby="h-uso">
          <h2 id="h-uso" className="title text-lg">
            Uso do plano
          </h2>
          <UsageBar used={accounts.length} limit={ws.contractedAccounts} label="Contas" />
          <UsageBar used={dashboards.length} limit={ent.maxDashboards} label="Dashboards" />
          <UsageBar used={pages.filter((p) => p.published).length} limit={ent.maxLandingPages} label="Landing pages publicadas" />
          <Link href="/painel/plano" className="inline-block text-[13.5px] font-semibold text-accent">
            Ver limites do plano →
          </Link>
        </section>
      </div>

      <section aria-labelledby="h-passos" className="rounded-card border border-line bg-card p-5">
        <h2 id="h-passos" className="title mb-3 text-lg">
          Primeiros passos
        </h2>
        <ol className="grid gap-3 md:grid-cols-3">
          {checklist.map((c, i) => (
            <li key={c.label}>
              <Link href={c.href} className={`flex h-full gap-3 rounded-control border p-4 ${c.done ? "border-accent" : "border-line hover:border-accent"}`}>
                <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${c.done ? "bg-accent text-on-accent" : "border border-line text-fg-2"}`}>
                  {c.done ? <Check size={15} aria-label="Feito" /> : i + 1}
                </span>
                <span>
                  <span className="block font-semibold">{c.label}</span>
                  <span className="text-[13px] text-fg-2">{c.text}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
