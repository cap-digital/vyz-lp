-- =============================================================================
-- VYZ · 15 · Planos nas lojas e usuários por plano
--   billing_provider     + app_store, play_store (assinatura comprada no app via RevenueCat)
--   max_members          usuários por plano (Base 1, Pro 2, Avançado 5); membros + convites pendentes
--   store_customers      workspace que recebe a assinatura comprada na loja por cada usuário
--   sync_store_subscription  espelha a assinatura da loja em subscriptions (mesma regra do site)
-- =============================================================================

alter type public.billing_provider add value if not exists 'app_store';
alter type public.billing_provider add value if not exists 'play_store';

-- ---- usuários por plano -------------------------------------------------------------------

alter table public.plan_entitlements add column max_members integer not null default 1 check (max_members >= 1);
comment on column public.plan_entitlements.max_members is 'Pessoas com acesso ao workspace (membros + convites pendentes).';

create or replace view public.workspace_access
with (security_invoker = true)
as
select
  w.id as workspace_id,
  s.id as subscription_id,
  s.plan_id,
  s.status as subscription_status,
  s.interval,
  coalesce(s.accounts_quantity, 0)::integer as accounts_quantity,
  s.current_period_end,
  coalesce(s.cancel_at_period_end, false) as cancel_at_period_end,
  coalesce(s.status in ('active', 'trialing', 'past_due'), false) as has_access,
  e.dashboard_templates,
  e.landing_templates,
  e.platforms,
  e.pages_plan_id,
  e.white_label,
  e.audio,
  e.custom_dashboards,
  e.agent_chat,
  e.agent_voice,
  e.max_dashboards,
  e.max_landing_pages,
  (w.hide_vyz_brand and coalesce(e.white_label, false) and coalesce(s.status in ('active', 'trialing', 'past_due'), false)) as hide_vyz_brand_effective,
  coalesce(e.max_members, 1) as max_members,
  s.provider
from public.workspaces w
left join lateral (
  select sub.*
  from public.subscriptions sub
  where sub.workspace_id = w.id and sub.status not in ('canceled', 'incomplete_expired')
  order by sub.created_at desc
  limit 1
) s on true
left join public.plan_entitlements e on e.plan_id = s.plan_id;
grant select on public.workspace_access to authenticated;

-- Limite de usuários do workspace (sem plano ativo: 1, o dono).
create function private.workspace_member_limit(p_workspace_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select e.max_members
    from private.workspace_plan(p_workspace_id) p
    join public.plan_entitlements e on e.plan_id = p.plan_id
    where p.has_access
  ), 1);
$$;
revoke all on function private.workspace_member_limit(uuid) from public;

create function private.guard_member_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit integer := private.workspace_member_limit(new.workspace_id);
  v_used integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('members:' || new.workspace_id::text, 0));
  select count(*) into v_used from public.workspace_members m where m.workspace_id = new.workspace_id;
  if tg_table_name = 'workspace_invitations' then
    -- o convite reserva a vaga
    v_used := v_used + (
      select count(*) from public.workspace_invitations i
      where i.workspace_id = new.workspace_id and i.accepted_at is null and i.revoked_at is null and i.expires_at > now()
    );
  else
    -- quem aceita um convite já tinha a vaga reservada
    v_used := v_used - (
      select count(*) from public.workspace_invitations i
      join public.profiles p on lower(p.email) = lower(i.email)
      where i.workspace_id = new.workspace_id and p.id = new.user_id
        and i.accepted_at is null and i.revoked_at is null and i.expires_at > now()
    );
  end if;
  if v_used >= v_limit then
    raise exception using errcode = 'P0001', message = 'limit:members',
      hint = format('Seu plano permite até %s %s (convites pendentes contam). Remova alguém, cancele um convite ou troque de plano.', v_limit, case when v_limit = 1 then 'usuário' else 'usuários' end);
  end if;
  return new;
end;
$$;

create trigger guard_member_limit before insert on public.workspace_members
  for each row execute function private.guard_member_limit();
create trigger guard_member_limit before insert on public.workspace_invitations
  for each row execute function private.guard_member_limit();

