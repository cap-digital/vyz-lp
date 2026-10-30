"use client";

// Recuperar a senha: pede o link por e-mail. A resposta é a mesma exista ou
// não conta para o e-mail (o servidor também iguala o tempo de resposta).

import Link from "next/link";
import { useActionState, useState } from "react";
import { btn } from "@/components/ui/styles";
import { requestPasswordReset } from "@/server/auth/actions";
import { AuthCard, authLink } from "./AuthShell";
import { AuthInput, FormAlert, useFocusFirstInvalid } from "./fields";
import type { Notice } from "./messages";

const backToSignIn = (
  <p>
    Lembrou a senha?{" "}
    <Link href="/entrar" className={authLink}>
      Entrar
    </Link>
  </p>
);

export function ForgotPasswordPage({ notice = null }: { notice?: Notice | null }) {
  // "Usar outro e-mail" remonta o formulário do zero.
  const [round, setRound] = useState(0);
  return <ResetRequest key={round} notice={round === 0 ? notice : null} onRetry={() => setRound((r) => r + 1)} />;
}

function ResetRequest({ notice, onRetry }: { notice: Notice | null; onRetry: () => void }) {
  const [state, action, pending] = useActionState(requestPasswordReset, null, "/recuperar-senha");
  const formRef = useFocusFirstInvalid(state);

  if (state?.ok) {
    return (
      <AuthCard
        title="Confira seu e-mail"
        description={
          <>
            Se houver uma conta para <strong className="font-semibold break-all text-fg">{state.data.email}</strong>, enviamos um link para criar uma senha
            nova. Ele vale por 1 hora.
          </>
        }
        footer={backToSignIn}
      >
        <ul className="mt-4 list-disc space-y-1 pl-5 text-[13.5px] text-fg-2">
          <li>Abra o link neste mesmo navegador.</li>
          <li>Não chegou em alguns minutos? Veja o spam ou a aba de promoções.</li>
        </ul>
        <button type="button" onClick={onRetry} className={`${btn.secondary} mt-5 w-full rounded-[10px]`}>
          Usar outro e-mail
        </button>
      </AuthCard>
    );
  }

  const fields = state?.ok === false ? state.error.fields : undefined;
  const error = state?.ok === false && !fields ? state.error.message : null;

  return (
    <AuthCard title="Recuperar senha" description="Digite o e-mail da sua conta. Enviamos um link para você criar uma senha nova." footer={backToSignIn}>
      <form ref={formRef} action={action} noValidate className="mt-5 space-y-3">
        {notice && !state && <FormAlert tone={notice.tone}>{notice.message}</FormAlert>}
        <AuthInput
          label="E-mail"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="nome@empresa.com"
          defaultValue={state?.values?.email}
          error={fields?.email}
        />
        <button type="submit" disabled={pending} className={`${btn.primary} w-full rounded-[10px]`}>
          {pending ? "Enviando…" : "Enviar link"}
        </button>
        {error && <FormAlert>{error}</FormAlert>}
      </form>
    </AuthCard>
  );
}
