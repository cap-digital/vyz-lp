// Senha da conta (cliente e servidor): o passwordSchema vale no checkout, na
// redefinição e na troca de senha. As regras e as mensagens moram em
// password-rules.ts, sem zod, para a tela usar na lista ao vivo sem levar o
// zod para o navegador.

import { z } from "zod";
import { PASSWORD_MESSAGES, PASSWORD_RULES } from "./password-rules";

export * from "./password-rules";

/** 8 a 72 caracteres, com ao menos uma letra e um número. Só o primeiro erro interessa à tela. */
export const passwordSchema = PASSWORD_RULES.reduce(
  (schema, rule) => schema.refine(rule.test, rule.message),
  z.string({ error: PASSWORD_MESSAGES.required }).min(1, PASSWORD_MESSAGES.required),
);
