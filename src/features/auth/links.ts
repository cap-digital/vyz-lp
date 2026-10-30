// Para onde levar a pessoa na volta do Google ou de um link de e-mail (route
// handlers de /auth). Sempre caminhos internos; o motivo de uma falha vira um
// código de aviso (messages.ts), nunca texto vindo da URL.

import type { NoticeCode } from "./messages";
import { RESET_PASSWORD_PATH } from "./recovery";

/** Links de e-mail aceitos em /auth/confirm (verifyOtp com token_hash). */
export const EMAIL_LINK_TYPES = ["recovery", "invite", "magiclink", "email", "signup", "email_change"] as const;
export type EmailLinkType = (typeof EMAIL_LINK_TYPES)[number];

export const isEmailLinkType = (value: string | null): value is EmailLinkType => (EMAIL_LINK_TYPES as readonly string[]).includes(value ?? "");

/** Links que terminam na criação de senha. */
export const setsPassword = (type: EmailLinkType) => type === "recovery" || type === "invite";

/** Formato e tamanho do token (quem confere de verdade é o Supabase). */
export const isTokenHash = (value: string | null): value is string => !!value && /^[\w-]{8,512}$/.test(value);

/** Volta de /auth/callback é do link de nova senha (o pedido manda next=/redefinir-senha). */
export const isRecoveryReturn = (next: string) => next === RESET_PASSWORD_PATH;

/** Código do aviso quando a volta falha. */
export function returnFailure(input: { recovery: boolean; providerError?: string | null; errorCode?: string | null }): NoticeCode {
  if (input.recovery) return input.errorCode === "pkce_code_verifier_not_found" ? "outro_navegador" : "link_invalido";
  return input.providerError === "access_denied" ? "google_cancelado" : "google";
}

/** Tela do aviso: pedir outro link (senha) ou entrar de novo, mantendo o destino. */
export function failurePath(code: NoticeCode, opts: { recovery: boolean; next?: string }): string {
  if (opts.recovery) return `/recuperar-senha?erro=${code}`;
  const query = new URLSearchParams({ erro: code });
  if (opts.next && opts.next !== "/painel" && !isRecoveryReturn(opts.next)) query.set("next", opts.next);
  return `/entrar?${query}`;
}
