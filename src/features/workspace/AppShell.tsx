"use client";

// Moldura do painel: a sidebar é a "aba" e o conteúdo mora num painel
// arredondado. A aba ativa usa a cor do painel e se funde nele pelos cantos
// côncavos (.side-tab no globals.css); um único indicador desliza entre os
// itens (layoutId). A sidebar recolhe com o botão ou com "[", e o estado
// fica no <html data-sidebar>, aplicado antes da primeira pintura.

import { BarChart3, ChevronsUpDown, Gem, Home, LogOut, Menu, PanelLeftClose, PanelLeftOpen, PanelsTopLeft, Plug, Settings, Share2 } from "lucide-react";
import { LazyMotion, m, MotionConfig } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { Wordmark } from "@/components/brand/Wordmark";
import { Modal, PendingChip } from "@/components/ui/kit";
import { Menu as DropMenu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/Menu";
import { Segmented } from "@/components/ui/Segmented";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Tooltip, TooltipProvider } from "@/components/ui/Tooltip";
import { AgentDrawer } from "@/features/agent/AgentDrawer";
import { AgentBar, AgentFab } from "@/features/agent/AgentEntry";
import { AgentProvider } from "@/features/agent/AgentProvider";
import { Caption } from "@/features/agent/Caption";
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

// layoutId precisa das features de layout; chegam depois da primeira pintura
const loadFeatures = () => import("motion/react").then((r) => r.domMax);
const TAB_SPRING = { type: "spring", stiffness: 380, damping: 34, mass: 0.9 } as const;

// ---- estado da sidebar (no <html>, com localStorage) -------------------------

const SB_KEY = "vyz:sidebar";
const SB_EVENT = "vyz-sidebar";

function subscribeSidebar(cb: () => void) {
  window.addEventListener(SB_EVENT, cb);
  return () => window.removeEventListener(SB_EVENT, cb);
}
const readCollapsed = () => document.documentElement.getAttribute("data-sidebar") === "closed";

function setCollapsed(next: boolean) {
  document.documentElement.setAttribute("data-sidebar", next ? "closed" : "open");
  try {
    localStorage.setItem(SB_KEY, next ? "closed" : "open");
  } catch {}
  window.dispatchEvent(new Event(SB_EVENT));
}

function useCollapsed() {
  return useSyncExternalStore(subscribeSidebar, readCollapsed, () => false);
}

/** Atalho "[" (ignorado quando o foco está num campo). */
function useSidebarShortcut() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "[" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.closest("[role=combobox],[role=listbox],[role=menu],[role=dialog]"))) return;
      e.preventDefault();
      setCollapsed(!readCollapsed());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

// ---- sidebar -----------------------------------------------------------------

// rótulos somem antes de recolher e voltam depois de expandir, sem quebrar linha
const fade = "whitespace-nowrap transition-[opacity,transform] duration-200 delay-150 ease-brand sb-closed:pointer-events-none sb-closed:-translate-x-1.5 sb-closed:opacity-0 sb-closed:delay-0 sb-closed:duration-100";

function SideNav({ path, collapsed }: { path: string | null; collapsed: boolean }) {
  return (
    <ul className="space-y-1">
      {NAV.map(({ href, label, icon: I }) => {
        const active = isActive(path, href);
        return (
          <li key={href} className="relative">
            {active && <m.span layoutId="side-tab" transition={TAB_SPRING} aria-hidden className="side-tab absolute inset-y-0 left-0 -right-px rounded-l-[12px] bg-[var(--panel)]" />}
            <Tooltip content={label} disabled={!collapsed}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                aria-label={collapsed ? label : undefined}
                className={`group relative flex h-11 items-center gap-3 overflow-hidden pl-3.5 text-[14px] outline-none ${active ? "font-semibold text-fg" : "text-[var(--sidebar-muted)] hover:text-[var(--sidebar-fg)]"}`}
              >
                {!active && <span aria-hidden className="absolute inset-y-0 right-3 left-0 rounded-[12px] transition-colors duration-150 group-hover:bg-white/8 group-focus-visible:bg-white/8" />}
                <span aria-hidden className="pointer-events-none absolute inset-y-1 right-4 left-1 rounded-[10px] group-focus-visible:ring-2 group-focus-visible:ring-[var(--sidebar-fg)]/70" />
                <I size={19} aria-hidden className={`relative shrink-0 transition-transform duration-300 ease-brand sb-closed:translate-x-[22px] ${active ? "text-accent" : ""}`} />
                <span className={`relative ${fade}`}>{label}</span>
              </Link>
            </Tooltip>
          </li>
        );
      })}
    </ul>
  );
}

