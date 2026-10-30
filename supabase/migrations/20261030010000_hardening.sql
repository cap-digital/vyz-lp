-- =============================================================================
-- VYZ · 12 · Endurecimento (revisão adversarial do banco)
-- Correções da revisão de segurança, integridade e desempenho, todas testadas
-- em transações desfeitas antes de entrar aqui:
--   A. privilégios: funções sem EXECUTE para PUBLIC; histórico só cresce
--   B. políticas e colunas: páginas de dashboard, links revogados, IP na atividade
--   C. equipe: convites com validade e dono obrigatório
--   D. regras do plano: filiação antes do plano; tirar do ar nunca exige plano
--   E. cobrança: pedido precisa fechar, sem cobrança dupla, cancelamento agendado
--   F. integrações: reconexão robusta, histórico de sincronização preservado
--   G. dashboards e LPs: páginas padrão pelo plano, slugs, datas do servidor
--   H. métricas: rollup com pesos certos, índices por conta e período
--   I. auditoria e manutenção: sem ruído, IP confiável marcado, partições em UTC
--   J. RLS indexável: "= any(array(...))" (uma vez por consulta, usa índice)
-- =============================================================================

-- ---- A. privilégios ------------------------------------------------------------------------

-- O default por schema não tira o EXECUTE implícito de PUBLIC; só o global tira.
-- (Vale também para funções de extensões instaladas depois: conceda EXECUTE explícito.)
alter default privileges for role postgres revoke execute on functions from public;
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated;

revoke execute on all functions in schema private from public;
grant execute on function
  private.workspace_ids(public.member_role),
  private.co_member_ids(),
  private.billable_unit(text, text, text),
  private.current_actor_id(),
  private.request_header(text),
  private.safe_uuid(text),
  private.safe_inet(text)
to authenticated, service_role;

-- Histórico só cresce: ninguém pela API altera ou apaga. audit_events e
-- subscription_changes são escritos só pelos gatilhos (security definer).
revoke insert, update, delete, truncate on public.audit_events, public.subscription_changes from service_role;
revoke update, delete, truncate on public.auth_events, public.activity_events, public.legal_acceptances, public.landing_page_versions from service_role;

-- ---- B. políticas e colunas -----------------------------------------------------------------

-- Páginas: só posição e config mudam por UPDATE; trocar página ou dashboard é
-- delete + insert (set_dashboard_pages), que passa pelas regras do plano.
revoke update on public.dashboard_pages from authenticated;
grant update (position, config) on public.dashboard_pages to authenticated;

-- Link revogado não volta: nem o autor nem o admin desfazem a revogação.
drop policy if exists "share_links: autor ou admin revoga" on public.share_links;
create policy "share_links: autor ou admin revoga" on public.share_links
  for update to authenticated
  using (
    revoked_at is null
    and (created_by = (select auth.uid()) or workspace_id in (select private.workspace_ids('admin')))
  )
  with check (workspace_id in (select private.workspace_ids('member')));

-- Atividade: membros leem os eventos sem IP e navegador (o servidor mostra a quem precisar).
revoke select on public.activity_events from authenticated;
grant select (id, created_at, workspace_id, actor_id, event, entity_type, entity_id, metadata) on public.activity_events to authenticated;

-- Caminhos do Storage sempre na pasta do próprio workspace, sem "..".
alter table public.workspaces drop constraint if exists workspaces_brand_logo_path_own_folder;
alter table public.workspaces add constraint workspaces_brand_logo_path_own_folder
  check (brand_logo_path is null or (brand_logo_path like id::text || '/%' and brand_logo_path !~ '(^|/)\.\.(/|$)')) not valid;
alter table public.workspaces validate constraint workspaces_brand_logo_path_own_folder;
alter table public.dashboards drop constraint if exists dashboards_brand_logo_path_own_folder;
alter table public.dashboards add constraint dashboards_brand_logo_path_own_folder
  check (brand_logo_path is null or (brand_logo_path like workspace_id::text || '/%' and brand_logo_path !~ '(^|/)\.\.(/|$)')) not valid;
alter table public.dashboards validate constraint dashboards_brand_logo_path_own_folder;
alter table public.dashboard_exports drop constraint if exists dashboard_exports_storage_path_own_folder;
alter table public.dashboard_exports add constraint dashboard_exports_storage_path_own_folder
  check (storage_path is null or (storage_path like workspace_id::text || '/%' and storage_path !~ '(^|/)\.\.(/|$)')) not valid;
alter table public.dashboard_exports validate constraint dashboard_exports_storage_path_own_folder;

-- ---- C. equipe ------------------------------------------------------------------------------

-- Convite vale no máximo 30 dias.
alter table public.workspace_invitations drop constraint if exists workspace_invitations_max_ttl;
alter table public.workspace_invitations
  add constraint workspace_invitations_max_ttl check (expires_at <= created_at + interval '30 days') not valid;
alter table public.workspace_invitations validate constraint workspace_invitations_max_ttl;

-- Aceitar exige que quem convidou ainda seja admin do workspace.
create or replace function public.accept_workspace_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv public.workspace_invitations%rowtype;
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception using errcode = 'P0001', message = 'auth:required';
  end if;

  select * into inv
  from public.workspace_invitations i
  where i.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
  for update;

  if not found or inv.revoked_at is not null or inv.accepted_at is not null or inv.expires_at < now() then
    raise exception using errcode = 'P0001', message = 'invitation:invalid';
  end if;
  if not exists (
    select 1 from public.workspace_members m
    where m.workspace_id = inv.workspace_id and m.user_id = inv.invited_by and m.role >= 'admin'
  ) then
    raise exception using errcode = 'P0001', message = 'invitation:invalid';
  end if;
  if lower(inv.email) <> lower(coalesce((select u.email from auth.users u where u.id = uid), '')) then
    raise exception using errcode = 'P0001', message = 'invitation:email_mismatch';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role, invited_by)
  values (inv.workspace_id, uid, inv.role, inv.invited_by)
  on conflict (workspace_id, user_id) do nothing;

  update public.workspace_invitations set accepted_at = now(), accepted_by = uid where id = inv.id;
  update public.profiles set default_workspace_id = coalesce(default_workspace_id, inv.workspace_id) where id = uid;
  return inv.workspace_id;
end;
$$;
revoke all on function public.accept_workspace_invitation(text) from public, anon;
grant execute on function public.accept_workspace_invitation(text) to authenticated;

-- Quem sai, é removido ou deixa de ser admin leva os convites pendentes que criou.
create or replace function private.revoke_invitations_of_removed_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' or new.role < 'admin' then
    update public.workspace_invitations
      set revoked_at = now()
      where workspace_id = old.workspace_id and invited_by = old.user_id
        and accepted_at is null and revoked_at is null;
  end if;
  return null;
