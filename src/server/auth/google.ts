import "server-only";

// O login com Google depende do provedor ligado no Supabase (Authentication →
// Providers → Google). Desligado, o /authorize do Supabase devolve um JSON de
// erro; por isso a tela consulta antes as configurações públicas do Auth e
// mostra um aviso. Cache curto: ligou no painel, o botão aparece em cerca de
// um minuto.

import { cacheLife } from "next/cache";
import { googleStatusFrom, type GoogleStatus } from "@/features/auth/google";
import { serverEnv } from "@/server/env";

export async function googleSignInStatus(): Promise<GoogleStatus> {
  "use cache";
  cacheLife("minutes");
  const env = serverEnv();
  try {
    const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return googleStatusFrom(await res.json());
  } catch (err) {
    console.error("[vyz] configurações do Supabase Auth indisponíveis", err);
    return "unknown";
  }
}
