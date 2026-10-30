// Faz login com e-mail e senha e imprime o cabeçalho Cookie no formato do
// @supabase/ssr, para testar páginas autenticadas pelo terminal:
//
//   COOKIE="$(npx tsx scripts/dev/auth-cookie.ts --email teste@vyz.dev --password Teste12345)"
//   curl -s -H "Cookie: $COOKIE" http://localhost:3000/painel
//
// Só para desenvolvimento.

import { parseArgs } from "node:util";
import { createServerClient } from "@supabase/ssr";

process.loadEnvFile?.(".env.local");

const { values } = parseArgs({ options: { email: { type: "string" }, password: { type: "string" } } });
if (!values.email || !values.password) throw new Error("--email e --password são obrigatórios");

const jar = new Map<string, string>();

async function main() {
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (list) => {
        for (const { name, value } of list) {
          if (value) jar.set(name, value);
          else jar.delete(name);
        }
      },
    },
  });
  const { error } = await supabase.auth.signInWithPassword({ email: values.email!, password: values.password! });
  if (error) throw error;
  await new Promise((r) => setTimeout(r, 100));
  process.stdout.write([...jar].map(([n, v]) => `${n}=${v}`).join("; "));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
