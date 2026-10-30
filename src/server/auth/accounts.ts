import "server-only";

// Criação de conta com e-mail e senha (checkout) e login no servidor.
// A conta nasce confirmada: quem paga já entra. A verificação de e-mail entra
// depois (ver docs/PENDENCIAS.md).

import { createAdminSupabase } from "@/server/supabase/admin";
import { createServerSupabase } from "@/server/supabase/server";

export type CreateUserResult = { ok: true; userId: string } | { ok: false; reason: "email_exists" | "weak_password" | "invalid_email" | "unknown" };

export async function createConfirmedUser(input: { email: string; password: string; fullName: string; phone?: string | null }): Promise<CreateUserResult> {
  const { data, error } = await createAdminSupabase().auth.admin.createUser({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName.trim(), ...(input.phone ? { phone: input.phone } : {}) },
  });
  if (error || !data.user) {
    const code = (error as { code?: string } | null)?.code ?? "";
    if (code === "email_exists" || code === "user_already_exists" || /already|registered/i.test(error?.message ?? "")) return { ok: false, reason: "email_exists" };
    if (code === "weak_password") return { ok: false, reason: "weak_password" };
    if (code === "email_address_invalid" || code === "validation_failed") return { ok: false, reason: "invalid_email" };
    console.error("[vyz] criar usuário", error);
    return { ok: false, reason: "unknown" };
  }
  return { ok: true, userId: data.user.id };
}

/** Login com e-mail e senha. Grava os cookies da sessão: só em Server Actions e Route Handlers. */
export async function signInWithPasswordServer(email: string, password: string): Promise<{ ok: true; userId: string } | { ok: false; reason: "invalid_credentials" | "unknown" }> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error || !data.user) {
    const code = (error as { code?: string } | null)?.code ?? "";
    if (code === "invalid_credentials" || error?.status === 400) return { ok: false, reason: "invalid_credentials" };
    console.error("[vyz] login", error);
    return { ok: false, reason: "unknown" };
  }
  return { ok: true, userId: data.user.id };
}
