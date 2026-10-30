import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { AuthCard } from "@/features/auth/AuthShell";
import { isRecentRecovery } from "@/features/auth/recovery";
import { ResetPasswordPage } from "@/features/auth/ResetPasswordPage";
import { ResetUnavailable } from "@/features/auth/ResetUnavailable";
import { createServerSupabase } from "@/server/supabase/server";

export const metadata: Metadata = {
  title: "Nova senha",
  description: "Crie uma senha nova para a sua conta VYZ.",
};

// A sessão é dado da requisição: fica dentro do Suspense.
export default function RedefinirSenha({ searchParams }: PageProps<"/redefinir-senha">) {
  return (
    <Suspense
      fallback={
        <AuthCard title="Criar nova senha">
          <p className="mt-3 text-[14px] text-fg-2">Conferindo o link…</p>
        </AuthCard>
      }
    >
      <Reset searchParams={searchParams} />
    </Suspense>
  );
}

async function Reset({ searchParams }: { searchParams: PageProps<"/redefinir-senha">["searchParams"] }) {
  const access = await recoveryAccess();
  const next = (await searchParams).next;
  if (access.ok) return <ResetPasswordPage email={access.email} next={typeof next === "string" ? next : undefined} />;
  return <ResetUnavailable signedIn={access.signedIn} />;
}

// Só a sessão aberta pelo link do e-mail, há pouco, cria a senha sem a atual
// (resetPassword confere de novo). A conferência usa o relógio (validade do
// JWT e do link): só na requisição, fora da pré-renderização da sessão.
async function recoveryAccess(): Promise<{ ok: true; email: string | null } | { ok: false; signedIn: boolean }> {
  await connection();
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return { ok: false, signedIn: false };
  if (!isRecentRecovery(claims.amr, Math.floor(Date.now() / 1000))) return { ok: false, signedIn: true };
  return { ok: true, email: typeof claims.email === "string" ? claims.email : null };
}
