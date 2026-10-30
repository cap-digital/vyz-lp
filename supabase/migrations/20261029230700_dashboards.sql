-- =============================================================================
-- VYZ · 07 · Dashboards e compartilhamento
-- Dashboards (com páginas e contas de origem), links públicos, relatórios
-- agendados (destinatários e histórico de envios) e exportações.
-- =============================================================================

create table public.dashboards (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  template_id text not null references public.dashboard_templates (id),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  client_name text not null default '' check (char_length(client_name) <= 80),
  goal_cents bigint check (goal_cents >= 0),
  margin numeric(5, 4) check (margin > 0 and margin <= 1),
  monthly_budget_cents bigint check (monthly_budget_cents >= 0),
  period text not null default '30d' check (period in ('7d', '30d', 'mes', 'custom')),
  custom_days smallint not null default 14 check (custom_days between 3 and 60),
  attribution text not null default '7c1v' check (attribution in ('7c1v', '1c', '7c', '28c')),
  currency text not null default 'BRL' check (currency ~ '^[A-Z]{3}$'),
  brand_color text check (brand_color is null or brand_color ~ '^#[0-9A-Fa-f]{6}$'),
  brand_logo_path text,
  hide_vyz_brand boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id)
);
comment on table public.dashboards is 'Dashboard de um cliente: template, metas e período padrão. Páginas em dashboard_pages; contas em dashboard_sources.';
comment on column public.dashboards.goal_cents is 'Meta de CPA/CPL, em centavos.';
comment on column public.dashboards.margin is 'Margem (0–1). ROAS de equilíbrio = 1 ÷ margem.';
comment on column public.dashboards.monthly_budget_cents is 'Verba mensal (pacing), em centavos.';
create index dashboards_workspace_idx on public.dashboards (workspace_id, created_at desc);
create index dashboards_template_idx on public.dashboards (template_id);
create index dashboards_created_by_idx on public.dashboards (created_by);

create table public.dashboard_pages (
  workspace_id uuid not null,
  dashboard_id uuid not null,
  page_type_id text not null references public.dashboard_page_types (id),
  position smallint not null check (position >= 0),
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (dashboard_id, page_type_id),
  constraint dashboard_pages_position_key unique (dashboard_id, position) deferrable initially deferred,
  foreign key (workspace_id, dashboard_id) references public.dashboards (workspace_id, id) on delete cascade
);
comment on table public.dashboard_pages is 'Páginas de cada dashboard, na ordem (position).';
create index dashboard_pages_fk_idx on public.dashboard_pages (workspace_id, dashboard_id);
create index dashboard_pages_type_idx on public.dashboard_pages (page_type_id);

create table public.dashboard_sources (
  workspace_id uuid not null,
  dashboard_id uuid not null,
  ad_account_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (dashboard_id, ad_account_id),
  foreign key (workspace_id, dashboard_id) references public.dashboards (workspace_id, id) on delete cascade,
  foreign key (workspace_id, ad_account_id) references public.ad_accounts (workspace_id, id) on delete cascade
);
comment on table public.dashboard_sources is 'Contas de anúncio que alimentam cada dashboard.';
create index dashboard_sources_fk_idx on public.dashboard_sources (workspace_id, dashboard_id);
create index dashboard_sources_account_idx on public.dashboard_sources (workspace_id, ad_account_id);

-- ---- links públicos ---------------------------------------------------------------------

create table public.share_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  dashboard_id uuid not null,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  token_hint text not null check (char_length(token_hint) between 4 and 8),
  hide_spend boolean not null default false,
  expires_at timestamptz,
  revoked_at timestamptz,
  view_count integer not null default 0 check (view_count >= 0),
  last_viewed_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, dashboard_id) references public.dashboards (workspace_id, id) on delete cascade
);
comment on table public.share_links is 'Links de leitura do dashboard. Guarda só o hash (sha256) do token: o link completo aparece uma vez, na criação.';
comment on column public.share_links.token_hint is 'Últimos caracteres do token, para reconhecer o link na lista.';
create index share_links_fk_idx on public.share_links (workspace_id, dashboard_id);
create index share_links_created_by_idx on public.share_links (created_by);

-- ---- relatórios agendados ---------------------------------------------------------------

