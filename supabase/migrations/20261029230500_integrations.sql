-- =============================================================================
-- VYZ · 05 · Integrações
-- Conexões OAuth (Meta, Google), tokens criptografados no Supabase Vault,
-- estados de OAuth (anti-CSRF + PKCE), contas de anúncio descobertas e o
-- histórico de sincronizações.
-- Tokens nunca ficam em texto puro: a tabela guarda só o id do segredo no
-- Vault e a leitura passa por função restrita ao service_role.
-- =============================================================================

-- ---- conexões ---------------------------------------------------------------------

create table public.connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  provider public.integration_provider not null,
  status public.connection_status not null default 'active',
  external_user_id text not null,
  external_user_name text,
  external_user_email text,
  scopes text[] not null default '{}',
  is_mock boolean not null default false,
  connected_by uuid references auth.users (id) on delete set null,
  connected_at timestamptz not null default now(),
  token_expires_at timestamptz,
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, provider, external_user_id),
  unique (workspace_id, id)
);
comment on table public.connections is 'Login do usuário no Meta ou no Google autorizado para o workspace. Os tokens ficam no Vault (connection_secrets).';
comment on column public.connections.is_mock is 'true = conexão simulada (sem credenciais do provedor).';
create index connections_connected_by_idx on public.connections (connected_by);

-- Ids dos segredos no Vault. Sem políticas: só o service_role acessa.
create table public.connection_secrets (
  connection_id uuid primary key references public.connections (id) on delete cascade,
  access_token_secret_id uuid not null,
  refresh_token_secret_id uuid,
  updated_at timestamptz not null default now()
);
comment on table public.connection_secrets is 'Ponteiros para os tokens no Supabase Vault. Só service_role; leitura por public.connection_tokens_read.';

-- Estado do OAuth: guarda o hash do state enviado ao provedor e o PKCE.
create table public.oauth_states (
  id uuid primary key default gen_random_uuid(),
  state_hash text not null unique check (state_hash ~ '^[0-9a-f]{64}$'),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  provider public.integration_provider not null,
  code_verifier text,
  redirect_path text not null default '/painel/contas' check (redirect_path ~ '^/[A-Za-z0-9/_?=&%.-]*$' and redirect_path !~ '^//'),
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
comment on table public.oauth_states is 'Início de cada conexão OAuth (anti-CSRF, PKCE e retorno). Uso único, expira em 10 min. Só service_role.';
create index oauth_states_workspace_idx on public.oauth_states (workspace_id);
create index oauth_states_user_idx on public.oauth_states (user_id);
create index oauth_states_expires_idx on public.oauth_states (expires_at);

-- ---- contas de anúncio ----------------------------------------------------------------

create table public.ad_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  connection_id uuid,
  platform_id text not null references public.platforms (id),
  external_id text not null check (char_length(external_id) between 1 and 64),
  name text not null check (char_length(name) between 1 and 200),
  currency text not null default 'BRL' check (currency ~ '^[A-Z]{3}$'),
  timezone text not null default 'America/Sao_Paulo',
  business_external_id text,
  business_name text,
  manager_external_id text,
  status text not null default 'active' check (status in ('active', 'disabled', 'pending', 'closed')),
  is_enabled boolean not null default false,
  enabled_at timestamptz,
  last_synced_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, platform_id, external_id),
  unique (workspace_id, id),
  foreign key (workspace_id, connection_id) references public.connections (workspace_id, id) on delete set null (connection_id),
  check (not is_enabled or (status = 'active' and connection_id is not null)),
  check ((is_enabled) = (enabled_at is not null))
);
comment on table public.ad_accounts is 'Contas de anúncio/propriedades vistas pelas conexões (ou cadastradas à mão, status pending). is_enabled = conta ativa no VYZ (entra no limite do plano e sincroniza).';
comment on column public.ad_accounts.business_external_id is 'Meta: Business Manager. Cada BM conta como 1 conta contratada.';
comment on column public.ad_accounts.manager_external_id is 'Google Ads: conta de administrador (MCC).';
create index ad_accounts_connection_idx on public.ad_accounts (workspace_id, connection_id);
create index ad_accounts_platform_idx on public.ad_accounts (platform_id);
create index ad_accounts_enabled_idx on public.ad_accounts (workspace_id) where is_enabled;