function ActiveSideNav({ collapsed }: { collapsed: boolean }) {
  return <SideNav path={usePathname()} collapsed={collapsed} />;
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "V";

/** Cartão do workspace com o próprio menu (Configurações e Sair). Recolhido, vira avatar. */
function WorkspaceMenu({ collapsed }: { collapsed: boolean }) {
  const { ws } = useWorkspace();
  const router = useRouter();
  const sub = `${TIER_LABEL[ws.tier]} · ${ws.contractedAccounts} ${ws.contractedAccounts === 1 ? "conta" : "contas"}`;
  return (
    <DropMenu>
      <Tooltip content={ws.name} disabled={!collapsed}>
        <MenuTrigger
          aria-label={`${ws.name}, ${sub}. Abrir menu da conta`}
          className="flex h-14 w-full items-center gap-2.5 overflow-hidden rounded-[12px] bg-[color-mix(in_srgb,var(--panel)_10%,transparent)] px-2 text-left text-[var(--sidebar-fg)] outline-none transition-colors duration-150 hover:bg-[color-mix(in_srgb,var(--panel)_16%,transparent)] focus-visible:ring-2 focus-visible:ring-[var(--sidebar-fg)]/70 data-[state=open]:bg-[color-mix(in_srgb,var(--panel)_16%,transparent)]"
        >
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[var(--sidebar-fg)] text-[13px] font-bold text-[var(--sidebar)] transition-transform duration-300 ease-brand sb-closed:translate-x-[18px]">
            {initials(ws.name)}
          </span>
          <span className={`min-w-0 flex-1 ${fade}`}>
            <span className="block truncate text-[13.5px] font-semibold">{ws.name}</span>
            <span className="block truncate text-[12px] text-[var(--sidebar-muted)]">{sub}</span>
          </span>
          <ChevronsUpDown size={15} aria-hidden className={`shrink-0 text-[var(--sidebar-muted)] ${fade}`} />
        </MenuTrigger>
      </Tooltip>
      <MenuContent side={collapsed ? "right" : "top"} align={collapsed ? "end" : "start"} className={collapsed ? "" : "w-[var(--radix-dropdown-menu-trigger-width)]"}>
        <MenuItem icon={<Settings size={15} />} onSelect={() => router.push("/painel/configuracoes")}>
          Configurações
        </MenuItem>
        <MenuSeparator />
        <MenuItem icon={<LogOut size={15} />} onSelect={() => router.push("/entrar")}>
          Sair
        </MenuItem>
      </MenuContent>
    </DropMenu>
  );
}

function Sidebar() {
  const collapsed = useCollapsed();
  useSidebarShortcut();
  const Toggle = collapsed ? PanelLeftOpen : PanelLeftClose;
  return (
    <aside
      aria-label="Navegação do painel"
      className="hidden h-dvh w-[260px] shrink-0 flex-col overflow-hidden py-4 pl-3 transition-[width] duration-300 ease-[cubic-bezier(0.32,1.15,0.6,1)] sb-closed:w-[104px] sb-closed:delay-100 md:flex print:hidden"
    >
      <div className="flex h-10 items-center justify-between gap-1 pr-3 pl-2">
        <Link href="/painel" aria-label="VYZ, início do painel" className="block w-[72px] shrink-0 rounded-[6px] outline-none transition-[width] duration-300 ease-brand focus-visible:ring-2 focus-visible:ring-[var(--sidebar-fg)]/70 sb-closed:w-[42px]">
          <Wordmark decorative className="text-[var(--sidebar-fg)]" />
        </Link>
        <Tooltip content={collapsed ? "Expandir menu  [" : "Recolher menu  ["} side="right">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            aria-keyshortcuts="["
            aria-expanded={!collapsed}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-[8px] text-[var(--sidebar-muted)] outline-none transition-colors hover:bg-white/8 hover:text-[var(--sidebar-fg)] focus-visible:ring-2 focus-visible:ring-[var(--sidebar-fg)]/70"
          >
            <Toggle size={18} aria-hidden />
          </button>
        </Tooltip>
      </div>

      <nav aria-label="Seções" className="mt-8">
        <Suspense fallback={<SideNav path={null} collapsed={collapsed} />}>
          <ActiveSideNav collapsed={collapsed} />
        </Suspense>
      </nav>

      <div className="mt-auto pr-3">
        <WorkspaceMenu collapsed={collapsed} />
      </div>
    </aside>
  );
}

// ---- barra de baixo (celular) ------------------------------------------------

function BottomNav({ path, onMore }: { path: string | null; onMore: () => void }) {
  const items = NAV.slice(0, 4);
  const moreActive = NAV.slice(4).some((n) => isActive(path, n.href));
  const cell = (active: boolean, I: typeof Home, label: string) => (
    <>
      <span className={`inline-flex h-8 w-14 items-center justify-center rounded-chip transition-colors duration-200 ${active ? "bg-[var(--panel)] text-accent" : ""}`}>
        <I size={19} aria-hidden />
      </span>
      <span className={active ? "font-semibold text-[var(--sidebar-fg)]" : ""}>{label}</span>
    </>
  );
  return (
    <ul className="grid grid-cols-5 px-1 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
      {items.map((n) => {
        const active = isActive(path, n.href);
        return (
          <li key={n.href}>
            <Link href={n.href} aria-current={active ? "page" : undefined} className="flex flex-col items-center gap-0.5 text-[11px] text-[var(--sidebar-muted)] outline-none focus-visible:text-[var(--sidebar-fg)]">
              {cell(active, n.icon, "short" in n ? n.short : n.label)}
            </Link>
          </li>
        );
      })}
      <li>
        <button type="button" onClick={onMore} className="flex w-full flex-col items-center gap-0.5 text-[11px] text-[var(--sidebar-muted)] outline-none focus-visible:text-[var(--sidebar-fg)]">
          {cell(moreActive, Menu, "Mais")}
        </button>
      </li>
    </ul>
  );
}

function ActiveBottomNav({ onMore }: { onMore: () => void }) {
  return <BottomNav path={usePathname()} onMore={onMore} />;
}

// ---- topo do painel ------------------------------------------------------------

/** Seletor de plano simulado: serve para testar os bloqueios sem backend. */
export function PlanSimulator({ compact = false }: { compact?: boolean }) {
  const { ws, update } = useWorkspace();
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {!compact && <span className="text-[13px] text-fg-2">Simular plano</span>}
      <Segmented<Tier> label="Simular plano" size="sm" value={ws.tier} onChange={(tier) => update({ tier })} options={TIERS.map((t) => ({ value: t, label: TIER_LABEL[t] }))} />
      <PendingChip
        label={compact ? "Simulado" : "Precisa conectar Supabase"}
        detail="Precisa conectar Supabase · o plano real virá da conta. Por enquanto, escolha um plano para testar os limites e os bloqueios."
      />
    </div>
  );
}

