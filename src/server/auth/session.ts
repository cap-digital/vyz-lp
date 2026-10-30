import "server-only";

// Quem está logado. getClaims() valida o JWT localmente (chave assimétrica
// ES256 do projeto, JWKS em cache): rápido e sem ida ao servidor de Auth.
// Memorizado por requisição (React cache).

import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { createServerSupabase } from "@/server/supabase/server";

export type SessionUser = { id: string; email: string | null };

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  // getClaims compara a validade do token com o relógio: só na requisição,
  // nunca no prerender da casca (Partial Prefetching).
  await connection();
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  return { id: data.claims.sub, email: typeof data.claims.email === "string" ? data.claims.email : null };
});

/** Para páginas: sem sessão, vai para /entrar (e volta para `next` depois). */
export async function requireSessionUser(next?: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(next ? `/entrar?next=${encodeURIComponent(next)}` : "/entrar");
  return user;
}
