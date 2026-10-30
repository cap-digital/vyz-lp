-- =============================================================================
-- VYZ · 10 · Histórico
--   audit_events          toda mudança de dado (gatilho): quem, quando, antes e depois
--   subscription_changes  linha do tempo da assinatura (plano, contas, status)
--   auth_events           acessos: cadastro, login, falhas, senha
--   activity_events       uso do produto: dashboard aberto, exportado, link visto...
--   legal_acceptances     aceite de termos e privacidade (LGPD)
--
-- Desempenho: os três logs de volume alto são particionados por mês
-- (partições em private, fora da API), sem FKs (inserção barata; o histórico
-- sobrevive à exclusão da entidade) e com BRIN em created_at. O banco cria as
-- partições com 3 meses de folga e apaga as vencidas (ver 11_housekeeping).
-- Escrita: gatilhos e servidor (service_role). Ninguém edita histórico.
-- =============================================================================

-- ---- partições mensais ---------------------------------------------------------------

-- Cria as partições do mês anterior até p_months_ahead meses à frente.
create function private.ensure_monthly_partitions(p_parent regclass, p_months_ahead integer default 3)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_parent text := (select c.relname from pg_catalog.pg_class c where c.oid = p_parent);
  v_from date;
  v_to date;
  v_name text;
begin
  for i in -1..p_months_ahead loop
    v_from := (date_trunc('month', now()) + make_interval(months => i))::date;
    v_to := (v_from + interval '1 month')::date;
    v_name := v_parent || '_' || to_char(v_from, 'YYYY_MM');
    if to_regclass('private.' || quote_ident(v_name)) is null then
      execute format('create table private.%I partition of %s for values from (%L) to (%L)', v_name, p_parent, v_from, v_to);
    end if;
  end loop;
end;
$$;

-- Apaga partições inteiras mais velhas que p_keep_months (rápido, sem DELETE).
create function private.drop_old_partitions(p_parent regclass, p_keep_months integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_parent text := (select c.relname from pg_catalog.pg_class c where c.oid = p_parent);
  v_cutoff text := v_parent || '_' || to_char(date_trunc('month', now()) - make_interval(months => p_keep_months), 'YYYY_MM');
  v_dropped integer := 0;
  r record;
begin
  for r in
    select c.relname
    from pg_catalog.pg_inherits i
    join pg_catalog.pg_class c on c.oid = i.inhrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where i.inhparent = p_parent and n.nspname = 'private'
      and c.relname ~ ('^' || v_parent || '_[0-9]{4}_[0-9]{2}$')
      and c.relname < v_cutoff
  loop
    execute format('drop table private.%I', r.relname);
    v_dropped := v_dropped + 1;
  end loop;
  return v_dropped;
end;
$$;

-- ---- utilitários de contexto ------------------------------------------------------------

create function private.safe_inet(p_value text)
returns inet
language plpgsql
immutable
set search_path = ''
as $$
begin
  return nullif(btrim(split_part(coalesce(p_value, ''), ',', 1)), '')::inet;
exception when others then
  return null;
end;
$$;

create function private.safe_uuid(p_value text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return nullif(btrim(coalesce(p_value, '')), '')::uuid;
exception when others then
  return null;
end;
$$;

-- Cabeçalhos da requisição (PostgREST). O servidor do VYZ envia x-vyz-ip,
-- x-vyz-user-agent e, ao agir em nome de alguém com a chave de serviço,
-- x-vyz-actor-id.
create function private.request_header(p_name text)
returns text
language sql
stable
set search_path = ''
as $$
  select nullif(current_setting('request.headers', true), '')::jsonb ->> p_name;
$$;

-- Quem fez: o usuário do JWT ou, nas chamadas do servidor, o x-vyz-actor-id.
create function private.current_actor_id()
returns uuid
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select auth.uid()),
    case when (select auth.role()) = 'service_role' then private.safe_uuid(private.request_header('x-vyz-actor-id')) end
  );
$$;

-- ---- auditoria ---------------------------------------------------------------------------

create table public.audit_events (
  id bigint generated always as identity,
  created_at timestamptz not null default now(),
  workspace_id uuid,
  actor_id uuid,
  actor_role text not null,
  action text not null check (action in ('insert', 'update', 'delete')),
  table_name text not null,
  record_id text not null,
  changed_columns text[],
  old_data jsonb,
  new_data jsonb,
  ip inet,
  user_agent text,
  primary key (id, created_at)
) partition by range (created_at);
comment on table public.audit_events is 'Toda mudança de dado (gatilho private.audit_row_change): quem, quando, o que mudou (antes e depois). Particionada por mês.';
comment on column public.audit_events.actor_role is 'authenticated, service_role ou o papel da sessão no banco (supabase_auth_admin, postgres...).';
create index audit_events_workspace_idx on public.audit_events (workspace_id, created_at desc);
create index audit_events_record_idx on public.audit_events (table_name, record_id);
create index audit_events_actor_idx on public.audit_events (actor_id, created_at desc);
create index audit_events_created_brin on public.audit_events using brin (created_at);
create table private.audit_events_default partition of public.audit_events default;
select private.ensure_monthly_partitions('public.audit_events'::regclass, 3);

