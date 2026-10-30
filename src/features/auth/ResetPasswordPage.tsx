"use client";

// Criar a senha nova depois do link do e-mail (/redefinir-senha). Salvou: a
// conta segue aberta neste aparelho, sai dos outros e vai para o painel.

import { useActionState, useId, useState } from "react";
import { btn } from "@/components/ui/styles";
import { resetPassword } from "@/server/auth/actions";
import { AuthCard } from "./AuthShell";
import { FormAlert, PasswordChecklist, PasswordInput, useFocusFirstInvalid } from "./fields";
import { RESET_PASSWORD_PATH } from "./recovery";

export function ResetPasswordPage({ email, next }: { email: string | null; next?: string }) {
  const id = useId();
  const [state, action, pending] = useActionState(resetPassword, null, RESET_PASSWORD_PATH);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const formRef = useFocusFirstInvalid(state);

  const fields = state?.ok === false ? state.error.fields : undefined;
  const error = state?.ok === false && !fields ? state.error.message : null;

  return (
    <AuthCard
      title="Criar nova senha"
      description={
        email ? (
          <>
            Para a conta <strong className="font-semibold break-all text-fg">{email}</strong>.
          </>
        ) : undefined
      }
    >
      <form ref={formRef} action={action} noValidate className="mt-5 space-y-4">
        {/* para o gerenciador de senhas saber de qual conta é a senha nova */}
        {next && <input type="hidden" name="next" value={next} />}
        {email && <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />}
        <div>
          <PasswordInput
            label="Nova senha"
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fields?.password}
            describedBy={`${id}-regras`}
          />
          <PasswordChecklist id={`${id}-regras`} value={password} />
        </div>
        <PasswordInput
          label="Repita a nova senha"
          name="confirm"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={fields?.confirm}
        />
        <button type="submit" disabled={pending} className={`${btn.primary} w-full rounded-[10px]`}>
          {pending ? "Salvando…" : "Salvar senha e entrar"}
        </button>
        {error && <FormAlert>{error}</FormAlert>}
      </form>
    </AuthCard>
  );
}
