-- =============================================================================
-- VYZ · 09 · Limites do plano (no banco)
-- O app checa antes (para a mensagem certa), mas quem garante é o banco:
-- gatilhos validam assinatura ativa, limites de quantidade, plano mínimo de
-- templates, páginas e plataformas, e a marca própria. Um advisory lock por
-- workspace serializa as contagens (sem corrida entre duas abas).
--
-- Erros: SQLSTATE P0001 com message "<grupo>:<motivo>" (ex.: limit:dashboards,
-- plan:inactive). O app traduz em src/server/supabase/errors.ts.
-- =============================================================================

-- Unidade de cobrança de uma conta: no Meta conta o Business Manager; nas
-- outras plataformas, a própria conta.
create function private.billable_unit(p_platform_id text, p_external_id text, p_business_external_id text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case
    when p_platform_id = 'meta' then 'meta:' || coalesce(p_business_external_id, p_external_id)
    else p_platform_id || ':' || p_external_id
  end;
$$;

create function private.plan_rank(p_plan_id text)
returns smallint
language sql
stable
security definer
set search_path = ''
as $$
  select p.rank from public.plans p where p.id = p_plan_id;
$$;

-- Plano vigente com acesso, ou erro plan:inactive. Bloqueia o workspace para
-- contagens consistentes até o fim da transação.
create function private.require_active_plan(p_workspace_id uuid, p_lock text default null)
returns public.plan_entitlements
language plpgsql
security definer
set search_path = ''
as $$
declare
  v record;
  e public.plan_entitlements%rowtype;
begin
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

-- ---- dashboards ---------------------------------------------------------------------

create function private.enforce_dashboard_rules()
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

  if (new.hide_vyz_brand or new.brand_color is not null or new.brand_logo_path is not null)
     and (
       tg_op = 'INSERT'
       or new.hide_vyz_brand is distinct from old.hide_vyz_brand
       or new.brand_color is distinct from old.brand_color
       or new.brand_logo_path is distinct from old.brand_logo_path
     )
     and not e.white_label
  then
    raise exception using errcode = 'P0001', message = 'plan:white_label', hint = 'Marca própria é do plano Personalizado.';
  end if;
  return new;
end;
$$;
create trigger dashboards_enforce_rules
  before insert or update of hide_vyz_brand, brand_color, brand_logo_path on public.dashboards
  for each row execute function private.enforce_dashboard_rules();

-- Páginas: plano mínimo da página; páginas exclusivas só no template que as traz.
create function private.enforce_dashboard_page_rules()
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
  select * into v_page from public.dashboard_page_types pt where pt.id = new.page_type_id;
  select d.template_id into v_template from public.dashboards d where d.id = new.dashboard_id;
  e := private.require_active_plan(new.workspace_id);

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
create trigger dashboard_pages_enforce_rules
  before insert or update of page_type_id on public.dashboard_pages
  for each row execute function private.enforce_dashboard_page_rules();

-- ---- landing pages ---------------------------------------------------------------------

create function private.enforce_landing_page_rules()
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
create trigger landing_pages_enforce_rules
  before insert or update of status, template_id on public.landing_pages
  for each row execute function private.enforce_landing_page_rules();

-- ---- contas de anúncio ------------------------------------------------------------------

-- Ativar uma conta: plano mínimo da plataforma e limite de contas contratadas
-- (BMs do Meta contam uma vez, com todas as contas de anúncio dentro).
create function private.enforce_ad_account_rules()
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
begin
  if not new.is_enabled or (tg_op = 'UPDATE' and old.is_enabled and new.business_external_id is not distinct from old.business_external_id) then
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
    raise exception using errcode = 'P0001', message = 'limit:accounts',
      hint = format('Seu plano tem %s %s contratada(s).', v_quantity, case when v_quantity = 1 then 'conta' else 'contas' end);
  end if;
  return new;
end;
$$;
create trigger ad_accounts_enforce_rules
  before insert or update of is_enabled, business_external_id on public.ad_accounts
  for each row execute function private.enforce_ad_account_rules();

-- ---- plataformas do workspace, marca e criações que exigem plano ativo -----------------------

create function private.enforce_workspace_platform_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  e public.plan_entitlements%rowtype;
begin
  e := private.require_active_plan(new.workspace_id);
  if private.plan_rank((select pl.min_plan_id from public.platforms pl where pl.id = new.platform_id)) > private.plan_rank(e.plan_id) then
    raise exception using errcode = 'P0001', message = 'plan:platform', hint = 'Esta plataforma é de um plano acima do seu.';
  end if;
  return new;
end;
$$;
create trigger workspace_platforms_enforce_rules
  before insert on public.workspace_platforms
  for each row execute function private.enforce_workspace_platform_rules();

create function private.enforce_workspace_brand_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  e public.plan_entitlements%rowtype;
begin
  if new.hide_vyz_brand and not old.hide_vyz_brand then
    e := private.require_active_plan(new.id);
    if not e.white_label then
      raise exception using errcode = 'P0001', message = 'plan:white_label', hint = 'Marca própria é do plano Personalizado.';
    end if;
  end if;
  return new;
end;
$$;
create trigger workspaces_enforce_brand_rules
  before update of hide_vyz_brand on public.workspaces
  for each row execute function private.enforce_workspace_brand_rules();

create function private.enforce_active_plan()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_active_plan(new.workspace_id);
  return new;
end;
$$;
create trigger share_links_enforce_active_plan before insert on public.share_links for each row execute function private.enforce_active_plan();
create trigger scheduled_reports_enforce_active_plan before insert on public.scheduled_reports for each row execute function private.enforce_active_plan();
create trigger dashboard_exports_enforce_active_plan before insert on public.dashboard_exports for each row execute function private.enforce_active_plan();

-- ---- uso do workspace -------------------------------------------------------------------------

create view public.workspace_usage
with (security_invoker = true)
as
select
  w.id as workspace_id,
  (select count(*) from public.dashboards d where d.workspace_id = w.id)::integer as dashboards,
  (select count(*) from public.landing_pages l where l.workspace_id = w.id)::integer as landing_pages,
  (select count(*) from public.landing_pages l where l.workspace_id = w.id and l.status = 'published')::integer as published_landing_pages,
  (select count(*) from public.ad_accounts a where a.workspace_id = w.id and a.is_enabled)::integer as enabled_ad_accounts,
  (
    select count(distinct private.billable_unit(a.platform_id, a.external_id, a.business_external_id))
    from public.ad_accounts a
    where a.workspace_id = w.id and a.is_enabled
  )::integer as billable_accounts,
  (select count(*) from public.connections c where c.workspace_id = w.id and c.status = 'active')::integer as active_connections
from public.workspaces w;
comment on view public.workspace_usage is 'Quanto do plano está em uso: dashboards, LPs publicadas e contas contratadas ativas (billable_accounts).';
grant select on public.workspace_usage to authenticated;
grant execute on function private.billable_unit(text, text, text) to authenticated, service_role;
