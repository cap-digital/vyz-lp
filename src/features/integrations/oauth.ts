// Peças do OAuth sem dependência do servidor: state aleatório, hash do state
// (o banco guarda só o sha256) e PKCE S256 (RFC 7636). Web Crypto: roda no
// Node e no navegador, e dá para testar.

const encoder = new TextEncoder();

function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

/** Bytes aleatórios em base64url, sem padding (32 bytes = 43 caracteres). */
export function randomToken(bytes = 32): string {
  return base64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

/** sha256 em hexadecimal (formato de oauth_states.state_hash). */
export async function sha256Hex(value: string): Promise<string> {
  return Array.from(await sha256(value), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** code_challenge = BASE64URL(SHA256(code_verifier)), método S256. */
export async function pkceChallenge(verifier: string): Promise<string> {
  return base64url(await sha256(verifier));
}

/** State no formato que o VYZ gera (32 bytes em base64url). */
export const isStateToken = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9_-]{43}$/.test(v);

/** code_verifier válido: 43 a 128 caracteres de [A-Za-z0-9-._~]. */
export const isCodeVerifier = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9._~-]{43,128}$/.test(v);
