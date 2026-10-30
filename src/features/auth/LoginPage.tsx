"use client";

// Tela de entrada (Brand Showcase, pág. 17): e-mail e senha ou Google. A
// sessão nasce no servidor (cookies httpOnly); aqui só o formulário. Sem
// JavaScript o formulário também funciona (Server Action com useActionState).

import Link from "next/link";
import { useActionState, useId } from "react";
import { PendingChip } from "@/components/ui/kit";
import { btn } from "@/components/ui/styles";
import { signIn, signInWithGoogle } from "@/server/auth/actions";
import { AuthCard, authLink } from "./AuthShell";
import { AuthInput, FormAlert, PasswordInput, useFocusFirstInvalid } from "./fields";
import { GOOGLE_PENDING, type GoogleStatus } from "./google";
import type { Notice } from "./messages";

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

export function LoginPage({ next, google, notice = null }: { next: string; google: GoogleStatus; notice?: Notice | null }) {
  const id = useId();
  // permalink: sem JavaScript o estado volta pela URL, para o formulário do
  // fallback (casca estática) e o do conteúdo, que têm posições diferentes.
  const [state, signInAction, signingIn] = useActionState(signIn, null, "/entrar");
  const [googleState, googleAction, openingGoogle] = useActionState(signInWithGoogle.bind(null, next), null, "/entrar");
  const formRef = useFocusFirstInvalid(state);

  const fields = state?.ok === false ? state.error.fields : undefined;
  const error = state?.ok === false && !fields ? state.error.message : googleState?.ok === false ? googleState.error.message : null;
  const googleOff = google === "disabled";
  const busy = signingIn || openingGoogle;
  const googleForm = `${id}-google`;

  return (
    <AuthCard
      title="Entrar no VYZ"
      footer={
        <>
          <p>
            Ainda não tem conta?{" "}
            <Link href="/assinar" className={authLink}>
              Assine
            </Link>
          </p>
          <p>
            <Link href="/#planos" className="underline-offset-4 hover:text-fg hover:underline">
              Ver planos e preços
            </Link>
          </p>
        </>
      }
    >
      <form ref={formRef} action={signInAction} noValidate className="mt-4 space-y-3">
        {notice && !state && <FormAlert tone={notice.tone}>{notice.message}</FormAlert>}
        <input type="hidden" name="next" value={next} />
        <AuthInput
          label="E-mail"
          hideLabel
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          placeholder="nome@empresa.com"
          defaultValue={state?.values?.email}
          error={fields?.email}
        />
        <PasswordInput label="Senha" hideLabel name="password" autoComplete="current-password" placeholder="Senha" error={fields?.password} />
        <p className="text-right text-[13px]">
          <Link href="/recuperar-senha" className="text-fg-2 underline-offset-4 hover:text-accent hover:underline">
            Esqueci minha senha
          </Link>
        </p>
        <div className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-[auto_1fr]">
          <button type="submit" disabled={busy} className={`${btn.primary} rounded-[10px]`}>
            {signingIn ? "Entrando…" : "Entrar"}
          </button>
          <button
            type="submit"
            form={googleForm}
            disabled={busy || googleOff}
            aria-describedby={googleOff ? `${id}-google-aviso` : undefined}
            className={`${btn.secondary} rounded-[10px]`}
          >
            <GoogleMark /> {openingGoogle ? "Abrindo o Google…" : "Entrar com Google"}
          </button>
        </div>
        {error && <FormAlert>{error}</FormAlert>}
        {googleOff && (
          <p id={`${id}-google-aviso`}>
            <PendingChip label={GOOGLE_PENDING.label} detail={GOOGLE_PENDING.detail} />
          </p>
        )}
      </form>
      {/* Formulário à parte: o botão do Google não envia e-mail nem senha. */}
      <form id={googleForm} action={googleAction} hidden />
    </AuthCard>
  );
}