-- Argumentos do gatilho: [0] coluna do workspace ('-' = nenhuma),
-- [1] colunas da chave separadas por vírgula, [2] colunas cujo valor não é
-- copiado (só registra que mudou; ex.: conteúdo grande de LP).
create function private.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ws_col text := coalesce(tg_argv[0], 'workspace_id');
  v_pk_cols text[] := string_to_array(coalesce(tg_argv[1], 'id'), ',');
  v_masked text[] := coalesce(string_to_array(nullif(tg_argv[2], ''), ','), '{}');
  v_row jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  v_changed text[];
  k text;
begin
  if tg_op = 'UPDATE' then
    select array_agg(key order by key) into v_changed
    from jsonb_object_keys(v_new) as key
    where v_new -> key is distinct from v_old -> key and key <> 'updated_at';
    if v_changed is null then
      return null;
    end if;
    v_old := (select jsonb_object_agg(key, v_old -> key) from unnest(v_changed) as key);
    v_new := (select jsonb_object_agg(key, v_new -> key) from unnest(v_changed) as key);
  end if;

  -- nunca copia segredos; colunas mascaradas só registram que mudaram
  v_old := v_old - array['token_hash', 'state_hash', 'code_verifier'];
  v_new := v_new - array['token_hash', 'state_hash', 'code_verifier'];
  foreach k in array v_masked loop
    if v_old ? k then v_old := jsonb_set(v_old, array[k], '"[alterado]"'); end if;
    if v_new ? k then v_new := jsonb_set(v_new, array[k], '"[alterado]"'); end if;
  end loop;

  insert into public.audit_events (
    workspace_id, actor_id, actor_role, action, table_name, record_id,
    changed_columns, old_data, new_data, ip, user_agent
  ) values (
    case when v_ws_col = '-' then null else private.safe_uuid(v_row ->> v_ws_col) end,
    private.current_actor_id(),
    coalesce((select auth.role()), session_user),
    lower(tg_op),
    tg_table_name,
    array_to_string(array(select v_row ->> c from unnest(v_pk_cols) as c), ':'),
    v_changed,
    v_old,
    v_new,
    private.safe_inet(coalesce(private.request_header('x-vyz-ip'), private.request_header('x-forwarded-for'))),
    left(coalesce(private.request_header('x-vyz-user-agent'), private.request_header('user-agent')), 400)
  );
  return null;
end;
$$;

-- quem audita o quê
create trigger audit after insert or update or delete on public.profiles for each row execute function private.audit_row_change('-', 'id');
create trigger audit after insert or update or delete on public.workspaces for each row execute function private.audit_row_change('id', 'id');
create trigger audit after insert or update or delete on public.workspace_members for each row execute function private.audit_row_change('workspace_id', 'workspace_id,user_id');
create trigger audit after insert or update or delete on public.workspace_invitations for each row execute function private.audit_row_change('workspace_id', 'id');
create trigger audit after insert or update or delete on public.workspace_platforms for each row execute function private.audit_row_change('workspace_id', 'workspace_id,platform_id');
create trigger audit after insert or update or delete on public.billing_customers for each row execute function private.audit_row_change('workspace_id', 'workspace_id');
create trigger audit after insert or update or delete on public.checkout_sessions for each row execute function private.audit_row_change('workspace_id', 'id', 'selection,quote');
create trigger audit after insert or update or delete on public.subscriptions for each row execute function private.audit_row_change('workspace_id', 'id');
create trigger audit after insert or update or delete on public.subscription_items for each row execute function private.audit_row_change('workspace_id', 'id');
create trigger audit after insert or update or delete on public.invoices for each row execute function private.audit_row_change('workspace_id', 'id', 'lines');
create trigger audit after insert or update or delete on public.payment_transactions for each row execute function private.audit_row_change('workspace_id', 'id');
create trigger audit after insert or update or delete on public.service_orders for each row execute function private.audit_row_change('workspace_id', 'id');
create trigger audit after insert or update or delete on public.connections for each row execute function private.audit_row_change('workspace_id', 'id');
create trigger audit after insert or update or delete on public.ad_accounts for each row execute function private.audit_row_change('workspace_id', 'id', 'metadata');
create trigger audit after insert or update or delete on public.dashboards for each row execute function private.audit_row_change('workspace_id', 'id');
create trigger audit after insert or update or delete on public.dashboard_pages for each row execute function private.audit_row_change('workspace_id', 'dashboard_id,page_type_id');
create trigger audit after insert or update or delete on public.dashboard_sources for each row execute function private.audit_row_change('workspace_id', 'dashboard_id,ad_account_id');
create trigger audit after insert or update or delete on public.share_links for each row execute function private.audit_row_change('workspace_id', 'id');
create trigger audit after insert or update or delete on public.scheduled_reports for each row execute function private.audit_row_change('workspace_id', 'id');
create trigger audit after insert or update or delete on public.scheduled_report_recipients for each row execute function private.audit_row_change('workspace_id', 'id');
create trigger audit after insert or update or delete on public.landing_pages for each row execute function private.audit_row_change('workspace_id', 'id', 'content');
-- catálogo: histórico de preços e limites
create trigger audit after insert or update or delete on public.plans for each row execute function private.audit_row_change('-', 'id');
create trigger audit after insert or update or delete on public.plan_entitlements for each row execute function private.audit_row_change('-', 'plan_id');
create trigger audit after insert or update or delete on public.plan_prices for each row execute function private.audit_row_change('-', 'id');
create trigger audit after insert or update or delete on public.billing_items for each row execute function private.audit_row_change('-', 'id');
create trigger audit after insert or update or delete on public.platforms for each row execute function private.audit_row_change('-', 'id');
create trigger audit after insert or update or delete on public.dashboard_templates for each row execute function private.audit_row_change('-', 'id');
create trigger audit after insert or update or delete on public.landing_templates for each row execute function private.audit_row_change('-', 'id');

