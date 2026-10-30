// GET|POST /api/cron/sync
// Sincronização agendada (Vercel Cron ou outro agendador): traz os últimos 7
// dias das contas ativas que não sincronizam há algumas horas. Só com
// "Authorization: Bearer <CRON_SECRET>"; sem o segredo configurado, 503.

import { cronSecret, isAuthorizedCron } from "@/server/sync/cron";
import { syncDueAccounts } from "@/server/sync/scheduled";

export const maxDuration = 300;

const NO_STORE = { "Cache-Control": "no-store" };

async function handle(request: Request) {
  // ler o cabeçalho primeiro também deixa a rota fora da pré-renderização
  const authorization = request.headers.get("authorization");
  const secret = cronSecret();
  if (!secret) return Response.json({ ok: false, error: "cron:not_configured", message: "Defina CRON_SECRET para liberar a sincronização agendada." }, { status: 503, headers: NO_STORE });
  if (!isAuthorizedCron(authorization, secret)) return Response.json({ ok: false, error: "unauthorized" }, { status: 401, headers: NO_STORE });

  try {
    // termina antes do limite da função, com folga para a resposta
    const summary = await syncDueAccounts({ budgetMs: (maxDuration - 45) * 1000 });
    return Response.json(summary, { headers: NO_STORE });
  } catch (err) {
    console.error("[vyz] cron de sincronização", err instanceof Error ? err.message : err);
    return Response.json({ ok: false, error: "unknown" }, { status: 500, headers: NO_STORE });
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
