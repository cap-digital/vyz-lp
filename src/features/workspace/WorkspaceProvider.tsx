"use client";

// Entrega a sessão do workspace (montada no servidor) aos componentes do
// painel. Mudanças passam por Server Actions, que re-renderizam a rota e
// trazem a sessão nova.

import { createContext, use, type ReactNode } from "react";
import type { WorkspaceSession } from "./session";

const WorkspaceContext = createContext<WorkspaceSession | null>(null);

export function WorkspaceProvider({ session, children }: { session: WorkspaceSession; children: ReactNode }) {
  return <WorkspaceContext value={session}>{children}</WorkspaceContext>;
}

export function useWorkspaceSession(): WorkspaceSession {
  const session = use(WorkspaceContext);
  if (!session) throw new Error("useWorkspaceSession precisa estar dentro do WorkspaceProvider");
  return session;
}

/** Igual a useWorkspaceSession, mas devolve null fora do painel (ex.: páginas públicas). */
export function useOptionalWorkspaceSession(): WorkspaceSession | null {
  return use(WorkspaceContext);
}
