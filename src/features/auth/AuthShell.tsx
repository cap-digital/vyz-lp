// Moldura das telas de acesso (Brand Showcase, pág. 17): malha de construção
// do logo ao fundo, wordmark que volta ao site e troca de tema. AuthCard é o
// cartão com o ícone da marca, igual em entrar, recuperar e redefinir a senha.

import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/brand/Icon";
import { Wordmark } from "@/components/brand/Wordmark";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

/** Fundo: malha de construção do logo e o wordmark em contorno, bem claro. */
function LogoGrid() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]"
        style={{
          backgroundImage: "linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          backgroundPosition: "center center",
        }}
      />
      <div className="absolute -right-[12vw] -bottom-[6vw] w-[min(1100px,120vw)] opacity-70 [&_polygon]:fill-none [&_polygon]:stroke-line [&_polygon]:[stroke-width:0.035]">
        <Wordmark decorative className="text-line" />
      </div>
    </div>
  );
}

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col bg-bg">
      <LogoGrid />
      <header className="relative flex h-16 items-center justify-between px-4 sm:px-6 lg:px-10">
        <Link href="/" aria-label="VYZ, voltar ao site" className="block w-[72px]">
          <Wordmark decorative />
        </Link>
        <ThemeToggle className="size-10" />
      </header>

      <main className="relative flex flex-1 items-center justify-center px-4 pt-4 pb-16 sm:px-6">
        <div className="w-full max-w-[560px]">{children}</div>
      </main>
    </div>
  );
}

// Uma tela de acesso tem um cartão só: o id do título pode ser fixo.
const TITLE_ID = "acesso-titulo";

export function AuthCard({ title, description, children, footer }: { title: string; description?: ReactNode; children?: ReactNode; footer?: ReactNode }) {
  return (
    <>
      <section aria-labelledby={TITLE_ID} className="rounded-[20px] border border-line bg-card p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-7">
          <div className="w-16 shrink-0 sm:w-[88px]">
            <Icon background="#4B5320" className="text-[#E8ECE1]" radius={24} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 id={TITLE_ID} className="text-[22px] leading-tight font-semibold tracking-[-0.01em] text-fg">
              {title}
            </h1>
            {description && <div className="mt-2 text-[14px] leading-relaxed text-fg-2">{description}</div>}
            {children}
          </div>
        </div>
      </section>
      {footer && <div className="mt-5 space-y-1 text-center text-[14px] text-fg-2">{footer}</div>}
    </>
  );
}

/** Link de texto das telas de acesso. */
export const authLink = "font-semibold text-accent underline-offset-4 hover:underline";
