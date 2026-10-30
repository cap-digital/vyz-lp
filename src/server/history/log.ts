import "server-only";

// Histórico gravado pelo servidor: acessos (auth_events), uso do produto
// (activity_events) e aceites legais (legal_acceptances). Grava depois da
// resposta (after), sem atrasar o usuário; falha de log nunca quebra a ação.
// Mudanças de dados ficam na auditoria do banco (audit_events, por gatilho).

import { isIP } from "node:net";
import { after } from "next/server";
import type { Json } from "@/lib/supabase/database.types";
import { requestContext } from "@/server/http/request";
import { createAdminSupabase } from "@/server/supabase/admin";

export type AuthEventName =
  | "signup"
  | "sign_in"
  | "sign_in_failed"
  | "sign_out"
  | "oauth_sign_in"
  | "password_reset_requested"
  | "password_updated"
  | "email_changed"
  | "rate_limited";

export type AuthMethod = "password" | "google" | "magic_link" | "admin" | "checkout";

const cleanIp = (ip: string | null) => (ip && isIP(ip) ? ip : null);

function later(task: () => Promise<void>) {
  const run = async () => {
    try {
      await task();
    } catch (err) {
      console.error("[vyz] falha ao gravar histórico", err);
    }
  };
  try {
    after(run);
  } catch {
    // fora de uma requisição (scripts): grava na hora
    void run();
  }
}

export async function logAuthEvent(e: { event: AuthEventName; userId?: string | null; email?: string | null; method?: AuthMethod; metadata?: Record<string, Json> }) {
  const ctx = await requestContext();
  later(async () => {
    const { error } = await createAdminSupabase().from("auth_events").insert({
      event: e.event,
      user_id: e.userId ?? null,
      email: e.email ? e.email.trim().toLowerCase().slice(0, 254) : null,
      method: e.method ?? null,
      ip: cleanIp(ctx.ip),
      user_agent: ctx.userAgent,
      metadata: e.metadata ?? {},
    });
    if (error) throw error;
  });
}

export type ActivityEventName = `${string}.${string}`;

export async function logActivity(e: {
  workspaceId: string;
  actorId?: string | null;
  event: ActivityEventName;
  entityType?: string;
  entityId?: string | null;
  metadata?: Record<string, Json>;
}) {
  const ctx = await requestContext();
  later(async () => {
    const { error } = await createAdminSupabase().from("activity_events").insert({
      workspace_id: e.workspaceId,
      actor_id: e.actorId ?? null,
      event: e.event,
      entity_type: e.entityType ?? null,
      entity_id: e.entityId ?? null,
      metadata: e.metadata ?? {},
      ip: cleanIp(ctx.ip),
      user_agent: ctx.userAgent,
    });
    if (error) throw error;
  });
}

export type LegalDocument = "terms" | "privacy" | "dpa" | "marketing";

/** Versões vigentes dos documentos (mudou o texto, sobe a versão). */
export const LEGAL_VERSIONS: Record<LegalDocument, string> = {
  terms: "2026-10-29",
  privacy: "2026-10-29",
  dpa: "2026-10-29",
  marketing: "2026-10-29",
};

/** Grava na hora (é prova de aceite: não pode se perder). */
export async function recordLegalAcceptances(input: { userId: string; email: string; documents: { document: LegalDocument; accepted: boolean }[]; checkoutSessionId?: string | null }) {
  const ctx = await requestContext();
  const rows = input.documents.map((d) => ({
    user_id: input.userId,
    email: input.email.trim().toLowerCase(),
    document: d.document,
    document_version: LEGAL_VERSIONS[d.document],
    accepted: d.accepted,
    checkout_session_id: input.checkoutSessionId ?? null,
    ip: cleanIp(ctx.ip),
    user_agent: ctx.userAgent,
  }));
  const { error } = await createAdminSupabase({ actorId: input.userId }).from("legal_acceptances").insert(rows);
  if (error) throw error;
}
