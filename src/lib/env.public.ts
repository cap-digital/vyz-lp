// Variáveis públicas (vão para o navegador). O acesso precisa ser literal:
// o Next só embute process.env.NEXT_PUBLIC_* escrito por extenso.

export const PUBLIC_ENV = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  // NEXT_PUBLIC_SUPABASE_ANON_KEY: nome antigo, aceito como alternativa.
  supabasePublishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, ""),
};