end;
$$;
revoke all on function private.revoke_invitations_of_removed_member() from public;
drop trigger if exists workspace_members_revoke_invitations on public.workspace_members;
create trigger workspace_members_revoke_invitations
  after delete or update of role on public.workspace_members
  for each row execute function private.revoke_invitations_of_removed_member();

-- Saiu do workspace padrão: o padrão passa para outro workspace do usuário.
create or replace function private.reset_default_workspace()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles p
     set default_workspace_id = (
       select m.workspace_id from public.workspace_members m
       where m.user_id = old.user_id and m.workspace_id <> old.workspace_id
       order by m.created_at
       limit 1
     )
   where p.id = old.user_id and p.default_workspace_id = old.workspace_id;
  return null;
end;
$$;
revoke all on function private.reset_default_workspace() from public;
drop trigger if exists workspace_members_reset_default on public.workspace_members;
create trigger workspace_members_reset_default
  after delete on public.workspace_members
  for each row execute function private.reset_default_workspace();

-- Não apaga o usuário que é o último dono de um workspace com equipe ou assinatura viva.
create or replace function private.guard_owner_user_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.workspace_members m
    where m.user_id = old.id and m.role = 'owner'
      and not exists (
        select 1 from public.workspace_members o
        where o.workspace_id = m.workspace_id and o.role = 'owner' and o.user_id <> old.id
      )
      and (
        exists (select 1 from public.workspace_members x where x.workspace_id = m.workspace_id and x.user_id <> old.id)
        or exists (select 1 from public.subscriptions s where s.workspace_id = m.workspace_id and s.status in ('active', 'trialing', 'past_due'))
      )
  ) then
    raise exception using errcode = 'P0001', message = 'workspace:last_owner',
      hint = 'Transfira a propriedade (ou encerre a assinatura) antes de apagar a conta.';
  end if;
  return old;
end;
$$;
revoke all on function private.guard_owner_user_delete() from public;
drop trigger if exists on_auth_user_delete_guard_owner on auth.users;
create trigger on_auth_user_delete_guard_owner
  before delete on auth.users
  for each row execute function private.guard_owner_user_delete();

-- Dois checkouts com o mesmo nome ao mesmo tempo: o slug é escolhido em fila.
create or replace function private.unique_workspace_slug(base text)
returns text
language plpgsql
set search_path = ''
as $$
declare
  root text := private.slugify(base);
  candidate text := root;
  n integer := 1;
begin
  perform pg_advisory_xact_lock(hashtextextended('vyz:slug:' || root, 0));
  while exists (select 1 from public.workspaces w where w.slug = candidate) loop
    n := n + 1;
    candidate := rtrim(left(root, 40), '-') || '-' || n;
  end loop;
  return candidate;
end;
$$;

-- ---- D. regras do plano ---------------------------------------------------------------------

-- Confere a filiação ANTES de olhar plano e limites: quem é de fora recebe o
-- mesmo erro do RLS (não descobre o plano de outro workspace).
create or replace function private.assert_workspace_member(p_workspace_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.role()) = 'authenticated' and not exists (
    select 1 from public.workspace_members m
    where m.workspace_id = p_workspace_id and m.user_id = (select auth.uid())
  ) then
    raise exception using errcode = '42501', message = 'new row violates row-level security policy';
  end if;
end;
$$;
revoke all on function private.assert_workspace_member(uuid) from public;

create or replace function private.require_active_plan(p_workspace_id uuid, p_lock text default null)
returns public.plan_entitlements
language plpgsql
security definer
set search_path = ''
as $$
declare
  v record;
  e public.plan_entitlements%rowtype;
begin
  perform private.assert_workspace_member(p_workspace_id);
  if p_lock is not null then
    perform pg_advisory_xact_lock(hashtextextended('vyz:' || p_lock || ':' || p_workspace_id::text, 0));
  end if;
  select * into v from private.workspace_plan(p_workspace_id);
  if not found or not v.has_access then
    raise exception using errcode = 'P0001', message = 'plan:inactive', hint = 'A assinatura deste workspace não está ativa.';
  end if;
  select * into e from public.plan_entitlements pe where pe.plan_id = v.plan_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'plan:unknown';
  end if;
  return e;
end;
$$;

-- Dashboards: criar e pôr marca própria exigem plano; tirar marca nunca exige.
create or replace function private.enforce_dashboard_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  e public.plan_entitlements%rowtype;
  v_count integer;
  v_template_rank smallint;
begin
  if tg_op = 'UPDATE' and not (
       (new.hide_vyz_brand and not old.hide_vyz_brand)
    or (new.brand_color is not null and new.brand_color is distinct from old.brand_color)
    or (new.brand_logo_path is not null and new.brand_logo_path is distinct from old.brand_logo_path)
  ) then
    return new;
  end if;

  e := private.require_active_plan(new.workspace_id, 'dashboards');

  if tg_op = 'INSERT' then
    select count(*) into v_count from public.dashboards d where d.workspace_id = new.workspace_id;
    if v_count >= e.max_dashboards then
      raise exception using errcode = 'P0001', message = 'limit:dashboards',
        hint = format('Seu plano permite até %s dashboards.', e.max_dashboards);
    end if;

    select p.rank into v_template_rank
    from public.dashboard_templates t join public.plans p on p.id = t.min_plan_id
    where t.id = new.template_id and t.is_active;
    if v_template_rank is null then
      raise exception using errcode = 'P0001', message = 'dashboard:template_unavailable';
    end if;
    if v_template_rank > private.plan_rank(e.plan_id) then
      raise exception using errcode = 'P0001', message = 'plan:template', hint = 'Este template é de um plano acima do seu.';
    end if;
  end if;

  if (new.hide_vyz_brand or new.brand_color is not null or new.brand_logo_path is not null) and not e.white_label then
    raise exception using errcode = 'P0001', message = 'plan:white_label', hint = 'Marca própria é do plano Personalizado.';
  end if;
  return new;
end;
$$;

create or replace function private.enforce_dashboard_page_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  e public.plan_entitlements%rowtype;
  v_page public.dashboard_page_types%rowtype;
  v_template text;
begin
  e := private.require_active_plan(new.workspace_id);
  select * into v_page from public.dashboard_page_types pt where pt.id = new.page_type_id;
  select d.template_id into v_template from public.dashboards d where d.id = new.dashboard_id and d.workspace_id = new.workspace_id;
  if private.plan_rank(v_page.min_plan_id) > private.plan_rank(e.pages_plan_id) then
    raise exception using errcode = 'P0001', message = 'plan:page', hint = format('A página "%s" é de um plano acima do seu.', v_page.name);
  end if;
  if v_page.template_only and not exists (
    select 1 from public.dashboard_template_pages tp where tp.template_id = v_template and tp.page_type_id = new.page_type_id
  ) then
    raise exception using errcode = 'P0001', message = 'dashboard:page_template_only';
  end if;
  return new;
end;
$$;
drop trigger if exists dashboard_pages_enforce_rules on public.dashboard_pages;
create trigger dashboard_pages_enforce_rules
  before insert or update of page_type_id, dashboard_id, workspace_id on public.dashboard_pages
  for each row execute function private.enforce_dashboard_page_rules();