-- ---- linha do tempo da assinatura -----------------------------------------------------------

create table public.subscription_changes (
  id bigint generated always as identity primary key,
  workspace_id uuid not null,
  subscription_id uuid not null,
  change text not null check (change in ('created', 'plan_changed', 'quantity_changed', 'interval_changed', 'status_changed', 'cancel_scheduled', 'cancel_reverted', 'renewed')),
  from_value text,
  to_value text,
  actor_id uuid,
  created_at timestamptz not null default now()
);
comment on table public.subscription_changes is 'Linha do tempo da assinatura (gatilho): criação, troca de plano, de contas, de período, de status, cancelamento e renovação.';
create index subscription_changes_workspace_idx on public.subscription_changes (workspace_id, created_at desc);
create index subscription_changes_subscription_idx on public.subscription_changes (subscription_id, created_at desc);

create function private.track_subscription_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := private.current_actor_id();
begin
  if tg_op = 'INSERT' then
    insert into public.subscription_changes (workspace_id, subscription_id, change, to_value, actor_id)
    values (new.workspace_id, new.id, 'created', new.plan_id || ' · ' || new.interval || ' · ' || new.accounts_quantity || ' conta(s)', v_actor);
    return null;
  end if;

  if new.plan_id is distinct from old.plan_id then
    insert into public.subscription_changes (workspace_id, subscription_id, change, from_value, to_value, actor_id)
    values (new.workspace_id, new.id, 'plan_changed', old.plan_id, new.plan_id, v_actor);
  end if;
  if new.accounts_quantity is distinct from old.accounts_quantity then
    insert into public.subscription_changes (workspace_id, subscription_id, change, from_value, to_value, actor_id)
    values (new.workspace_id, new.id, 'quantity_changed', old.accounts_quantity::text, new.accounts_quantity::text, v_actor);
  end if;
  if new.interval is distinct from old.interval then
    insert into public.subscription_changes (workspace_id, subscription_id, change, from_value, to_value, actor_id)
    values (new.workspace_id, new.id, 'interval_changed', old.interval::text, new.interval::text, v_actor);
  end if;
  if new.status is distinct from old.status then
    insert into public.subscription_changes (workspace_id, subscription_id, change, from_value, to_value, actor_id)
    values (new.workspace_id, new.id, 'status_changed', old.status::text, new.status::text, v_actor);
  end if;
  if new.cancel_at_period_end and not old.cancel_at_period_end then
    insert into public.subscription_changes (workspace_id, subscription_id, change, to_value, actor_id)
    values (new.workspace_id, new.id, 'cancel_scheduled', new.current_period_end::text, v_actor);
  elsif old.cancel_at_period_end and not new.cancel_at_period_end then
    insert into public.subscription_changes (workspace_id, subscription_id, change, actor_id)
    values (new.workspace_id, new.id, 'cancel_reverted', v_actor);
  end if;
  if new.current_period_end > old.current_period_end and new.status = 'active' then
    insert into public.subscription_changes (workspace_id, subscription_id, change, from_value, to_value, actor_id)
    values (new.workspace_id, new.id, 'renewed', old.current_period_end::text, new.current_period_end::text, v_actor);
  end if;
  return null;
