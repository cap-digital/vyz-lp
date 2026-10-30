// Cookies da sessão do Supabase. httpOnly: o navegador nunca lê o token (um
// XSS não rouba a sessão); toda chamada autenticada passa pelo servidor.

export const AUTH_COOKIE_OPTIONS = {
  path: "/",
  sameSite: "lax",
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
} as const;

/** Workspace aberto (quando o usuário participa de mais de um). */
export const ACTIVE_WORKSPACE_COOKIE = "vyz-ws";