create table public.scheduled_reports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  dashboard_id uuid not null,
  frequency public.report_frequency not null,
  weekday smallint check (weekday between 0 and 6),
  month_day smallint check (month_day between 1 and 28),
  format public.report_format not null,
  send_hour smallint not null default 8 check (send_hour between 0 and 23),
  timezone text not null default 'America/Sao_Paulo',
  is_active boolean not null default true,
  next_run_at timestamptz,
  last_run_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, dashboard_id) references public.dashboards (workspace_id, id) on delete cascade,
  check (
    (frequency = 'weekly' and weekday is not null and month_day is null)
    or (frequency = 'monthly' and month_day is not null and weekday is null)
  )
);
comment on table public.scheduled_reports is 'Envio periódico do dashboard (PDF por e-mail ou resumo no WhatsApp).';
create index scheduled_reports_fk_idx on public.scheduled_reports (workspace_id, dashboard_id);
create index scheduled_reports_due_idx on public.scheduled_reports (next_run_at) where is_active;
create index scheduled_reports_created_by_idx on public.scheduled_reports (created_by);

create table public.scheduled_report_recipients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  report_id uuid not null,
  channel text not null check (channel in ('email', 'whatsapp')),
  address text not null check (
    (channel = 'email' and address ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
    or (channel = 'whatsapp' and address ~ '^\+?[0-9]{10,15}$')
  ),
  created_at timestamptz not null default now(),
  unique (report_id, channel, address),
  foreign key (workspace_id, report_id) references public.scheduled_reports (workspace_id, id) on delete cascade
);
comment on table public.scheduled_report_recipients is 'Destinatários de cada relatório agendado.';
create index scheduled_report_recipients_fk_idx on public.scheduled_report_recipients (workspace_id, report_id);

create table public.report_deliveries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  report_id uuid,
  dashboard_id uuid,
  status text not null check (status in ('queued', 'sent', 'failed')),
  channel text not null check (channel in ('email', 'whatsapp')),
  recipients_count integer not null default 0 check (recipients_count >= 0),
  period_start date,
  period_end date,
  error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (workspace_id, report_id) references public.scheduled_reports (workspace_id, id) on delete set null (report_id),
  foreign key (workspace_id, dashboard_id) references public.dashboards (workspace_id, id) on delete set null (dashboard_id)
);
comment on table public.report_deliveries is 'Histórico de envios dos relatórios agendados (escrito pelo serviço de envio).';
create index report_deliveries_workspace_idx on public.report_deliveries (workspace_id, created_at desc);
create index report_deliveries_report_idx on public.report_deliveries (workspace_id, report_id);
create index report_deliveries_dashboard_idx on public.report_deliveries (workspace_id, dashboard_id);

-- ---- exportações ---------------------------------------------------------------------------

create table public.dashboard_exports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  dashboard_id uuid,
  dashboard_name text not null,
  kind text not null default 'pdf' check (kind in ('pdf')),
  storage_path text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (workspace_id, dashboard_id) references public.dashboards (workspace_id, id) on delete set null (dashboard_id)
);
comment on table public.dashboard_exports is 'Histórico de exportações (o nome do dashboard fica, mesmo se ele for apagado).';
create index dashboard_exports_workspace_idx on public.dashboard_exports (workspace_id, created_at desc);
create index dashboard_exports_dashboard_idx on public.dashboard_exports (workspace_id, dashboard_id);
create index dashboard_exports_created_by_idx on public.dashboard_exports (created_by);

-- ---- integridade ------------------------------------------------------------------------------

create trigger dashboards_touch before update on public.dashboards for each row execute function private.touch_updated_at();
create trigger share_links_touch before update on public.share_links for each row execute function private.touch_updated_at();
create trigger scheduled_reports_touch before update on public.scheduled_reports for each row execute function private.touch_updated_at();

-- A conta precisa ser de uma plataforma do template (templates com dados de
-- exemplo não pedem contas).
create function private.check_dashboard_source()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_template text;
  v_platform text;
begin
  select d.template_id into v_template from public.dashboards d where d.id = new.dashboard_id;
  select a.platform_id into v_platform from public.ad_accounts a where a.id = new.ad_account_id;
  if not exists (
    select 1 from public.dashboard_template_platforms tp
    where tp.template_id = v_template and tp.platform_id = v_platform
  ) then
    raise exception using errcode = 'P0001', message = 'dashboard:source_platform', hint = 'Essa conta não é de uma plataforma deste dashboard.';
  end if;
  return new;
