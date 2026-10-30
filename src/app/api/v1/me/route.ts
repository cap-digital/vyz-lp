// GET /api/v1/me: quem está logado e seus workspaces (com plano). Usado pelo
// app nativo logo depois do login.

import { apiJson, bearerSession, unauthorized } from "@/server/auth/bearer";

export async function GET(request: Request) {
  const session = await bearerSession(request);
  if (!session) return unauthorized();
  const { db, userId } = session;
  const [profile, members, credits] = await Promise.all([
    db.from("profiles").select("full_name, email, avatar_url, default_workspace_id").eq("id", userId).maybeSingle(),
    db.from("workspace_members").select("role, workspace:workspaces!inner(id, name, onboarding_step)").eq("user_id", userId),
    db.from("credit_balances").select("balance").eq("user_id", userId).maybeSingle(),
  ]);
  const ids = (members.data ?? []).map((m) => m.workspace.id);
  const access = ids.length ? await db.from("workspace_access").select("workspace_id, plan_id, has_access").in("workspace_id", ids) : { data: [] };
  return apiJson({
    user: { id: userId, email: profile.data?.email ?? session.email, fullName: profile.data?.full_name ?? "", avatarUrl: profile.data?.avatar_url ?? null },
    credits: credits.data?.balance ?? 0,
    defaultWorkspaceId: profile.data?.default_workspace_id ?? ids[0] ?? null,
    workspaces: (members.data ?? []).map((m) => {
      const a = access.data?.find((x) => x.workspace_id === m.workspace.id);
      return { id: m.workspace.id, name: m.workspace.name, role: m.role, onboardingDone: m.workspace.onboarding_step === "done", plan: a?.plan_id ?? null, hasAccess: !!a?.has_access };
    }),
  });
}