-- Conta nova num dashboard precisa ser da plataforma do template e estar ativa
-- (as já ligadas ficam, com o histórico visível).
create or replace function private.check_dashboard_source()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_template text;
  v_platform text;
  v_enabled boolean;
begin
  perform private.assert_workspace_member(new.workspace_id);
  select d.template_id into v_template from public.dashboards d where d.id = new.dashboard_id and d.workspace_id = new.workspace_id;
  select a.platform_id, a.is_enabled into v_platform, v_enabled
  from public.ad_accounts a where a.id = new.ad_account_id and a.workspace_id = new.workspace_id;
  if not exists (select 1 from public.dashboard_template_platforms tp where tp.template_id = v_template and tp.platform_id = v_platform) then
    raise exception using errcode = 'P0001', message = 'dashboard:source_platform', hint = 'Essa conta não é de uma plataforma deste dashboard.';
  end if;
  if not coalesce(v_enabled, false) and not exists (
    select 1 from public.dashboard_sources s where s.dashboard_id = new.dashboard_id and s.ad_account_id = new.ad_account_id
  ) then
    raise exception using errcode = 'P0001', message = 'dashboard:source_disabled', hint = 'Ative a conta antes de usá-la num dashboard.';
  end if;
  return new;
end;
$$;

-- LPs: criar, trocar template e publicar exigem plano; despublicar e arquivar nunca exigem.
create or replace function private.enforce_landing_page_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  e public.plan_entitlements%rowtype;
  v_count integer;
  v_template_rank smallint;
begin
  if tg_op = 'UPDATE'
     and new.template_id is not distinct from old.template_id
     and not (new.status = 'published' and old.status is distinct from 'published') then
    return new;
  end if;

  e := private.require_active_plan(new.workspace_id, 'landing_pages');

  if tg_op = 'INSERT' or new.template_id is distinct from old.template_id then
    select p.rank into v_template_rank
    from public.landing_templates t join public.plans p on p.id = t.min_plan_id
    where t.id = new.template_id and t.is_active;
    if v_template_rank is null then
      raise exception using errcode = 'P0001', message = 'landing:template_unavailable';
    end if;
    if v_template_rank > private.plan_rank(e.plan_id) then
      raise exception using errcode = 'P0001', message = 'plan:template', hint = 'Este template é de um plano acima do seu.';
    end if;
  end if;

  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    select count(*) into v_count
    from public.landing_pages l
    where l.workspace_id = new.workspace_id and l.status = 'published' and l.id <> new.id;
    if v_count >= e.max_landing_pages then
      raise exception using errcode = 'P0001', message = 'limit:landing_pages',
        hint = format('Seu plano permite até %s landing pages publicadas.', e.max_landing_pages);
    end if;
  end if;
  return new;
end;
$$;

-- Contas: reconexão nunca falha porque o Meta mudou a conta de BM (se o plano
-- não comporta, ela sai do ar e o usuário escolhe de novo); conta pendente tem erro próprio.
create or replace function private.enforce_ad_account_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  e public.plan_entitlements%rowtype;
  v_quantity integer;
  v_unit text := private.billable_unit(new.platform_id, new.external_id, new.business_external_id);
  v_units integer;
  v_same boolean;
  v_platform_rank smallint;
  v_moved boolean := tg_op = 'UPDATE' and old.is_enabled and new.business_external_id is distinct from old.business_external_id;
begin
  if not new.is_enabled or (tg_op = 'UPDATE' and old.is_enabled and not v_moved) then
    return new;
  end if;
  if new.status <> 'active' or new.connection_id is null then
    raise exception using errcode = 'P0001', message = 'account:not_connected', hint = 'Só contas conectadas e ativas podem ser ligadas.';
  end if;
  if v_moved and not coalesce((select wp.has_access from private.workspace_plan(new.workspace_id) wp), false) then
    new.is_enabled := false;
    new.enabled_at := null;
    return new;
  end if;

  e := private.require_active_plan(new.workspace_id, 'ad_accounts');

  select p.rank into v_platform_rank
  from public.platforms pl join public.plans p on p.id = pl.min_plan_id
  where pl.id = new.platform_id;
  if v_platform_rank > private.plan_rank(e.plan_id) then
    raise exception using errcode = 'P0001', message = 'plan:platform', hint = 'Esta plataforma é de um plano acima do seu.';
  end if;

  select wp.accounts_quantity into v_quantity from private.workspace_plan(new.workspace_id) wp;
  select count(distinct u.unit), coalesce(bool_or(u.unit = v_unit), false)
    into v_units, v_same
  from (
    select private.billable_unit(a.platform_id, a.external_id, a.business_external_id) as unit
    from public.ad_accounts a
    where a.workspace_id = new.workspace_id and a.is_enabled and a.id <> new.id
  ) u;
  if not v_same then
    v_units := v_units + 1;
  end if;
  if v_units > v_quantity then
    if v_moved then
      new.is_enabled := false;
      new.enabled_at := null;
      return new;
    end if;
    raise exception using errcode = 'P0001', message = 'limit:accounts',
      hint = format('Seu plano tem %s %s contratada(s).', v_quantity, case when v_quantity = 1 then 'conta' else 'contas' end);
  end if;
  return new;
end;
$$;

-- Marca própria efetiva (para o app ler): só vale com white label e assinatura com acesso.
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
  (w.hide_vyz_brand and coalesce(e.white_label, false) and coalesce(s.status in ('active', 'trialing', 'past_due'), false)) as hide_vyz_brand_effective
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

-- ---- E. cobrança ----------------------------------------------------------------------------

-- Checkout com plano precisa de pelo menos uma conta (como a assinatura).
alter table public.checkout_sessions drop constraint if exists checkout_sessions_plan_accounts_check;
alter table public.checkout_sessions
  add constraint checkout_sessions_plan_accounts_check check (plan_id is null or accounts_quantity >= 1);

