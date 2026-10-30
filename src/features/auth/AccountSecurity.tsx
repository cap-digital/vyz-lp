"use client";

// Senha e sessões da conta aberta: trocar a senha (pede a atual) e sair em
// todos os aparelhos. Para a página de Configurações do painel (campos no
// tamanho do painel) e para /redefinir-senha (compact={false}).

import { useActionState, useId, useState, type ChangeEvent } from "react";
import { useFormStatus } from "react-dom";
import { btn } from "@/components/ui/styles";
import { changePassword, signOutEverywhere } from "@/server/auth/actions";
import { FormAlert, PasswordChecklist, PasswordInput, useFocusFirstInvalid } from "./fields";
import type { AuthFormState } from "./form";
import { AUTH_MESSAGES } from "./messages";

type ChangeState = AuthFormState<{ changedAt: number }>;

export function ChangePasswordForm({ compact = true, className = "" }: { compact?: boolean; className?: string }) {
  const [state, action, pending] = useActionState(changePassword, null);
  // Trocou: os campos começam do zero (o formulário remonta).
  return <ChangeFields key={state?.ok ? state.data.changedAt : "editando"} state={state} action={action} pending={pending} compact={compact} className={className} />;
}

const EMPTY = { current: "", password: "", confirm: "" };

function ChangeFields({ state, action, pending, compact, className }: { state: ChangeState; action: (formData: FormData) => void; pending: boolean; compact: boolean; className: string }) {
  const id = useId();
  const [values, setValues] = useState(EMPTY);
  const formRef = useFocusFirstInvalid(state);
  const fields = state?.ok === false ? state.error.fields : undefined;
  const error = state?.ok === false && !fields ? state.error.message : null;
  const set = (key: keyof typeof EMPTY) => (e: ChangeEvent<HTMLInputElement>) => setValues((v) => ({ ...v, [key]: e.target.value }));

  return (
    <form ref={formRef} action={action} noValidate className={`max-w-md space-y-4 ${className}`}>
      <PasswordInput
        compact={compact}
        label="Senha atual"
        name="current"
        autoComplete="current-password"
        value={values.current}
        onChange={set("current")}
        error={fields?.current}
      />
      <div>
        <PasswordInput
          compact={compact}
          label="Nova senha"
          name="password"
          autoComplete="new-password"
          value={values.password}
          onChange={set("password")}
          error={fields?.password}
          describedBy={`${id}-regras`}
        />
        <PasswordChecklist id={`${id}-regras`} value={values.password} />
      </div>
      <PasswordInput
        compact={compact}
        label="Repita a nova senha"
        name="confirm"
        autoComplete="new-password"
        value={values.confirm}
        onChange={set("confirm")}
        error={fields?.confirm}
      />
      <button type="submit" disabled={pending} className={compact ? btn.small : `${btn.primary} w-full rounded-[10px]`}>
        {pending ? "Trocando…" : "Trocar senha"}
      </button>
      {error && <FormAlert>{error}</FormAlert>}
      {state?.ok && <FormAlert tone="info">{AUTH_MESSAGES.passwordChanged}</FormAlert>}
    </form>
  );
}

function SignOutEverywhereSubmit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${btn.outline} h-9 px-4 text-sm`}>
      {pending ? "Saindo…" : "Sair de todos os aparelhos"}
    </button>
  );
}

/** Encerra todas as sessões da conta, inclusive esta (volta para /entrar). */
export function SignOutEverywhereButton({ className = "" }: { className?: string }) {
  return (
    <form action={signOutEverywhere} className={className}>
      <SignOutEverywhereSubmit />
    </form>
  );
}