end;
$$;
create trigger subscriptions_track_changes
  after insert or update on public.subscriptions
  for each row execute function private.track_subscription_change();

-- ---- acessos --------------------------------------------------------------------------------

create table public.auth_events (
  id bigint generated always as identity,
  created_at timestamptz not null default now(),
  user_id uuid,
  email text,
  event text not null check (event in (
    'signup', 'sign_in', 'sign_in_failed', 'sign_out', 'oauth_sign_in',
    'password_reset_requested', 'password_updated', 'email_changed', 'rate_limited'
  )),
  method text check (method in ('password', 'google', 'magic_link', 'admin', 'checkout')),
  ip inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  primary key (id, created_at)
) partition by range (created_at);
comment on table public.auth_events is 'Histórico de acesso: cadastro, login (e falhas), saída e senha, com IP e navegador. Gravado pelo servidor. Particionada por mês.';
create index auth_events_user_idx on public.auth_events (user_id, created_at desc);
create index auth_events_email_idx on public.auth_events (lower(email), created_at desc);
create index auth_events_created_brin on public.auth_events using brin (created_at);
create table private.auth_events_default partition of public.auth_events default;
select private.ensure_monthly_partitions('public.auth_events'::regclass, 3);

-- ---- atividade no produto ------------------------------------------------------------------------

create table public.activity_events (
  id bigint generated always as identity,
  created_at timestamptz not null default now(),
  workspace_id uuid not null,
  actor_id uuid,
  event text not null check (event ~ '^[a-z_]+\.[a-z_]+$'),
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  ip inet,
  user_agent text,
  primary key (id, created_at)
) partition by range (created_at);
comment on table public.activity_events is 'Uso do produto (dashboard.viewed, dashboard.exported, share_link.viewed, report.sent, sync.finished...). Particionada por mês.';
create index activity_events_workspace_idx on public.activity_events (workspace_id, created_at desc);
create index activity_events_entity_idx on public.activity_events (entity_id, created_at desc);
create index activity_events_created_brin on public.activity_events using brin (created_at);
create table private.activity_events_default partition of public.activity_events default;
select private.ensure_monthly_partitions('public.activity_events'::regclass, 3);

-- ---- aceites legais (LGPD) ---------------------------------------------------------------------------

create table public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  email text not null,
  document text not null check (document in ('terms', 'privacy', 'dpa', 'marketing')),
  document_version text not null,
  accepted boolean not null default true,
  checkout_session_id uuid,
  ip inet,
  user_agent text,
  created_at timestamptz not null default now()
);
comment on table public.legal_acceptances is 'Aceite (ou recusa) de termos de uso, privacidade e comunicações, com versão, data, IP e navegador. Prova para a LGPD.';
create index legal_acceptances_user_idx on public.legal_acceptances (user_id, created_at desc);
create index legal_acceptances_checkout_idx on public.legal_acceptances (checkout_session_id);

-- ---- RLS ------------------------------------------------------------------------------------------------

alter table public.audit_events enable row level security;
alter table public.subscription_changes enable row level security;
alter table public.auth_events enable row level security;
alter table public.activity_events enable row level security;
alter table public.legal_acceptances enable row level security;

-- auditoria: admin vê a do workspace; cada um vê as próprias mudanças de perfil
create policy "audit_events: admin le o workspace" on public.audit_events
  for select to authenticated
  using (
    workspace_id in (select private.workspace_ids('admin'))
    or (workspace_id is null and table_name = 'profiles' and record_id = (select auth.uid())::text)
  );
create policy "subscription_changes: admin le" on public.subscription_changes
  for select to authenticated using (workspace_id in (select private.workspace_ids('admin')));
create policy "auth_events: o proprio usuario le" on public.auth_events
  for select to authenticated using (user_id = (select auth.uid()));
create policy "activity_events: membros leem" on public.activity_events
  for select to authenticated using (workspace_id in (select private.workspace_ids()));
create policy "legal_acceptances: o proprio usuario le" on public.legal_acceptances
  for select to authenticated using (user_id = (select auth.uid()));

grant select on public.audit_events, public.subscription_changes, public.auth_events, public.activity_events, public.legal_acceptances to authenticated;

grant execute on function private.current_actor_id() to authenticated, service_role;
grant execute on function private.request_header(text) to authenticated, service_role;
grant execute on function private.safe_uuid(text) to authenticated, service_role;
grant execute on function private.safe_inet(text) to authenticated, service_role;
