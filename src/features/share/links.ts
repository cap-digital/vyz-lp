// Regras dos links públicos (/r/<token>) que o servidor e a lista repetem:
// formato do token, dica para reconhecer o link, validade e situação.
// O token nasce e é conferido só no servidor (src/server/share/token.ts).

/** 32 bytes em base64url = 43 caracteres. */
export const SHARE_TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
export const isShareToken = (v: unknown): v is string => typeof v === "string" && SHARE_TOKEN_RE.test(v);

/** Últimos 6 caracteres (token_hint aceita 4 a 8). */
export const tokenHint = (token: string) => token.slice(-6);

export const EXPIRY_OPTIONS = [
  { value: "7", label: "7 dias" },
  { value: "30", label: "30 dias" },
  { value: "90", label: "90 dias" },
  { value: "nunca", label: "Nunca" },
] as const;

export type ExpiryOption = (typeof EXPIRY_OPTIONS)[number]["value"];
export const EXPIRY_VALUES = EXPIRY_OPTIONS.map((o) => o.value) as [ExpiryOption, ...ExpiryOption[]];

/** Validade escolhida → expires_at (null = nunca expira). */
export function expiresAtFrom(option: ExpiryOption, now: Date): string | null {
  if (option === "nunca") return null;
  return new Date(now.getTime() + Number(option) * 86_400_000).toISOString();
}

export type LinkStatus = "active" | "expired" | "revoked";

export function linkStatus(l: { revokedAt: string | null; expiresAt: string | null }, now: Date): LinkStatus {
  if (l.revokedAt) return "revoked";
  if (l.expiresAt && new Date(l.expiresAt).getTime() <= now.getTime()) return "expired";
  return "active";
}

export const LINK_STATUS_LABEL: Record<LinkStatus, string> = { active: "Ativo", expired: "Expirado", revoked: "Revogado" };

/** "2026-10-30T02:00:00Z" → "29/10/2026" no fuso dado (mesmo texto no servidor e no navegador). */
export function dateIn(iso: string, timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone, day: "2-digit", month: "2-digit", year: "numeric" }).formatToParts(new Date(iso));
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    return `${get("day")}/${get("month")}/${get("year")}`;
  } catch {
    return iso.slice(0, 10).split("-").reverse().join("/");
  }
}
