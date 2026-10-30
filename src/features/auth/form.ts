// Estado dos formulários de acesso (useActionState) e leitura do FormData.

import type { ActionResult } from "@/server/supabase/errors";

/** O que volta para o formulário não perder o texto (nunca senha). */
export type FormValues = { email?: string };

/** null = ainda não enviou. */
export type AuthFormState<T = undefined> = (ActionResult<T> & { values?: FormValues }) | null;

/** Campo de texto do FormData ("" quando falta ou é arquivo). */
export function formText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/** Primeiro valor de um parâmetro de busca (?a=1&a=2 → "1"). */
export function queryValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Primeira mensagem de cada campo, no formato de ActionError.fields. */
export function fieldErrors(issues: readonly { path: readonly PropertyKey[]; message: string }[]): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    fields[key] ??= issue.message;
  }
  return fields;
}
