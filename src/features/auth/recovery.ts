// Quem pode criar uma senha nova sem informar a atual: só a sessão aberta por
// um link de e-mail (recuperação, convite) e só logo depois de aberta. Uma
// sessão roubada de quem entrou com senha não troca a senha por aqui; precisa
// da senha atual (changePassword). O método vem do claim amr do JWT, assinado
// pelo Supabase.

export const RESET_PASSWORD_PATH = "/redefinir-senha";

/** Tempo para criar a senha depois de abrir o link. */
export const RECOVERY_WINDOW_SECONDS = 60 * 60;

// recovery: link de nova senha (PKCE); otp: verifyOtp em /auth/confirm;
// invite e magiclink: convite e link mágico.
const EMAIL_LINK_METHODS = new Set(["recovery", "otp", "magiclink", "invite"]);

/** Métodos do claim amr ("password", "oauth", "otp"...). */
export function amrMethods(amr: unknown): string[] {
  if (!Array.isArray(amr)) return [];
  return amr.flatMap((entry: unknown) => {
    if (typeof entry === "string") return [entry];
    const method = typeof entry === "object" && entry !== null ? (entry as { method?: unknown }).method : undefined;
    return typeof method === "string" ? [method] : [];
  });
}

/** amr no formato do Supabase ([{ method, timestamp }]) ou RFC 8176 (["otp"]). */
export function isRecentRecovery(amr: unknown, nowSeconds: number): boolean {
  if (!Array.isArray(amr)) return false;
  return amr.some((entry: unknown) => {
    // formato sem horário: vale o método
    if (typeof entry === "string") return EMAIL_LINK_METHODS.has(entry);
    if (typeof entry !== "object" || entry === null) return false;
    const { method, timestamp } = entry as { method?: unknown; timestamp?: unknown };
    if (typeof method !== "string" || !EMAIL_LINK_METHODS.has(method) || typeof timestamp !== "number") return false;
    const age = nowSeconds - timestamp;
    return age >= -60 && age <= RECOVERY_WINDOW_SECONDS;
  });
}