-- ---- sincronizações -------------------------------------------------------------------

create table public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  connection_id uuid,
  ad_account_id uuid,
  trigger text not null check (trigger in ('initial', 'scheduled', 'manual')),
  status public.sync_status not null default 'queued',
  range_start date,
  range_end date,
  rows_written integer not null default 0 check (rows_written >= 0),
  error text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (workspace_id, connection_id) references public.connections (workspace_id, id) on delete cascade,
  foreign key (workspace_id, ad_account_id) references public.ad_accounts (workspace_id, id) on delete cascade,
  check (range_end is null or range_start is null or range_end >= range_start)
);
comment on table public.sync_runs is 'Cada importação de dados de uma conta. Uma por conta por vez (índice parcial).';
-- Trava de concorrência: nunca duas sincronizações da mesma conta ao mesmo tempo.
create unique index sync_runs_one_active_per_account on public.sync_runs (ad_account_id) where status in ('queued', 'running');
create index sync_runs_workspace_idx on public.sync_runs (workspace_id, created_at desc);
create index sync_runs_connection_idx on public.sync_runs (workspace_id, connection_id);
create index sync_runs_account_idx on public.sync_runs (workspace_id, ad_account_id);

-- ---- gatilhos ------------------------------------------------------------------------

create trigger connections_touch before update on public.connections for each row execute function private.touch_updated_at();
create trigger connection_secrets_touch before update on public.connection_secrets for each row execute function private.touch_updated_at();
create trigger ad_accounts_touch before update on public.ad_accounts for each row execute function private.touch_updated_at();

-- Ao desconectar, as contas saem do ar (o histórico de dados fica).
create function private.disable_accounts_of_connection()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.ad_accounts set is_enabled = false, enabled_at = null where connection_id = old.id and is_enabled;
  return old;
end;
$$;
create trigger connections_disable_accounts
  before delete on public.connections
  for each row execute function private.disable_accounts_of_connection();

-- Apaga do Vault os tokens da conexão removida.
create function private.delete_connection_vault_secrets()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from vault.secrets where id in (old.access_token_secret_id, old.refresh_token_secret_id);
  return old;
end;
$$;
create trigger connection_secrets_delete_vault
  after delete on public.connection_secrets
  for each row execute function private.delete_connection_vault_secrets();

-- ---- RLS --------------------------------------------------------------------------------

alter table public.connections enable row level security;
alter table public.connection_secrets enable row level security; -- sem políticas: só service_role
alter table public.oauth_states enable row level security;       -- sem políticas: só service_role
alter table public.ad_accounts enable row level security;
alter table public.sync_runs enable row level security;

create policy "connections: membros leem" on public.connections
  for select to authenticated using (workspace_id in (select private.workspace_ids()));
grant select on public.connections to authenticated;

create policy "ad_accounts: membros leem" on public.ad_accounts
  for select to authenticated using (workspace_id in (select private.workspace_ids()));
-- Cadastro manual (sem conexão) feito por admin.
create policy "ad_accounts: admin cadastra a mao" on public.ad_accounts
  for insert to authenticated
  with check (
    workspace_id in (select private.workspace_ids('admin'))
    and connection_id is null and status = 'pending' and not is_enabled
  );
create policy "ad_accounts: admin ativa e edita" on public.ad_accounts
  for update to authenticated
  using (workspace_id in (select private.workspace_ids('admin')))
  with check (workspace_id in (select private.workspace_ids('admin')));
create policy "ad_accounts: admin remove" on public.ad_accounts
  for delete to authenticated using (workspace_id in (select private.workspace_ids('admin')));
grant select, delete on public.ad_accounts to authenticated;
grant insert (workspace_id, platform_id, external_id, name, business_external_id, manager_external_id, status, metadata) on public.ad_accounts to authenticated;
grant update (name, is_enabled, enabled_at) on public.ad_accounts to authenticated;

create policy "sync_runs: membros leem" on public.sync_runs
  for select to authenticated using (workspace_id in (select private.workspace_ids()));
grant select on public.sync_runs to authenticated;

