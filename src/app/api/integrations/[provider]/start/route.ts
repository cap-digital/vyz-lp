// GET /api/integrations/<meta|google>/start?next=/comecar
// Começa a conexão: admin do workspace, limite de tentativas, state no banco e
// redirecionamento ao provedor (ou à tela simulada, no modo mock).

import type { NextRequest } from "next/server";
import { isProviderId } from "@/features/integrations/providers";
import { oauthRedirect, startConnection } from "@/server/integrations/flow";

export async function GET(request: NextRequest, ctx: RouteContext<"/api/integrations/[provider]/start">) {
  const { provider } = await ctx.params;
  if (!isProviderId(provider)) return new Response("Provedor desconhecido.", { status: 404 });
  return oauthRedirect(await startConnection(provider, request.nextUrl.searchParams.get("next")));
}
