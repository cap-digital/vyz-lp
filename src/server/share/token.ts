import "server-only";

// Token dos links públicos: 32 bytes aleatórios em base64url. O banco guarda só
// o sha256 (hex) e os últimos caracteres (para reconhecer o link na lista); o
// link completo aparece uma vez, na criação.

import { createHash, randomBytes } from "node:crypto";
import { tokenHint } from "@/features/share/links";

export const hashShareToken = (token: string) => createHash("sha256").update(token, "utf8").digest("hex");

export function newShareToken(): { token: string; hash: string; hint: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashShareToken(token), hint: tokenHint(token) };
}
