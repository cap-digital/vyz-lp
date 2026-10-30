import "server-only";

// Prévia do convite para quem abre o link. A pessoa convidada ainda não é
// membro (o RLS de convites é só de admin): lê com a chave de serviço pelo
// hash do token, e a tela só mostra o nome do workspace a quem entrou com o
// e-mail do convite.

import { createHash } from "node:crypto";
import { createAdminSupabase } from "@/server/supabase/admin";

export type InvitationPreview = { email: string; role: string; workspaceName: string };

export async function getInvitationPreview(token: string): Promise<InvitationPreview | null> {
  const hash = createHash("sha256").update(token, "utf8").digest("hex");
  const { data, error } = await createAdminSupabase()
    .from("workspace_invitations")
    .select("email, role, expires_at, accepted_at, revoked_at, workspace:workspaces!inner(name)")
    .eq("token_hash", hash)
    .maybeSingle();
  if (error) console.error("[vyz] convite", error.code);
  if (!data || data.accepted_at || data.revoked_at || new Date(data.expires_at) < new Date()) return null;
  return { email: data.email.toLowerCase(), role: data.role, workspaceName: data.workspace.name };
}