end;
$$;
create trigger dashboard_sources_check
  before insert or update on public.dashboard_sources
  for each row execute function private.check_dashboard_source();

-- ---- RLS ---------------------------------------------------------------------------------------

alter table public.dashboards enable row level security;
alter table public.dashboard_pages enable row level security;
alter table public.dashboard_sources enable row level security;
alter table public.share_links enable row level security;
alter table public.scheduled_reports enable row level security;
alter table public.scheduled_report_recipients enable row level security;
alter table public.report_deliveries enable row level security;
alter table public.dashboard_exports enable row level security;

-- dashboards: membros leem; member+ cria, edita e apaga
create policy "dashboards: membros leem" on public.dashboards
  for select to authenticated using (workspace_id in (select private.workspace_ids()));
create policy "dashboards: member cria" on public.dashboards
  for insert to authenticated
  with check (workspace_id in (select private.workspace_ids('member')) and created_by = (select auth.uid()));
create policy "dashboards: member edita" on public.dashboards
  for update to authenticated
  using (workspace_id in (select private.workspace_ids('member')))
  with check (workspace_id in (select private.workspace_ids('member')));
create policy "dashboards: member apaga" on public.dashboards
  for delete to authenticated using (workspace_id in (select private.workspace_ids('member')));
grant select, delete on public.dashboards to authenticated;
grant insert (workspace_id, template_id, name, client_name, goal_cents, margin, monthly_budget_cents, period, custom_days, attribution, currency, brand_color, brand_logo_path, hide_vyz_brand, created_by)
  on public.dashboards to authenticated;
grant update (name, client_name, goal_cents, margin, monthly_budget_cents, period, custom_days, attribution, brand_color, brand_logo_path, hide_vyz_brand)
  on public.dashboards to authenticated;

create policy "dashboard_pages: membros leem" on public.dashboard_pages
  for select to authenticated using (workspace_id in (select private.workspace_ids()));
create policy "dashboard_pages: member edita" on public.dashboard_pages
  for all to authenticated
  using (workspace_id in (select private.workspace_ids('member')))
  with check (workspace_id in (select private.workspace_ids('member')));
grant select, insert, update, delete on public.dashboard_pages to authenticated;

create policy "dashboard_sources: membros leem" on public.dashboard_sources
  for select to authenticated using (workspace_id in (select private.workspace_ids()));
create policy "dashboard_sources: member edita" on public.dashboard_sources
  for all to authenticated
  using (workspace_id in (select private.workspace_ids('member')))
  with check (workspace_id in (select private.workspace_ids('member')));
grant select, insert, delete on public.dashboard_sources to authenticated;

-- links: membros veem e criam; quem criou ou admin revoga
create policy "share_links: membros leem" on public.share_links
  for select to authenticated using (workspace_id in (select private.workspace_ids()));
create policy "share_links: member cria" on public.share_links
  for insert to authenticated
  with check (workspace_id in (select private.workspace_ids('member')) and created_by = (select auth.uid()));
create policy "share_links: autor ou admin revoga" on public.share_links
  for update to authenticated
  using (created_by = (select auth.uid()) or workspace_id in (select private.workspace_ids('admin')))
  with check (workspace_id in (select private.workspace_ids('member')));
grant select on public.share_links to authenticated;
grant insert (workspace_id, dashboard_id, token_hash, token_hint, hide_spend, expires_at, created_by) on public.share_links to authenticated;
grant update (revoked_at, expires_at) on public.share_links to authenticated;

create policy "scheduled_reports: membros leem" on public.scheduled_reports
  for select to authenticated using (workspace_id in (select private.workspace_ids()));
create policy "scheduled_reports: member cria" on public.scheduled_reports
  for insert to authenticated
  with check (workspace_id in (select private.workspace_ids('member')) and created_by = (select auth.uid()));
create policy "scheduled_reports: member edita" on public.scheduled_reports
  for update to authenticated
  using (workspace_id in (select private.workspace_ids('member')))
  with check (workspace_id in (select private.workspace_ids('member')));
