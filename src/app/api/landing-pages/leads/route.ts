// GET /api/landing-pages/leads?lp=&periodo=: CSV dos leads do workspace
// aberto (admin). Sai em partes (stream), com as células escapadas e sem
// fórmulas (src/features/landing-pages/leads.ts).

import type { NextRequest } from "next/server";
import { CSV_BOM, leadCsvFilename, parseLeadFilters } from "@/features/landing-pages/leads";
import { authorize } from "@/server/auth/workspace";
import { logActivity } from "@/server/history/log";
import { prepareLeadCsv } from "@/server/landing-pages/leads";
import { AppError } from "@/server/supabase/errors";

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET(request: NextRequest) {
  let session;
  try {
    // ler os leads não exige plano ativo: o dado é do cliente
    session = await authorize("admin", { access: false });
  } catch (err) {
    const code = err instanceof AppError ? err.code : "unknown";
    const status = code === "auth:required" ? 401 : code === "forbidden" ? 403 : 500;
    return new Response(err instanceof AppError ? err.message : "Erro inesperado.", { status, headers: { ...NO_STORE, "Content-Type": "text/plain; charset=utf-8" } });
  }

  const filters = parseLeadFilters(request.nextUrl.searchParams);
  const chunks = await prepareLeadCsv(session, filters);
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode(CSV_BOM));
    },
    async pull(controller) {
      try {
        const { value, done } = await chunks.next();
        if (done) controller.close();
        else controller.enqueue(encoder.encode(value));
      } catch (err) {
        console.error("[vyz] exportar leads", err instanceof Error ? err.message : "erro desconhecido");
        controller.error(err);
      }
    },
    async cancel() {
      await chunks.return(undefined);
    },
  });

  await logActivity({
    workspaceId: session.workspace.id,
    actorId: session.user.id,
    event: "landing.leads_exported",
    entityType: "landing_page",
    entityId: filters.landingPageId,
    metadata: { period: filters.period },
  });

  return new Response(stream, {
    headers: {
      ...NO_STORE,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${leadCsvFilename()}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