-- O pedido precisa fechar com o catálogo; workspace com assinatura ativa não
-- recebe outra por checkout (troca de plano é no painel); linhas da fatura com
-- o valor do período; cliente do provedor não muda de workspace.
create or replace function public.fulfill_checkout(
  p_checkout_id uuid,
  p_provider_customer_id text,
  p_provider_subscription_id text default null,
  p_provider_invoice_id text default null,
  p_payment jsonb default '{}'::jsonb,
  p_period_start timestamptz default now(),
  p_period_end timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.checkout_sessions%rowtype;
  v_ws uuid;
  v_sub uuid;
  v_invoice uuid;
  v_end timestamptz;
  v_months integer;
  v_recurring bigint;
  v_once bigint;
  v_plan_lines integer;
  v_bad integer;
begin
  select * into c from public.checkout_sessions where id = p_checkout_id for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'checkout:not_found';
  end if;
  if c.status = 'completed' then
    return c.workspace_id;
  end if;
  if c.status <> 'open' then
    raise exception using errcode = 'P0001', message = 'checkout:not_open';
  end if;
  if c.user_id is null then
    raise exception using errcode = 'P0001', message = 'checkout:no_user';
  end if;

  v_months := case c.interval when 'year' then 12 else 1 end;
  select
    coalesce(sum(i.amount_cents) filter (where i.kind = 'recurring'), 0),
    coalesce(sum(i.amount_cents) filter (where i.kind = 'one_time'), 0),
    count(*) filter (where i.plan_price_id is not null),
    count(*) filter (where
         (i.kind = 'recurring' and c.plan_id is null)
      or (i.plan_price_id is not null and (
            pp.plan_id is distinct from c.plan_id or pp.interval is distinct from c.interval
            or i.quantity <> c.accounts_quantity
            or i.amount_cents <> pp.first_account_cents + pp.extra_account_cents * (i.quantity - 1) + pp.addon_cents))
      or (i.billing_item_id is not null and (bi.kind is distinct from i.kind or i.amount_cents <> bi.unit_cents * i.quantity)))
  into v_recurring, v_once, v_plan_lines, v_bad
  from public.checkout_items i
  left join public.plan_prices pp on pp.id = i.plan_price_id
  left join public.billing_items bi on bi.id = i.billing_item_id
  where i.checkout_session_id = c.id;
  if v_bad > 0
     or v_plan_lines <> (case when c.plan_id is null then 0 else 1 end)
     or (c.plan_id is null and v_once = 0)
     or c.amount_due_now_cents <> v_recurring * v_months + v_once
     or c.recurring_cents <> v_recurring * v_months then
    raise exception using errcode = 'P0001', message = 'checkout:invalid_order', hint = 'O pedido não fecha com os itens. Monte o pedido de novo.';
  end if;

  if c.workspace_id is not null then
    if not exists (
      select 1 from public.workspace_members m
      where m.workspace_id = c.workspace_id and m.user_id = c.user_id and m.role = 'owner'
    ) then
      raise exception using errcode = 'P0001', message = 'checkout:not_owner';
    end if;
    v_ws := c.workspace_id;
    -- dois checkouts do mesmo workspace não concluem ao mesmo tempo
    perform pg_advisory_xact_lock(hashtextextended('vyz:checkout:' || v_ws::text, 0));
    if c.plan_id is not null and exists (
      select 1 from public.subscriptions s
      where s.workspace_id = v_ws and s.status in ('active', 'trialing', 'past_due')
    ) then
      raise exception using errcode = 'P0001', message = 'checkout:already_subscribed',
        hint = 'Este workspace já tem uma assinatura ativa. Troque o plano em Plano.';
    end if;
  else
    insert into public.workspaces (name, slug, business_type_id, created_by)
    values (btrim(c.company_name), private.unique_workspace_slug(c.company_name), c.business_type_id, c.user_id)
    returning id into v_ws;
    insert into public.workspace_members (workspace_id, user_id, role) values (v_ws, c.user_id, 'owner');
    update public.profiles set default_workspace_id = v_ws where id = c.user_id and default_workspace_id is null;
  end if;

  if exists (
    select 1 from public.billing_customers b
    where b.provider = c.provider and b.provider_customer_id = p_provider_customer_id and b.workspace_id <> v_ws
  ) then
    raise exception using errcode = 'P0001', message = 'billing:customer_in_use', hint = 'Este cliente do provedor já é de outro workspace.';
  end if;
  insert into public.billing_customers (workspace_id, provider, provider_customer_id, email, legal_name, tax_id, phone)
  values (v_ws, c.provider, p_provider_customer_id, c.email, btrim(c.company_name), c.tax_id, c.phone)
  on conflict (workspace_id) do update set
    provider = excluded.provider,
    provider_customer_id = excluded.provider_customer_id,
    email = excluded.email,
    legal_name = coalesce(excluded.legal_name, public.billing_customers.legal_name),
    tax_id = coalesce(excluded.tax_id, public.billing_customers.tax_id),
    phone = coalesce(excluded.phone, public.billing_customers.phone);

  if c.plan_id is not null then
    -- assinatura sem acesso (unpaid, paused, incomplete) é substituída
    update public.subscriptions
      set status = 'canceled', canceled_at = now(), ended_at = now()
      where workspace_id = v_ws and status not in ('canceled', 'incomplete_expired');

    v_end := coalesce(p_period_end, p_period_start + case c.interval when 'year' then interval '1 year' else interval '1 month' end);
    insert into public.subscriptions (
      workspace_id, plan_id, status, interval, accounts_quantity, provider,
      provider_subscription_id, checkout_session_id, current_period_start, current_period_end
    ) values (
      v_ws, c.plan_id, 'active', c.interval, c.accounts_quantity, c.provider,
      p_provider_subscription_id, c.id, p_period_start, v_end
    )
    returning id into v_sub;

    insert into public.subscription_items (workspace_id, subscription_id, plan_price_id, billing_item_id, quantity, amount_cents)
    select v_ws, v_sub, i.plan_price_id, i.billing_item_id, i.quantity, i.amount_cents
    from public.checkout_items i
    where i.checkout_session_id = c.id and i.kind = 'recurring'
    order by i.position;
  end if;

  insert into public.service_orders (workspace_id, checkout_session_id, billing_item_id, quantity)
  select v_ws, c.id, i.billing_item_id, i.quantity
  from public.checkout_items i
  where i.checkout_session_id = c.id and i.kind = 'one_time'
  order by i.position;

  insert into public.invoices (
    workspace_id, subscription_id, checkout_session_id, provider, provider_invoice_id, status,
    currency, subtotal_cents, total_cents, amount_paid_cents, description, lines,
    period_start, period_end, paid_at
  ) values (
    v_ws, v_sub, c.id, c.provider, p_provider_invoice_id, 'paid',
    c.currency, c.amount_due_now_cents, c.amount_due_now_cents, c.amount_due_now_cents,
    case when c.plan_id is null then 'Pedido avulso' else 'Assinatura ' || c.plan_id end,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'label', i.label, 'kind', i.kind, 'quantity', i.quantity,
        'plan_price_id', i.plan_price_id, 'billing_item_id', i.billing_item_id,
        'months', case when i.kind = 'recurring' then v_months else 1 end,
        'monthly_amount_cents', case when i.kind = 'recurring' then i.amount_cents end,
        'amount_cents', case when i.kind = 'recurring' then i.amount_cents * v_months else i.amount_cents end
      ) order by i.position)
      from public.checkout_items i where i.checkout_session_id = c.id
    ), '[]'::jsonb),
    case when c.plan_id is not null then p_period_start end,
    case when c.plan_id is not null then v_end end,
    now()
  )
  returning id into v_invoice;

  insert into public.payment_transactions (
    workspace_id, invoice_id, checkout_session_id, provider, provider_payment_id, kind, status,
    amount_cents, currency, method, card_brand, card_last4, installments, processed_at
  ) values (
    v_ws, v_invoice, c.id, c.provider, nullif(p_payment ->> 'provider_payment_id', ''), 'charge', 'succeeded',
    c.amount_due_now_cents, c.currency,
    nullif(p_payment ->> 'method', ''), nullif(p_payment ->> 'card_brand', ''), nullif(p_payment ->> 'card_last4', ''),
    nullif(p_payment ->> 'installments', '')::smallint, now()
  );

  -- plataformas contratadas viram as sugeridas no onboarding (só com plano)
  if c.plan_id is not null then
    insert into public.workspace_platforms (workspace_id, platform_id)
    select v_ws, p.id
    from public.platforms p
    where (p.id = 'meta' and coalesce((c.selection ->> 'meta')::integer, 0) > 0)
       or (p.id = 'google' and coalesce((c.selection ->> 'google')::integer, 0) > 0)
       or (p.id = 'ga4' and coalesce((c.selection ->> 'ga4')::integer, 0) > 0)
    on conflict do nothing;
  end if;

  update public.checkout_sessions
    set status = 'completed', completed_at = now(), workspace_id = v_ws
    where id = c.id;

  return v_ws;