create policy "scheduled_reports: member apaga" on public.scheduled_reports
  for delete to authenticated using (workspace_id in (select private.workspace_ids('member')));
grant select, delete on public.scheduled_reports to authenticated;
grant insert (workspace_id, dashboard_id, frequency, weekday, month_day, format, send_hour, timezone, is_active, next_run_at, created_by)
  on public.scheduled_reports to authenticated;
grant update (frequency, weekday, month_day, format, send_hour, timezone, is_active, next_run_at) on public.scheduled_reports to authenticated;

create policy "scheduled_report_recipients: membros leem" on public.scheduled_report_recipients
  for select to authenticated using (workspace_id in (select private.workspace_ids()));
create policy "scheduled_report_recipients: member edita" on public.scheduled_report_recipients
  for all to authenticated
  using (workspace_id in (select private.workspace_ids('member')))
  with check (workspace_id in (select private.workspace_ids('member')));
grant select, insert, delete on public.scheduled_report_recipients to authenticated;

create policy "report_deliveries: membros leem" on public.report_deliveries
  for select to authenticated using (workspace_id in (select private.workspace_ids()));
grant select on public.report_deliveries to authenticated;

create policy "dashboard_exports: membros leem" on public.dashboard_exports
  for select to authenticated using (workspace_id in (select private.workspace_ids()));
create policy "dashboard_exports: member registra" on public.dashboard_exports
  for insert to authenticated
  with check (workspace_id in (select private.workspace_ids('member')) and created_by = (select auth.uid()));
grant select on public.dashboard_exports to authenticated;
grant insert (workspace_id, dashboard_id, dashboard_name, kind, storage_path, created_by) on public.dashboard_exports to authenticated;

-- ---- funções (com o RLS de quem chama) -------------------------------------------------------------

-- Cria o dashboard com páginas e contas numa transação. Sem p_page_type_ids,
-- usa as páginas padrão do template.
-- p_settings: {goal_cents?, margin?, monthly_budget_cents?, period?, custom_days?, attribution?}
create function public.create_dashboard(
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

  v_pages := coalesce(
    p_page_type_ids,
    array(select tp.page_type_id from public.dashboard_template_pages tp where tp.template_id = p_template_id order by tp.position)
  );
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

-- Troca as páginas (e a ordem) de um dashboard numa transação.
create function public.set_dashboard_pages(p_dashboard_id uuid, p_page_type_ids text[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_ws uuid;
begin
  select d.workspace_id into v_ws from public.dashboards d where d.id = p_dashboard_id;
  if v_ws is null then
    raise exception using errcode = 'P0001', message = 'dashboard:not_found';
  end if;
  if coalesce(array_length(p_page_type_ids, 1), 0) = 0 then
    raise exception using errcode = 'P0001', message = 'dashboard:no_pages';
  end if;
  delete from public.dashboard_pages where dashboard_id = p_dashboard_id;
  insert into public.dashboard_pages (workspace_id, dashboard_id, page_type_id, position)
  select v_ws, p_dashboard_id, t.page_type_id, (t.ord - 1)::smallint
  from unnest(p_page_type_ids) with ordinality as t (page_type_id, ord);
end;
$$;
revoke all on function public.set_dashboard_pages(uuid, text[]) from public, anon;
grant execute on function public.set_dashboard_pages(uuid, text[]) to authenticated, service_role;

-- Troca as contas de origem de um dashboard numa transação.
create function public.set_dashboard_sources(p_dashboard_id uuid, p_ad_account_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_ws uuid;
begin
  select d.workspace_id into v_ws from public.dashboards d where d.id = p_dashboard_id;
  if v_ws is null then
    raise exception using errcode = 'P0001', message = 'dashboard:not_found';
  end if;
  delete from public.dashboard_sources
    where dashboard_id = p_dashboard_id and not (ad_account_id = any (coalesce(p_ad_account_ids, '{}')));
  insert into public.dashboard_sources (workspace_id, dashboard_id, ad_account_id)
  select v_ws, p_dashboard_id, a.id
  from unnest(coalesce(p_ad_account_ids, '{}')) as a (id)
  on conflict do nothing;
end;
$$;
revoke all on function public.set_dashboard_sources(uuid, uuid[]) from public, anon;
grant execute on function public.set_dashboard_sources(uuid, uuid[]) to authenticated, service_role;
