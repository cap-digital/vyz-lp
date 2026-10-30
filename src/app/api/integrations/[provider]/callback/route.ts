// GET /api/integrations/<meta|google>/callback?state=...&code=... (ou &error=access_denied)
// Volta do provedor: confere o state, troca o código, grava a conexão e as
// contas e volta para onde a conexão começou (?conectado= ou ?erro=).

import type { NextRequest } from "next/server";
import { isProviderId } from "@/features/integrations/providers";
import { finishConnection, oauthRedirect } from "@/server/integrations/flow";

export async function GET(request: NextRequest, ctx: RouteContext<"/api/integrations/[provider]/callback">) {
  const { provider } = await ctx.params;
  if (!isProviderId(provider)) return new Response("Provedor desconhecido.", { status: 404 });
  return oauthRedirect(await finishConnection(provider, request.nextUrl.searchParams));
}
