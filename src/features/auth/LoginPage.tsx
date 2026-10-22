"use client";

// Tela de entrada (Brand Showcase, pág. 17). Fase 1, sem backend: e-mail e
// Google só avisam que o login precisa do Supabase; o painel de demonstração
// abre direto.

import { Info } from "lucide-react";
import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import { Icon } from "@/components/brand/Icon";
import { Wordmark } from "@/components/brand/Wordmark";
import { btn } from "@/components/ui/styles";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const NOTICE = "Login precisa do Supabase";

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden className="shrink-0">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7Z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z" />
    </svg>
  );
}

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

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState(false);
  const id = useId();

  const pending = (e?: FormEvent) => {
    e?.preventDefault();
    setNotice(true);
  };

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
        <div className="w-full max-w-[560px]">
          <section aria-labelledby={`${id}-t`} className="rounded-[20px] border border-line bg-card p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-7">
              <div className="w-16 shrink-0 sm:w-[88px]">
                <Icon background="#4B5320" className="text-[#E8ECE1]" radius={24} />
              </div>
              <form onSubmit={pending} className="min-w-0 flex-1" noValidate>
                <h1 id={`${id}-t`} className="text-[22px] leading-tight font-semibold tracking-[-0.01em] text-fg">
                  Entrar no VYZ
                </h1>
                <label htmlFor={`${id}-e`} className="sr-only">
                  E-mail
                </label>
                <input
                  id={`${id}-e`}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="nome@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-4 h-12 w-full rounded-[10px] border border-line bg-field px-4 text-[15px] text-fg outline-none placeholder:text-fg-2/70 focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
                />
                <div className="mt-3 grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-[auto_1fr]">
                  <button type="submit" className={`${btn.primary} rounded-[10px]`}>
                    Continuar
                  </button>
                  <button type="button" onClick={() => pending()} className={`${btn.secondary} rounded-[10px]`}>
                    <GoogleMark /> Entrar com Google
                  </button>
                </div>
                <p role="status" aria-live="polite" className="min-h-0">
                  {notice && (
                    <span className="mt-3 inline-flex items-center gap-1.5 rounded-chip border border-dashed border-line px-2.5 py-1 text-[12.5px] text-fg-2">
                      <Info size={13} aria-hidden className="shrink-0" />
                      {NOTICE}
                    </span>
                  )}
                </p>
              </form>
            </div>

            <div className="mt-7 border-t border-line pt-6">
              <Link href="/painel" className={`${btn.secondary} w-full rounded-[10px]`}>
                Acessar o painel de demonstração
              </Link>
              <p className="mt-2 text-center text-[12.5px] text-fg-2">Dados de exemplo, salvos só neste navegador.</p>
            </div>
          </section>

          <p className="mt-5 text-center text-[14px] text-fg-2">
            Ainda não tem conta?{" "}
            <Link href="/#monte-seu-plano" className="font-semibold text-accent underline-offset-4 hover:underline">
              Monte seu plano
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
