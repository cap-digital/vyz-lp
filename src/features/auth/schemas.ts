// Entradas dos formulários de acesso, validadas no servidor (Server Actions).
// No login a senha não passa pelas regras de cadastro: só precisa existir.

import { z } from "zod";
import { PASSWORD_MESSAGES, passwordSchema } from "./password";

export const FIELD_MESSAGES = {
  emailRequired: "Digite seu e-mail.",
  emailInvalid: "Digite um e-mail válido.",
  passwordRequired: "Digite sua senha.",
  currentRequired: "Digite a senha atual.",
  confirmRequired: "Repita a nova senha.",
} as const;

const required = (message: string) =>
  z
    .string({ error: message })
    .min(1, message)
    .max(200, message);

export const emailSchema = z
  .string({ error: FIELD_MESSAGES.emailRequired })
  .trim()
  .toLowerCase()
  .min(1, FIELD_MESSAGES.emailRequired)
  .max(254, FIELD_MESSAGES.emailInvalid)
  .pipe(z.email(FIELD_MESSAGES.emailInvalid));

export const signInSchema = z.object({
  email: emailSchema,
  password: required(FIELD_MESSAGES.passwordRequired),
});

export const resetRequestSchema = z.object({ email: emailSchema });

/** Nova senha + confirmação (link de recuperação). */
export const newPasswordSchema = z
  .object({ password: passwordSchema, confirm: required(FIELD_MESSAGES.confirmRequired) })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], error: PASSWORD_MESSAGES.mismatch });

/** Troca com a conta aberta: a senha atual reautentica antes. */
export const changePasswordSchema = z
  .object({ current: required(FIELD_MESSAGES.currentRequired), password: passwordSchema, confirm: required(FIELD_MESSAGES.confirmRequired) })
  .refine((v) => v.password !== v.current, { path: ["password"], error: PASSWORD_MESSAGES.same })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], error: PASSWORD_MESSAGES.mismatch });

/** Destino depois do login (o servidor ainda passa por safeNextPath). */
export const nextPathSchema = z.string().max(512).nullish();
