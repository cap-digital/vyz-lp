import "server-only";

// Cliente com a chave de serviço: ignora o RLS. Só para o que o usuário não
// pode fazer direto (concluir checkout, gravar tokens no Vault, sincronizar
// métricas, ler links públicos, gravar histórico). Toda função que usa este
// cliente autoriza antes com src/server/auth (nunca confie no que vem do
// navegador). O actorId vai para a auditoria (x-vyz-actor-id).

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { serverEnv } from "@/server/env";
import type { DB } from "./server";

export type AdminContext = { actorId?: string | null; forwardHeaders?: Record<string, string> };

export function createAdminSupabase(ctx: AdminContext = {}): DB {
  const env = serverEnv();
  const headers: Record<string, string> = { ...ctx.forwardHeaders };
  if (ctx.actorId) headers["x-vyz-actor-id"] = ctx.actorId;
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers },
  });
}