/** Lembra que o painel é uma demonstração: nada sai deste navegador. */
function DemoChip() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-chip bg-accent-soft px-2.5 py-1 text-[12px] font-medium whitespace-nowrap text-fg">
      <span className="size-1.5 rounded-full bg-accent" aria-hidden />
      <span>
        Modo demonstração<span className="max-sm:hidden"> · dados neste navegador</span>
      </span>
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [more, setMore] = useState(false);
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">
        <TooltipProvider>
          <AgentProvider>
            <div className="min-h-dvh bg-[var(--sidebar)] md:flex md:h-dvh md:overflow-hidden print:block print:h-auto print:bg-white">
              <Sidebar />

              <div className="min-h-dvh min-w-0 flex-1 bg-[var(--panel)] md:my-3 md:mr-3 md:h-[calc(100dvh-24px)] md:min-h-0 md:overflow-y-auto md:rounded-[24px] print:m-0 print:h-auto print:overflow-visible print:rounded-none print:bg-white">
                <header className="@container sticky top-0 z-30 border-b border-line bg-[color-mix(in_srgb,var(--panel)_82%,transparent)] backdrop-blur-md print:hidden">
                  <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
                    <Link href="/painel" aria-label="VYZ, início do painel" className="block w-14 md:hidden">
                      <Wordmark decorative />
                    </Link>
                    <div className="flex min-w-0 items-center gap-3">
                      <DemoChip />
                      {/* o simulador só entra no topo quando cabe numa linha (está também em Plano) */}
                      <div className="hidden @[860px]:block">
                        <PlanSimulator compact />
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <div className="hidden @[1100px]:block">
                        <AgentBar />
                      </div>
                      <ThemeToggle className="size-9 shrink-0" />
                    </div>
                  </div>
                </header>
                <main id="conteudo" className="mx-auto max-w-[1280px] px-4 pt-6 pb-36 sm:px-6 md:pb-28 print:max-w-none print:p-0">
                  {children}
                </main>
              </div>

              <nav aria-label="Seções" className="fixed inset-x-0 bottom-0 z-40 bg-[var(--sidebar)] md:hidden print:hidden">
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
                  <li>
                    <Link href="/entrar" className="flex items-center gap-3 rounded-control px-3 py-3 text-[15px] text-fg-2 hover:bg-accent-soft">
                      <LogOut size={18} aria-hidden /> Sair
                    </Link>
                  </li>
                </ul>
              </Modal>
              <AgentFab />
              <AgentDrawer />
              <Caption />
            </div>
          </AgentProvider>
        </TooltipProvider>
      </MotionConfig>
    </LazyMotion>
  );
}
