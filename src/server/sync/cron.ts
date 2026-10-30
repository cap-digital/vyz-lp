import "server-only";

// Quem pode chamar a rota do agendador: só quem manda o CRON_SECRET no
// cabeçalho Authorization (o Vercel Cron faz isso sozinho:
// "Authorization: Bearer <CRON_SECRET>"). Sem segredo configurado, a rota
// fica fechada.

import { createHash, timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/server/env";

/** O segredo, se estiver configurado (serverEnv exige 16 caracteres ou mais). */
export const cronSecret = (): string | null => serverEnv().CRON_SECRET ?? null;

const digest = (value: string) => createHash("sha256").update(value).digest();

/** Compara em tempo constante (o hash iguala os tamanhos). */
export function isAuthorizedCron(authorization: string | null, secret: string): boolean {
  const match = /^Bearer\s+(\S+)$/.exec(authorization?.trim() ?? "");
  if (!match) return false;
  return timingSafeEqual(digest(match[1]), digest(secret));
}