end;
$$;
revoke all on function public.fulfill_checkout(uuid, text, text, text, jsonb, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.fulfill_checkout(uuid, text, text, text, jsonb, timestamptz, timestamptz) to service_role;

-- Cancelamento agendado vence no fim do período (também cobre webhook perdido).
create or replace function private.close_ended_subscriptions()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v integer;
begin
  update public.subscriptions
     set status = 'canceled', canceled_at = coalesce(canceled_at, now()), ended_at = now()
   where cancel_at_period_end and current_period_end <= now()
     and status not in ('canceled', 'incomplete_expired');
  get diagnostics v = row_count;
  return v;
end;
$$;
revoke all on function private.close_ended_subscriptions() from public;
select cron.schedule('vyz-close-subscriptions', '*/15 * * * *', $cron$select private.close_ended_subscriptions()$cron$);

-- Registros financeiros não somem com o workspace (apagar exige purgar antes).
alter table public.invoices drop constraint if exists invoices_workspace_id_fkey;
alter table public.invoices add constraint invoices_workspace_id_fkey
  foreign key (workspace_id) references public.workspaces (id) on delete restrict;
alter table public.payment_transactions drop constraint if exists payment_transactions_workspace_id_fkey;
alter table public.payment_transactions add constraint payment_transactions_workspace_id_fkey
  foreign key (workspace_id) references public.workspaces (id) on delete restrict;
drop trigger if exists audit on public.invoices;
create trigger audit after insert or update or delete on public.invoices
  for each row execute function private.audit_row_change('workspace_id', 'id');
drop trigger if exists audit on public.checkout_items;
create trigger audit after insert or update or delete on public.checkout_items
  for each row execute function private.audit_row_change('-', 'id');

-- ---- F. integrações -------------------------------------------------------------------------

-- Valida plataforma × provedor e tira do ar as contas que o provedor não devolveu mais.
create or replace function public.integration_connect(
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
  if exists (
    select 1
    from jsonb_array_elements(coalesce(p_accounts, '[]'::jsonb)) a
    left join public.platforms pl on pl.id = a ->> 'platform_id'
    where pl.oauth_provider is distinct from p_provider
  ) then
    raise exception using errcode = 'P0001', message = 'integration:platform_mismatch';
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

  update public.ad_accounts a
     set is_enabled = false, enabled_at = null, status = 'disabled'
   where a.workspace_id = p_workspace_id and a.connection_id = v_conn and a.status = 'active'
     and not exists (
       select 1 from jsonb_array_elements(coalesce(p_accounts, '[]'::jsonb)) x
       where x ->> 'platform_id' = a.platform_id and x ->> 'external_id' = a.external_id
     );

  return v_conn;
end;
$$;
revoke all on function public.integration_connect(uuid, public.integration_provider, text, text, text, text[], boolean, uuid, text, text, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.integration_connect(uuid, public.integration_provider, text, text, text, text[], boolean, uuid, text, text, timestamptz, jsonb) to service_role;

-- Desconectar mantém o histórico de sincronizações.
alter table public.sync_runs drop constraint if exists sync_runs_workspace_id_connection_id_fkey;
alter table public.sync_runs add constraint sync_runs_workspace_id_connection_id_fkey
  foreign key (workspace_id, connection_id) references public.connections (workspace_id, id) on delete set null (connection_id);

-- Última sincronização por conta sem ler o histórico inteiro.
create index if not exists sync_runs_account_recent_idx on public.sync_runs (workspace_id, ad_account_id, created_at desc);
drop index if exists public.sync_runs_account_idx;

-- ---- G. dashboards e landing pages ------------------------------------------------------------

-- Sem lista de páginas: as do template que o plano libera; nunca um dashboard sem páginas.
create or replace function public.create_dashboard(
  p_workspace_id uuid,
  p_template_id text,
  p_name text,
  p_client_name text default '',
  p_settings jsonb default '{}'::jsonb,
  p_page_type_ids text[] default null,
  p_ad_account_ids uuid[] default '{}'
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
  v_pages text[];
  v_pages_rank smallint;
begin
  insert into public.dashboards (
    workspace_id, template_id, name, client_name, goal_cents, margin, monthly_budget_cents,
    period, custom_days, attribution, created_by
  ) values (
    p_workspace_id, p_template_id, btrim(p_name), btrim(coalesce(p_client_name, '')),
    nullif(p_settings ->> 'goal_cents', '')::bigint,
    nullif(p_settings ->> 'margin', '')::numeric,
    nullif(p_settings ->> 'monthly_budget_cents', '')::bigint,
    coalesce(nullif(p_settings ->> 'period', ''), '30d'),
    coalesce(nullif(p_settings ->> 'custom_days', '')::smallint, 14),
    coalesce(nullif(p_settings ->> 'attribution', ''), '7c1v'),
    (select auth.uid())
  )
  returning id into v_id;

  if p_page_type_ids is null then
    select p.rank into v_pages_rank
    from public.workspace_access a join public.plans p on p.id = a.pages_plan_id
    where a.workspace_id = p_workspace_id;
    v_pages := array(
      select tp.page_type_id
      from public.dashboard_template_pages tp
      join public.dashboard_page_types pt on pt.id = tp.page_type_id
      join public.plans pp on pp.id = pt.min_plan_id
      where tp.template_id = p_template_id and pp.rank <= coalesce(v_pages_rank, -1)
      order by tp.position
    );
  else
    v_pages := p_page_type_ids;
  end if;
  if coalesce(array_length(v_pages, 1), 0) = 0 then
    raise exception using errcode = 'P0001', message = 'dashboard:no_pages';
  end if;

  insert into public.dashboard_pages (workspace_id, dashboard_id, page_type_id, position)
  select p_workspace_id, v_id, t.page_type_id, (t.ord - 1)::smallint
  from unnest(v_pages) with ordinality as t (page_type_id, ord);

  insert into public.dashboard_sources (workspace_id, dashboard_id, ad_account_id)
  select p_workspace_id, v_id, a.id
  from unnest(coalesce(p_ad_account_ids, '{}')) as a (id);

  return v_id;
end;
$$;
revoke all on function public.create_dashboard(uuid, text, text, text, jsonb, text[], uuid[]) from public, anon;
grant execute on function public.create_dashboard(uuid, text, text, text, jsonb, text[], uuid[]) to authenticated, service_role;

-- Slugs: nomes reservados e endereço apagado/trocado "aposentado" por 180 dias para outros workspaces.
alter table public.landing_pages drop constraint if exists landing_pages_slug_not_reserved;
alter table public.landing_pages add constraint landing_pages_slug_not_reserved check (slug not in (
  'www', 'app', 'api', 'admin', 'painel', 'entrar', 'login', 'auth', 'assinar', 'checkout', 'pagamento', 'conta', 'contas',
  'suporte', 'ajuda', 'help', 'status', 'docs', 'blog', 'mail', 'email', 'smtp', 'ftp', 'cdn', 'static', 'assets', 'img',
  'r', 'p', 'lp', 'vyz', 'dev', 'staging', 'teste', 'test', 'demo', 'dashboard', 'dashboards', 'comecar', 'integracoes'
)) not valid;
alter table public.landing_pages validate constraint landing_pages_slug_not_reserved;

create table if not exists private.retired_landing_slugs (
  slug text primary key,
  workspace_id uuid not null,
  retired_at timestamptz not null default now()
);
comment on table private.retired_landing_slugs is 'Slugs de LP apagados ou trocados: ficam reservados ao workspace por 180 dias.';

create or replace function private.retire_landing_slug()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' or new.slug is distinct from old.slug then
    insert into private.retired_landing_slugs (slug, workspace_id) values (old.slug, old.workspace_id)
    on conflict (slug) do update set workspace_id = excluded.workspace_id, retired_at = now();
  end if;
  return null;
end;
$$;
create or replace function private.guard_retired_landing_slug()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from private.retired_landing_slugs r
    where r.slug = new.slug and r.workspace_id <> new.workspace_id and r.retired_at > now() - interval '180 days'
  ) then
    raise exception using errcode = 'P0001', message = 'landing:slug_retired', hint = 'Esse endereço foi usado por outra conta há pouco tempo.';
  end if;
  return new;
end;
$$;
revoke all on function private.retire_landing_slug() from public;
revoke all on function private.guard_retired_landing_slug() from public;
drop trigger if exists landing_pages_retire_slug on public.landing_pages;
create trigger landing_pages_retire_slug after delete or update of slug on public.landing_pages
  for each row execute function private.retire_landing_slug();
drop trigger if exists landing_pages_guard_retired_slug on public.landing_pages;
create trigger landing_pages_guard_retired_slug before insert or update of slug on public.landing_pages
  for each row execute function private.guard_retired_landing_slug();

-- A data de publicação é sempre a do banco.
create or replace function private.stamp_landing_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published'
     and (tg_op = 'INSERT' or old.status is distinct from 'published' or new.published_at is distinct from old.published_at) then
    new.published_at := now();
  elsif tg_op = 'UPDATE' and new.status <> 'published' and new.published_at is distinct from old.published_at then
    new.published_at := old.published_at;
  end if;
  return new;
end;
$$;
revoke all on function private.stamp_landing_published_at() from public;
drop trigger if exists landing_pages_stamp_published_at on public.landing_pages;
create trigger landing_pages_stamp_published_at
  before insert or update of status, published_at on public.landing_pages
  for each row execute function private.stamp_landing_published_at();

-- A versão publicada guarda quem publicou (também pelo servidor, via x-vyz-actor-id).
create or replace function private.snapshot_landing_page_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'published' and (
    tg_op = 'INSERT'
    or old.status is distinct from 'published'
    or old.published_at is distinct from new.published_at
  ) then
    insert into public.landing_page_versions (workspace_id, landing_page_id, version, content, tracking, published_by, published_at)
    values (
      new.workspace_id,
      new.id,
      coalesce((select max(v.version) from public.landing_page_versions v where v.landing_page_id = new.id), 0) + 1,
      new.content,
      jsonb_strip_nulls(jsonb_build_object(
        'gtm', new.gtm_container_id,
        'pixel', new.meta_pixel_id,
        'adsConversion', new.google_ads_conversion,
        'ga4', new.ga4_measurement_id
      )),
      private.current_actor_id(),
      coalesce(new.published_at, now())
    );
  end if;
  return new;
end;
$$;

-- ---- H. métricas ------------------------------------------------------------------------------

-- Parcelas ponderadas pelas impressões qualificadas (impressões ÷ parcela). O
-- alcance não se soma entre campanhas (as pessoas se repetem): o rollup grava o
-- maior alcance diário como estimativa e não sobrescreve o alcance da conta que
-- a sincronização gravar (insights da conta, nível account).
create or replace function public.rollup_account_insights(p_ad_account_id uuid, p_from date, p_to date)
returns integer
language sql
security definer
set search_path = ''
as $$
  with agg as (
    select
      c.workspace_id,
      c.ad_account_id,
      c.date,
      sum(c.spend) as spend,
      sum(c.impressions) as impressions,
      max(c.reach) as reach,
      sum(c.clicks) as clicks,
      sum(c.link_clicks) as link_clicks,
      sum(c.landing_page_views) as landing_page_views,
      sum(c.add_to_cart) as add_to_cart,
      sum(c.initiate_checkout) as initiate_checkout,
      sum(c.conversions) as conversions,
      sum(c.conversion_value) as conversion_value,
      sum(c.video_views) as video_views,
      sum(c.video_thruplays) as video_thruplays,
      (sum(c.impressions) filter (where c.search_impression_share > 0)
        / nullif(sum(c.impressions / c.search_impression_share) filter (where c.search_impression_share > 0), 0))::numeric(7, 6) as search_impression_share,
      (sum(c.search_lost_is_budget * c.impressions / c.search_impression_share) filter (where c.search_impression_share > 0 and c.search_lost_is_budget is not null)
        / nullif(sum(c.impressions / c.search_impression_share) filter (where c.search_impression_share > 0 and c.search_lost_is_budget is not null), 0))::numeric(7, 6) as search_lost_is_budget,
      (sum(c.search_lost_is_rank * c.impressions / c.search_impression_share) filter (where c.search_impression_share > 0 and c.search_lost_is_rank is not null)
        / nullif(sum(c.impressions / c.search_impression_share) filter (where c.search_impression_share > 0 and c.search_lost_is_rank is not null), 0))::numeric(7, 6) as search_lost_is_rank
    from public.insights_campaign_daily c
    where c.ad_account_id = p_ad_account_id and c.date between p_from and p_to
    group by c.workspace_id, c.ad_account_id, c.date
  ),
  upserted as (
    insert into public.insights_account_daily as t (
      workspace_id, ad_account_id, date, spend, impressions, reach, clicks, link_clicks, landing_page_views,
      add_to_cart, initiate_checkout, conversions, conversion_value, video_views, video_thruplays,
      search_impression_share, search_lost_is_budget, search_lost_is_rank, synced_at
    )
    select
      workspace_id, ad_account_id, date, spend, impressions, reach, clicks, link_clicks, landing_page_views,
      add_to_cart, initiate_checkout, conversions, conversion_value, video_views, video_thruplays,
      search_impression_share, search_lost_is_budget, search_lost_is_rank, now()
    from agg
    on conflict (ad_account_id, date) do update set
      spend = excluded.spend,
      impressions = excluded.impressions,
      reach = coalesce(t.reach, excluded.reach),
      clicks = excluded.clicks,
      link_clicks = excluded.link_clicks,
      landing_page_views = excluded.landing_page_views,
      add_to_cart = excluded.add_to_cart,
      initiate_checkout = excluded.initiate_checkout,
      conversions = excluded.conversions,
      conversion_value = excluded.conversion_value,
      video_views = excluded.video_views,
      video_thruplays = excluded.video_thruplays,
      search_impression_share = excluded.search_impression_share,
      search_lost_is_budget = excluded.search_lost_is_budget,
      search_lost_is_rank = excluded.search_lost_is_rank,
      synced_at = now()
    returning 1
  )
  select count(*)::integer from upserted;
$$;
revoke all on function public.rollup_account_insights(uuid, date, date) from public, anon, authenticated;
grant execute on function public.rollup_account_insights(uuid, date, date) to service_role;

-- Índice que serve a política (workspace) e a leitura do dashboard (conta + período).
-- As FKs compostas seguem cobertas pelas PKs (entidade ou conta na frente).
create index if not exists insights_campaign_daily_ws_account_date_idx on public.insights_campaign_daily (workspace_id, ad_account_id, date);
create index if not exists insights_ad_daily_ws_account_date_idx on public.insights_ad_daily (workspace_id, ad_account_id, date);
create index if not exists insights_breakdown_daily_ws_account_date_idx on public.insights_breakdown_daily (workspace_id, ad_account_id, date);
create index if not exists insights_search_term_daily_ws_account_date_idx on public.insights_search_term_daily (workspace_id, ad_account_id, date);
create index if not exists insights_product_daily_ws_account_date_idx on public.insights_product_daily (workspace_id, ad_account_id, date);
drop index if exists public.insights_campaign_daily_fk_idx;
drop index if exists public.insights_ad_daily_fk_idx;
drop index if exists public.insights_breakdown_daily_fk_idx;
drop index if exists public.insights_search_term_daily_fk_idx;
drop index if exists public.insights_product_daily_fk_idx;

-- Cobertos por índices únicos com o mesmo prefixo.
drop index if exists public.ad_campaigns_account_idx;
drop index if exists public.ad_products_account_idx;
drop index if exists public.checkout_items_session_idx;

-- ---- I. auditoria e manutenção -------------------------------------------------------------------

-- ip/user_agent vindos do servidor (service_role) ficam marcados como confiáveis;
-- batimentos do servidor (sincronização, visita ao link, envio de relatório) não geram auditoria.
alter table public.audit_events add column if not exists ip_trusted boolean not null default false;
comment on column public.audit_events.ip_trusted is 'true = ip/user_agent enviados pelo servidor (service_role); false = informados pelo cliente.';

create or replace function private.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ws_col text := coalesce(tg_argv[0], 'workspace_id');
  v_pk_cols text[] := string_to_array(coalesce(tg_argv[1], 'id'), ',');
  v_masked text[] := coalesce(string_to_array(nullif(tg_argv[2], ''), ','), '{}');
  v_role text := (select auth.role());
  v_noise text[] := case when v_role is distinct from 'authenticated' then
    case tg_table_name
      when 'share_links' then array['view_count', 'last_viewed_at']
      when 'ad_accounts' then array['last_synced_at']
      when 'connections' then array['last_synced_at']
      when 'scheduled_reports' then array['last_run_at', 'next_run_at']
    end
  end;
  v_row jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  v_changed text[];
  k text;
begin
  if tg_op = 'UPDATE' then
    select array_agg(key order by key) into v_changed
    from jsonb_object_keys(v_new) as key
    where v_new -> key is distinct from v_old -> key and key <> 'updated_at' and key <> all (coalesce(v_noise, '{}'));
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
    changed_columns, old_data, new_data, ip, user_agent, ip_trusted
  ) values (
    case when v_ws_col = '-' then null else private.safe_uuid(v_row ->> v_ws_col) end,
    private.current_actor_id(),
    coalesce(v_role, session_user),
    lower(tg_op),
    tg_table_name,
    array_to_string(array(select v_row ->> c from unnest(v_pk_cols) as c), ':'),
    v_changed,
    v_old,
    v_new,
    private.safe_inet(coalesce(private.request_header('x-vyz-ip'), private.request_header('x-forwarded-for'))),
    left(coalesce(private.request_header('x-vyz-user-agent'), private.request_header('user-agent')), 400),
    coalesce(v_role = 'service_role', false)
  );
  return null;
end;
$$;

-- Partições sempre em UTC, com espera curta de lock e sem derrubar a limpeza.
create or replace function private.ensure_monthly_partitions(p_parent regclass, p_months_ahead integer default 3)
returns void
language plpgsql
security definer
set search_path = ''
set lock_timeout = '1s'
set timezone = 'UTC'
as $$
declare
  v_parent text := (select c.relname from pg_catalog.pg_class c where c.oid = p_parent);
  v_default regclass := (select nullif(pt.partdefid, 0)::regclass from pg_catalog.pg_partitioned_table pt where pt.partrelid = p_parent);
  v_from date;
  v_to date;
  v_name text;
  v_stuck boolean;
begin
  for i in -1..p_months_ahead loop
    v_from := (date_trunc('month', now()) + make_interval(months => i))::date;
    v_to := (v_from + interval '1 month')::date;
    v_name := v_parent || '_' || to_char(v_from, 'YYYY_MM');
    continue when to_regclass('private.' || quote_ident(v_name)) is not null;
    -- linhas do mês já na partição default: criar exigiria movê-las (tarefa manual)
    if v_default is not null then
      execute format('select exists (select 1 from %s where created_at >= %L and created_at < %L)', v_default, v_from, v_to) into v_stuck;
      if v_stuck then
        raise warning 'vyz: partição % não criada: há linhas desse mês em %', v_name, v_default;
        continue;
      end if;
    end if;
    begin
      execute format('create table private.%I partition of %s for values from (%L) to (%L)', v_name, p_parent, v_from, v_to);
    exception
      when lock_not_available then
        raise warning 'vyz: partição % adiada (tabela ocupada); nova tentativa amanhã', v_name;
        exit;
      when check_violation then
        raise warning 'vyz: partição % não criada: %', v_name, sqlerrm;
    end;
  end loop;
end;
$$;

create or replace function private.drop_old_partitions(p_parent regclass, p_keep_months integer)
returns integer
language plpgsql
security definer
set search_path = ''
set lock_timeout = '1s'
set timezone = 'UTC'
as $$
declare
  v_parent text := (select c.relname from pg_catalog.pg_class c where c.oid = p_parent);
  v_cutoff text := v_parent || '_' || to_char(date_trunc('month', now()) - make_interval(months => p_keep_months), 'YYYY_MM');
  v_dropped integer := 0;
  r record;
begin
  if p_keep_months < 1 then
    raise exception using errcode = 'P0001', message = 'housekeeping:invalid_retention';
  end if;
  for r in
    select c.relname
    from pg_catalog.pg_inherits i
    join pg_catalog.pg_class c on c.oid = i.inhrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where i.inhparent = p_parent and n.nspname = 'private'
      and c.relname ~ ('^' || v_parent || '_[0-9]{4}_[0-9]{2}$')
      and c.relname < v_cutoff
    order by c.relname
  loop
    begin
      execute format('drop table private.%I', r.relname);
      v_dropped := v_dropped + 1;
    exception when lock_not_available then
      raise warning 'vyz: partição % não apagada (tabela ocupada); nova tentativa amanhã', r.relname;
      exit;
    end;
  end loop;
  return v_dropped;
end;
$$;

-- Cada etapa isolada: uma falha vira aviso no resultado e não desfaz as outras.
create or replace function private.housekeeping()
returns jsonb
language plpgsql
security definer
set search_path = ''
set timezone = 'UTC'
as $$
declare
  v_out jsonb := '{}'::jsonb;
  v_n integer;
  v_dropped integer := 0;
  r record;
begin
  begin
    update public.checkout_sessions set status = 'expired' where status = 'open' and expires_at < now();
    get diagnostics v_n = row_count;
    v_out := v_out || jsonb_build_object('expired_checkouts', v_n);
  exception when others then
    v_out := v_out || jsonb_build_object('expired_checkouts_error', sqlerrm);
    raise warning 'vyz housekeeping (checkouts): %', sqlerrm;
  end;

  begin
    delete from public.oauth_states where expires_at < now() - interval '1 day';
    get diagnostics v_n = row_count;
    v_out := v_out || jsonb_build_object('oauth_states_deleted', v_n);
  exception when others then
    v_out := v_out || jsonb_build_object('oauth_states_error', sqlerrm);
    raise warning 'vyz housekeeping (oauth): %', sqlerrm;
  end;

  begin
    delete from public.rate_limits where window_start < now() - interval '1 day';
    get diagnostics v_n = row_count;
    v_out := v_out || jsonb_build_object('rate_limit_windows_deleted', v_n);
  exception when others then
    v_out := v_out || jsonb_build_object('rate_limits_error', sqlerrm);
    raise warning 'vyz housekeeping (rate_limits): %', sqlerrm;
  end;

  begin
    update public.sync_runs
      set status = 'failed', error = coalesce(error, 'Tempo esgotado'), finished_at = now()
      where status in ('queued', 'running') and created_at < now() - interval '2 hours';
    get diagnostics v_n = row_count;
    v_out := v_out || jsonb_build_object('stuck_syncs_failed', v_n);
  exception when others then
    v_out := v_out || jsonb_build_object('stuck_syncs_error', sqlerrm);
    raise warning 'vyz housekeeping (sync_runs): %', sqlerrm;
  end;

  -- retenção: auditoria 5 anos (prazo fiscal), acessos 2 anos, atividade 13 meses
  for r in
    select * from (values
      ('public.audit_events'::regclass, 60),
      ('public.auth_events'::regclass, 24),
      ('public.activity_events'::regclass, 13)
    ) as t (parent, keep_months)
  loop
    begin
      perform private.ensure_monthly_partitions(r.parent, 3);
    exception when others then
      v_out := v_out || jsonb_build_object(r.parent::text || ':partitions_error', sqlerrm);
      raise warning 'vyz housekeeping (partições de %): %', r.parent, sqlerrm;
    end;
    begin
      v_dropped := v_dropped + private.drop_old_partitions(r.parent, r.keep_months);
    exception when others then
      v_out := v_out || jsonb_build_object(r.parent::text || ':retention_error', sqlerrm);
      raise warning 'vyz housekeeping (retenção de %): %', r.parent, sqlerrm;
    end;
  end loop;

  return v_out || jsonb_build_object('partitions_dropped', v_dropped);
end;
$$;
revoke all on function private.housekeeping() from public;

-- Índices para a limpeza e para a lista de convites.
create index if not exists checkout_sessions_open_expires_idx on public.checkout_sessions (expires_at) where status = 'open';
create index if not exists workspace_invitations_workspace_idx on public.workspace_invitations (workspace_id, created_at desc);

-- Sessão direta esquecida dentro de transação (scripts, psql) é encerrada.
alter role postgres set idle_in_transaction_session_timeout = '15min';

-- ---- J. RLS indexável ---------------------------------------------------------------------------

-- "x in (select private.workspace_ids(...))" vira "x = any (array(select ...))":
-- mesma semântica, mas a função roda uma vez por consulta (InitPlan, também nas
-- partições) e a condição usa índice. Idempotente: só reescreve a forma antiga.
-- Políticas novas: escreva direto "workspace_id = any (array(select private.workspace_ids()))".
do $$
declare
  r record;
  c_pat constant text := '\m([a-z_]+) IN \( SELECT (private\.(?:workspace_ids|co_member_ids)\([^()]*\)) AS [a-z_]+\)';
  v_path text := current_setting('search_path');
  v_sql text;
begin
  perform set_config('search_path', '', true);
  for r in
    select p.schemaname, p.tablename, p.policyname, p.qual, p.with_check
    from pg_catalog.pg_policies p
    where p.schemaname = 'public'
      and (p.qual ~ 'IN \( SELECT private\.(workspace_ids|co_member_ids)\('
           or p.with_check ~ 'IN \( SELECT private\.(workspace_ids|co_member_ids)\(')
  loop
    v_sql := format('alter policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
    if r.qual is not null then
      v_sql := v_sql || ' using (' || regexp_replace(r.qual, c_pat, '\1 = ANY (ARRAY( SELECT \2))', 'g') || ')';
    end if;
    if r.with_check is not null then
      v_sql := v_sql || ' with check (' || regexp_replace(r.with_check, c_pat, '\1 = ANY (ARRAY( SELECT \2))', 'g') || ')';
    end if;
    execute v_sql;
  end loop;
  perform set_config('search_path', v_path, true);
end $$;

alter policy "checkout_items: do checkout do usuario" on public.checkout_items
  using (checkout_session_id = any (array(
    select s.id from public.checkout_sessions s where s.user_id = (select auth.uid()))));
