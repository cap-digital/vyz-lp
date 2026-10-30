// Sincroniza contas de anúncio pelo terminal com a mesma rotina do app
// (src/server/sync/run.ts): gera os dados simulados e grava no armazém. Com
// --seed, antes conecta o Meta e o Google simulados (as mesmas contas do login
// simulado), ativa uma conta de cada e sincroniza. Só para desenvolvimento.
//
//   npx tsx --conditions=react-server scripts/dev/sync-account.ts --id <ad_account_id> [--id …] [--trigger initial|manual|scheduled]
//   npx tsx --conditions=react-server scripts/dev/sync-account.ts --workspace <workspace_id>      (todas as contas ativas)
//   npx tsx --conditions=react-server scripts/dev/sync-account.ts --seed --email teste@vyz.dev   (conecta, ativa e sincroniza 90 dias)
//
// O --conditions=react-server deixa importar módulos com "server-only".

import { parseArgs } from "node:util";
import { MOCK_ACCOUNTS, MOCK_PROFILES } from "@/features/integrations/mock-data";
import { randomToken } from "@/features/integrations/oauth";
import { providerScopes, type ProviderId } from "@/features/integrations/providers";
import { createAdminSupabase } from "@/server/supabase/admin";
import { syncAdAccounts, type SyncTrigger } from "@/server/sync/run";

process.loadEnvFile?.(".env.local");

const { values } = parseArgs({
  options: {
    id: { type: "string", multiple: true },
    workspace: { type: "string" },
    email: { type: "string" },
    seed: { type: "boolean", default: false },
    trigger: { type: "string", default: "initial" },
  },
});

const TRIGGERS: SyncTrigger[] = ["initial", "manual", "scheduled"];
const trigger = values.trigger as SyncTrigger;
if (!TRIGGERS.includes(trigger)) throw new Error(`--trigger deve ser ${TRIGGERS.join(", ")}`);

const db = createAdminSupabase();

// os tipos gerados não marcam parâmetro de função como opcional
const orNull = <T>(v: T | null | undefined) => (v ?? null) as T;

async function ownerOf(email: string): Promise<{ userId: string; workspaceId: string }> {
  const { data: profile, error } = await db.from("profiles").select("id").ilike("email", email.trim()).maybeSingle();
  if (error) throw error;
  if (!profile) throw new Error(`Usuário não encontrado: ${email}`);
  const { data: member, error: mErr } = await db
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", profile.id)
    .eq("role", "owner")
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (mErr) throw mErr;
  if (!member) throw new Error(`${email} não é dono de nenhum workspace.`);
  return { userId: profile.id, workspaceId: values.workspace ?? member.workspace_id };
}

/** Como o callback do login simulado: grava a conexão (tokens no Vault) e as contas descobertas. */
async function connectMock(provider: ProviderId, workspaceId: string, userId: string): Promise<string> {
  const google = provider === "google";
  const profile = MOCK_PROFILES[provider];
  const accounts = MOCK_ACCOUNTS[provider].map((a) => ({
    platform_id: provider,
    external_id: a.externalId,
    name: a.name,
    currency: a.currency,
    timezone: a.timezone,
    status: "active",
    business_external_id: a.business?.id ?? null,
    business_name: a.business?.name ?? null,
    manager_external_id: a.manager?.id ?? null,
    metadata: { source: "mock", manager_name: a.manager?.name ?? null },
  }));
  const { data, error } = await db.rpc("integration_connect", {
    p_workspace_id: workspaceId,
    p_provider: provider,
    p_external_user_id: profile.id,
    p_external_user_name: profile.name,
    p_external_user_email: profile.email,
    p_scopes: providerScopes(provider),
    p_is_mock: true,
    p_connected_by: userId,
    p_access_token: `mock_at_${randomToken()}`,
    p_refresh_token: orNull(google ? `mock_rt_${randomToken()}` : null),
    p_token_expires_at: new Date(Date.now() + (google ? 1 : 24 * 60) * 60 * 60 * 1000).toISOString(),
    p_accounts: accounts,
  });
  if (error) throw error;
  return data;
}

/** Ativa a primeira conta simulada da plataforma (o limite do plano vale: gatilho do banco). */
async function enableFirst(provider: ProviderId, workspaceId: string): Promise<string> {
  const externalId = MOCK_ACCOUNTS[provider][0].externalId;
  const { data, error } = await db.from("ad_accounts").select("id").eq("workspace_id", workspaceId).eq("platform_id", provider).eq("external_id", externalId).single();
  if (error) throw error;
  const { error: eErr } = await db.rpc("set_enabled_ad_accounts", { p_workspace_id: workspaceId, p_platform_id: provider, p_ad_account_ids: [data.id] });
  if (eErr) throw eErr;
  return data.id;
}

async function enabledAccounts(workspaceId: string): Promise<string[]> {
  const { data, error } = await db.from("ad_accounts").select("id").eq("workspace_id", workspaceId).eq("is_enabled", true).order("platform_id");
  if (error) throw error;
  return data.map((a) => a.id);
}

async function main() {
  let ids = values.id ?? [];
  let seeded: Record<string, unknown> | null = null;

  if (values.seed) {
    if (!values.email) throw new Error("--seed precisa de --email");
    const { userId, workspaceId } = await ownerOf(values.email);
    const connections = { meta: await connectMock("meta", workspaceId, userId), google: await connectMock("google", workspaceId, userId) };
    const adAccounts = { meta: await enableFirst("meta", workspaceId), google: await enableFirst("google", workspaceId) };
    seeded = { userId, workspaceId, connections, adAccounts };
    ids = [adAccounts.meta, adAccounts.google];
  } else if (values.workspace) {
    ids = await enabledAccounts(values.workspace);
  }
  if (ids.length === 0) throw new Error("Nada para sincronizar: use --id, --workspace ou --seed --email.");

  const started = Date.now();
  const results = await syncAdAccounts(ids, trigger);
  console.log(JSON.stringify({ ...(seeded ? { seeded } : {}), trigger, totalMs: Date.now() - started, results }, null, 2));
  if (results.some((r) => !r.ok)) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