-- ---- funções (servidor) -----------------------------------------------------------------

-- Cria ou atualiza a conexão, guarda os tokens no Vault e registra as contas
-- descobertas (sem ativá-las). Atômico. Só service_role.
-- p_accounts: [{platform_id, external_id, name, currency?, timezone?, status?,
--               business_external_id?, business_name?, manager_external_id?, metadata?}]
create function public.integration_connect(
  p_workspace_id uuid,
  p_provider public.integration_provider,
  p_external_user_id text,
  p_external_user_name text,
  p_external_user_email text,
  p_scopes text[],
  p_is_mock boolean,
  p_connected_by uuid,
  p_access_token text,
  p_refresh_token text,
  p_token_expires_at timestamptz,
  p_accounts jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conn uuid;
  v_secret public.connection_secrets%rowtype;
  v_access uuid;
  v_refresh uuid;
begin
  if p_access_token is null or p_access_token = '' then
    raise exception using errcode = 'P0001', message = 'integration:missing_token';
  end if;
  if jsonb_typeof(coalesce(p_accounts, '[]'::jsonb)) <> 'array' then
    raise exception using errcode = 'P0001', message = 'integration:invalid_accounts';
  end if;

  insert into public.connections (
    workspace_id, provider, status, external_user_id, external_user_name, external_user_email,
    scopes, is_mock, connected_by, connected_at, token_expires_at, last_error
  ) values (
    p_workspace_id, p_provider, 'active', p_external_user_id, p_external_user_name, p_external_user_email,
    coalesce(p_scopes, '{}'), p_is_mock, p_connected_by, now(), p_token_expires_at, null
  )
  on conflict (workspace_id, provider, external_user_id) do update set
    status = 'active',
    external_user_name = excluded.external_user_name,
    external_user_email = excluded.external_user_email,
    scopes = excluded.scopes,
    is_mock = excluded.is_mock,
    connected_by = excluded.connected_by,
    connected_at = now(),
    token_expires_at = excluded.token_expires_at,
    last_error = null
  returning id into v_conn;

  select * into v_secret from public.connection_secrets where connection_id = v_conn for update;
  if found then
    perform vault.update_secret(v_secret.access_token_secret_id, p_access_token);
    if p_refresh_token is not null then
      if v_secret.refresh_token_secret_id is null then
        v_refresh := vault.create_secret(p_refresh_token, 'vyz:connection:' || v_conn || ':refresh', 'Refresh token OAuth');
        update public.connection_secrets set refresh_token_secret_id = v_refresh where connection_id = v_conn;
      else
        perform vault.update_secret(v_secret.refresh_token_secret_id, p_refresh_token);
      end if;
    end if;
    update public.connection_secrets set updated_at = now() where connection_id = v_conn;
  else
    v_access := vault.create_secret(p_access_token, 'vyz:connection:' || v_conn || ':access', 'Access token OAuth');
    if p_refresh_token is not null then
      v_refresh := vault.create_secret(p_refresh_token, 'vyz:connection:' || v_conn || ':refresh', 'Refresh token OAuth');
    end if;
    insert into public.connection_secrets (connection_id, access_token_secret_id, refresh_token_secret_id)
    values (v_conn, v_access, v_refresh);
  end if;

  -- Conta que deixou de estar ativa no provedor sai do ar no VYZ.
  insert into public.ad_accounts as t (
    workspace_id, connection_id, platform_id, external_id, name, currency, timezone,
    business_external_id, business_name, manager_external_id, status, metadata
  )
  select
    p_workspace_id, v_conn, a ->> 'platform_id', a ->> 'external_id', left(a ->> 'name', 200),
    coalesce(a ->> 'currency', 'BRL'), coalesce(a ->> 'timezone', 'America/Sao_Paulo'),
    a ->> 'business_external_id', a ->> 'business_name', a ->> 'manager_external_id',
    coalesce(a ->> 'status', 'active'), coalesce(a -> 'metadata', '{}'::jsonb)
  from jsonb_array_elements(coalesce(p_accounts, '[]'::jsonb)) a
  on conflict (workspace_id, platform_id, external_id) do update set
    connection_id = excluded.connection_id,
    name = excluded.name,
    currency = excluded.currency,
    timezone = excluded.timezone,
    business_external_id = excluded.business_external_id,
    business_name = excluded.business_name,
    manager_external_id = excluded.manager_external_id,
    status = excluded.status,
    metadata = excluded.metadata,
    is_enabled = t.is_enabled and excluded.status = 'active',
    enabled_at = case when t.is_enabled and excluded.status = 'active' then t.enabled_at end;

  return v_conn;
end;
$$;
comment on function public.integration_connect(uuid, public.integration_provider, text, text, text, text[], boolean, uuid, text, text, timestamptz, jsonb) is 'Conecta (ou reconecta) uma conta OAuth. Só service_role.';
revoke all on function public.integration_connect(uuid, public.integration_provider, text, text, text, text[], boolean, uuid, text, text, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.integration_connect(uuid, public.integration_provider, text, text, text, text[], boolean, uuid, text, text, timestamptz, jsonb) to service_role;

-- Atualiza só os tokens (renovação com refresh token). Só service_role.
create function public.connection_tokens_save(
  p_connection_id uuid,
  p_access_token text,
  p_refresh_token text,
  p_token_expires_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret public.connection_secrets%rowtype;
  v_refresh uuid;
begin
  select * into v_secret from public.connection_secrets where connection_id = p_connection_id for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'integration:not_found';
  end if;
  perform vault.update_secret(v_secret.access_token_secret_id, p_access_token);
  if p_refresh_token is not null then
    if v_secret.refresh_token_secret_id is null then
      v_refresh := vault.create_secret(p_refresh_token, 'vyz:connection:' || p_connection_id || ':refresh', 'Refresh token OAuth');
      update public.connection_secrets set refresh_token_secret_id = v_refresh where connection_id = p_connection_id;
    else
      perform vault.update_secret(v_secret.refresh_token_secret_id, p_refresh_token);
    end if;
  end if;
  update public.connection_secrets set updated_at = now() where connection_id = p_connection_id;
  update public.connections set token_expires_at = p_token_expires_at, status = 'active', last_error = null where id = p_connection_id;
end;
$$;
revoke all on function public.connection_tokens_save(uuid, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.connection_tokens_save(uuid, text, text, timestamptz) to service_role;

-- Lê os tokens decifrados. Só service_role.
create function public.connection_tokens_read(p_connection_id uuid)
returns table (access_token text, refresh_token text, token_expires_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select a.decrypted_secret, r.decrypted_secret, c.token_expires_at
  from public.connection_secrets s
  join public.connections c on c.id = s.connection_id
  left join vault.decrypted_secrets a on a.id = s.access_token_secret_id
  left join vault.decrypted_secrets r on r.id = s.refresh_token_secret_id
  where s.connection_id = p_connection_id;
$$;
revoke all on function public.connection_tokens_read(uuid) from public, anon, authenticated;
grant execute on function public.connection_tokens_read(uuid) to service_role;

-- Define quais contas ficam ativas num conjunto de uma plataforma: desliga as
-- que saíram e liga as escolhidas (nessa ordem, para o limite do plano valer
-- sobre o resultado final). Roda com o RLS de quem chama (admin).
create function public.set_enabled_ad_accounts(
  p_workspace_id uuid,
  p_platform_id text,
  p_ad_account_ids uuid[]
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.ad_accounts
    set is_enabled = false, enabled_at = null
    where workspace_id = p_workspace_id and platform_id = p_platform_id and is_enabled
      and not (id = any (coalesce(p_ad_account_ids, '{}')));

  update public.ad_accounts
    set is_enabled = true, enabled_at = now()
    where workspace_id = p_workspace_id and platform_id = p_platform_id and not is_enabled
      and id = any (coalesce(p_ad_account_ids, '{}'));

  select count(*) into v_count
  from public.ad_accounts
  where workspace_id = p_workspace_id and platform_id = p_platform_id and is_enabled;
  return v_count;
end;
$$;
revoke all on function public.set_enabled_ad_accounts(uuid, text, uuid[]) from public, anon;
grant execute on function public.set_enabled_ad_accounts(uuid, text, uuid[]) to authenticated, service_role;