-- ---- assinatura comprada na loja ------------------------------------------------------------

create table public.store_customers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  updated_at timestamptz not null default now()
);
comment on table public.store_customers is 'Workspace que recebe a assinatura da loja do usuário (escolhido no app antes da compra). Só service_role.';
create index store_customers_workspace_idx on public.store_customers (workspace_id);
alter table public.store_customers enable row level security; -- sem políticas: só service_role

-- Espelha o estado da assinatura na loja (lido do RevenueCat) em subscriptions.
-- Idempotente: a mesma chamada com o mesmo estado não muda nada.
-- Uma assinatura de loja por usuário (provider_subscription_id = 'rc:<user_id>').
create function public.sync_store_subscription(
  p_user_id uuid,
  p_store text,
  p_plan_id text,
  p_interval public.billing_interval,
  p_accounts integer,
  p_status public.subscription_status,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_cancel_at_period_end boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key text := 'rc:' || p_user_id::text;
  v_ws uuid;
  v_sub uuid;
  v_ended boolean := p_status in ('canceled', 'incomplete_expired');
  v_was_ended boolean;
begin
  if p_store not in ('app_store', 'play_store') then
    raise exception using errcode = 'P0001', message = 'store:invalid';
  end if;

  select id, status in ('canceled', 'incomplete_expired') into v_sub, v_was_ended
  from public.subscriptions where provider_subscription_id = v_key for update;
  -- assinatura encerrada e nova compra na loja: a antiga fica no histórico
  -- (chave arquivada) e a nova nasce no workspace escolhido agora
  if found and v_was_ended and not v_ended then
    update public.subscriptions set provider_subscription_id = v_key || ':' || v_sub::text where id = v_sub;
  elsif found then
    update public.subscriptions set
      plan_id = p_plan_id,
      interval = p_interval,
      accounts_quantity = p_accounts,
      status = p_status,
      provider = p_store::public.billing_provider,
      current_period_start = p_period_start,
      current_period_end = p_period_end,
      cancel_at_period_end = p_cancel_at_period_end,
      canceled_at = case when v_ended then coalesce(canceled_at, now()) else null end,
      ended_at = case when v_ended then coalesce(ended_at, now()) else null end
    where id = v_sub
      and (plan_id, interval, accounts_quantity, status, current_period_start, current_period_end, cancel_at_period_end)
        is distinct from (p_plan_id, p_interval, p_accounts::smallint, p_status, p_period_start, p_period_end, p_cancel_at_period_end);
    return v_sub;
  end if;

  if v_ended then
    return null;
  end if;

  select c.workspace_id into v_ws
  from public.store_customers c
  join public.workspace_members m on m.workspace_id = c.workspace_id and m.user_id = c.user_id and m.role = 'owner'
  where c.user_id = p_user_id;
  if v_ws is null then
    raise exception using errcode = 'P0001', message = 'store:no_workspace';
  end if;
  if exists (select 1 from public.subscriptions s where s.workspace_id = v_ws and s.status not in ('canceled', 'incomplete_expired')) then
    raise exception using errcode = 'P0001', message = 'store:workspace_has_plan';
  end if;

  insert into public.subscriptions (
    workspace_id, plan_id, status, interval, accounts_quantity, provider, provider_subscription_id,
    current_period_start, current_period_end, cancel_at_period_end
  ) values (
    v_ws, p_plan_id, p_status, p_interval, p_accounts, p_store::public.billing_provider, v_key,
    p_period_start, p_period_end, p_cancel_at_period_end
  )
  returning id into v_sub;
  return v_sub;
end;
$$;
revoke all on function public.sync_store_subscription(uuid, text, text, public.billing_interval, integer, public.subscription_status, timestamptz, timestamptz, boolean) from public, anon, authenticated;
grant execute on function public.sync_store_subscription(uuid, text, text, public.billing_interval, integer, public.subscription_status, timestamptz, timestamptz, boolean) to service_role;

create trigger audit after insert or update or delete on public.store_customers for each row execute function private.audit_row_change('workspace_id', 'user_id');
