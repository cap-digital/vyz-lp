"use client";

import { BarChart3, Gem, Home, Menu, PanelsTopLeft, Plug, Settings, Share2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState, type ReactNode } from "react";
import { Wordmark } from "@/components/brand/Wordmark";
import { Modal, PendingChip } from "@/components/ui/kit";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { TIER_LABEL, TIERS, type Tier } from "@/features/pricing/entitlements";
import { useWorkspace } from "./workspace";

const NAV = [
  { href: "/painel", label: "Início", icon: Home },
  { href: "/painel/dashboards", label: "Dashboards", icon: BarChart3 },
  { href: "/painel/landing-pages", label: "Landing pages", icon: PanelsTopLeft, short: "LPs" },
  { href: "/painel/contas", label: "Contas", icon: Plug },
  { href: "/painel/compartilhar", label: "Compartilhar", icon: Share2 },
  { href: "/painel/plano", label: "Plano", icon: Gem },
  { href: "/painel/configuracoes", label: "Configurações", icon: Settings },
] as const;

const isActive = (path: string | null, href: string) => (href === "/painel" ? path === "/painel" : !!path?.startsWith(href));

function SideNav({ path }: { path: string | null }) {
  return (
    <ul className="space-y-0.5">
      {NAV.map(({ href, label, icon: I }) => {
        const active = isActive(path, href);
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-2.5 rounded-control px-3 py-2 text-[14px] transition-colors duration-150 ${active ? "bg-accent-soft font-semibold text-fg" : "text-fg-2 hover:bg-accent-soft/50 hover:text-fg"}`}
            >
              <I size={17} aria-hidden />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function ActiveSideNav() {
  return <SideNav path={usePathname()} />;
}

function BottomNav({ path, onMore }: { path: string | null; onMore: () => void }) {
  const items = NAV.slice(0, 4);
  const moreActive = NAV.slice(4).some((n) => isActive(path, n.href));
  return (
    <ul className="grid grid-cols-5">
      {items.map((n) => {
        const active = isActive(path, n.href);
        const I = n.icon;
        return (
          <li key={n.href}>
            <Link
              href={n.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${active ? "font-semibold text-accent" : "text-fg-2"}`}
            >
              <I size={19} aria-hidden />
              {"short" in n ? n.short : n.label}
            </Link>
          </li>
        );
      })}
      <li>
        <button type="button" onClick={onMore} className={`flex w-full flex-col items-center gap-0.5 py-2 text-[11px] ${moreActive ? "font-semibold text-accent" : "text-fg-2"}`}>
          <Menu size={19} aria-hidden />
          Mais
        </button>
      </li>
    </ul>
  );
}

function ActiveBottomNav({ onMore }: { onMore: () => void }) {
  return <BottomNav path={usePathname()} onMore={onMore} />;
}

/** Seletor de plano simulado: serve para testar os bloqueios sem backend. */
export function PlanSimulator({ compact = false }: { compact?: boolean }) {
  const { ws, update } = useWorkspace();
  return (
    <div className={`flex items-center gap-2 ${compact ? "" : "flex-wrap"}`}>
      <label className="flex items-center gap-2 text-[13px] text-fg-2">
        {!compact && <span>Simular plano</span>}
        <select
          aria-label="Simular plano"
          value={ws.tier}
          onChange={(e) => update({ tier: e.target.value as Tier })}
          className="h-9 rounded-control border border-line bg-field px-2.5 text-[13.5px] font-semibold text-fg outline-none focus-visible:border-accent"
        >
          {TIERS.map((t) => (
            <option key={t} value={t}>
              {TIER_LABEL[t]}
            </option>
          ))}
        </select>
      </label>
      <PendingChip
        label={compact ? "Simulado" : "Precisa conectar Supabase"}
        detail="Precisa conectar Supabase · o plano real virá da conta. Por enquanto, escolha um plano para testar os limites e os bloqueios."
      />
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { ws } = useWorkspace();
  const [more, setMore] = useState(false);
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_1fr] print:block">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-card p-4 lg:flex print:hidden" aria-label="Navegação do painel">
        <Link href="/painel" aria-label="VYZ, início do painel" className="mb-6 block w-[72px] px-2 pt-1">
          <Wordmark decorative />
        </Link>
        <nav aria-label="Seções">
          <Suspense fallback={<SideNav path={null} />}>
            <ActiveSideNav />
          </Suspense>
        </nav>
        <div className="mt-auto rounded-card border border-line bg-bg p-3">
          <p className="truncate text-[13.5px] font-semibold">{ws.name}</p>
          <p className="text-[12px] text-fg-2">
            {TIER_LABEL[ws.tier]} · {ws.contractedAccounts} {ws.contractedAccounts === 1 ? "conta" : "contas"}
          </p>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-line bg-[var(--nav-bg)] backdrop-blur-md print:hidden">
          <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
            <Link href="/painel" aria-label="VYZ, início do painel" className="block w-14 lg:hidden">
              <Wordmark decorative />
            </Link>
            <div className="hidden sm:block">
              <PlanSimulator />
            </div>
            <div className="flex items-center gap-2">
              <div className="sm:hidden">
                <PlanSimulator compact />
              </div>
              <ThemeToggle className="size-9" />
            </div>
          </div>
        </header>
        <main id="conteudo" className="mx-auto max-w-[1280px] px-4 pt-6 pb-28 sm:px-6 lg:pb-12 print:max-w-none print:p-0">
          {children}
        </main>
      </div>

      <nav aria-label="Seções" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-[var(--nav-bg)] backdrop-blur-md lg:hidden print:hidden">
        <Suspense fallback={<BottomNav path={null} onMore={() => setMore(true)} />}>
          <ActiveBottomNav onMore={() => setMore(true)} />
        </Suspense>
      </nav>
      <Modal open={more} onClose={() => setMore(false)} title="Mais">
        <ul className="space-y-1" onClick={() => setMore(false)}>
          {NAV.slice(4).map(({ href, label, icon: I }) => (
            <li key={href}>
              <Link href={href} className="flex items-center gap-3 rounded-control px-3 py-3 text-[15px] hover:bg-accent-soft">
                <I size={18} aria-hidden /> {label}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/" className="flex items-center gap-3 rounded-control px-3 py-3 text-[15px] text-fg-2 hover:bg-accent-soft">
              Voltar ao site
            </Link>
          </li>
        </ul>
      </Modal>
    </div>
  );
}
