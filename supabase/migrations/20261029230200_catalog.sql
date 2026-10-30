-- =============================================================================
-- VYZ · 02 · Catálogo
-- Planos, limites, preços, itens avulsos, plataformas, tipos de negócio e
-- templates. A fonte de verdade é o código (src/features/pricing,
-- src/features/accounts/platforms.ts, src/features/templates); o banco recebe
-- uma cópia com `npm run db:catalog` para ter FKs e aplicar limites.
-- Leitura pública (a LP mostra os mesmos dados); escrita só pelo service_role.
-- =============================================================================

-- ---- planos -----------------------------------------------------------------

create table public.plans (
  id text primary key check (id ~ '^[a-z][a-z0-9_]*$'),
  name text not null,
  rank smallint not null unique,
  self_serve boolean not null default true,
  is_active boolean not null default true,
  stripe_product_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.plans is 'Planos (Base, Pro, Avançado, Personalizado). rank ordena do menor para o maior.';
comment on column public.plans.self_serve is 'false = contratação pelo time (ex.: Personalizado).';

create table public.plan_entitlements (
  plan_id text primary key references public.plans (id) on delete cascade,
  dashboard_templates smallint not null check (dashboard_templates >= 0),
  landing_templates smallint not null check (landing_templates >= 0),
  platforms text not null check (platforms in ('core', 'all')),
  pages_plan_id text not null references public.plans (id),
  white_label boolean not null,
  audio text not null check (audio in ('none', 'soon')),
  custom_dashboards boolean not null,
  agent_chat boolean not null,
  agent_voice boolean not null,
  max_dashboards integer not null check (max_dashboards >= 0),
  max_landing_pages integer not null check (max_landing_pages >= 0),
  updated_at timestamptz not null default now()
);
comment on table public.plan_entitlements is 'Limites e recursos por plano. Espelho de ENTITLEMENTS (src/features/pricing/entitlements.ts).';
comment on column public.plan_entitlements.platforms is 'core = Meta Ads, Google Ads e GA4; all = todas.';
comment on column public.plan_entitlements.pages_plan_id is 'Páginas de dashboard liberadas até este plano.';

create table public.plan_prices (
  id text primary key,
  plan_id text not null references public.plans (id) on delete cascade,
  interval public.billing_interval not null,
  currency text not null default 'BRL' check (currency ~ '^[A-Z]{3}$'),
  first_account_cents bigint not null check (first_account_cents >= 0),
  extra_account_cents bigint not null check (extra_account_cents >= 0),
  addon_cents bigint not null default 0 check (addon_cents >= 0),
  stripe_price_id text unique,
  stripe_addon_price_id text unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, interval, currency)
);
comment on table public.plan_prices is 'Preço por plano e período. Valores por mês (no anual, a cobrança é 12×).';
comment on column public.plan_prices.addon_cents is 'Adicional fixo por mês, sem desconto no anual (análise por áudio do Avançado).';
comment on column public.plan_prices.stripe_price_id is 'Preço graduado na Stripe: 1ª conta + contas extras.';

create table public.billing_items (
  id text primary key check (id ~ '^[a-z][a-z0-9_]*$'),
  name text not null,
  kind text not null check (kind in ('one_time', 'recurring')),
  unit_cents bigint not null check (unit_cents >= 0),
  currency text not null default 'BRL' check (currency ~ '^[A-Z]{3}$'),
  stripe_price_id text unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.billing_items is 'Itens fora do plano: LP feita pelo time, hospedagem da LP, dashboards sob medida e adicionais.';

-- ---- plataformas e negócios ---------------------------------------------------

create table public.platforms (
  id text primary key check (id ~ '^[a-z][a-z0-9_]*$'),
  name text not null,
  short_name text not null,
  kind text not null check (kind in ('ads', 'analytics', 'crm')),
  min_plan_id text not null references public.plans (id),
  oauth_provider public.integration_provider,
  connect_available boolean not null default false,
  sort smallint not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.platforms is 'Plataformas conectáveis. Espelho de PLATFORMS (src/features/accounts/platforms.ts).';
comment on column public.platforms.oauth_provider is 'Login usado para conectar (meta ou google). null = só cadastro manual.';
comment on column public.platforms.connect_available is 'true = conexão por OAuth pronta no produto.';

create table public.business_types (
  id text primary key check (id ~ '^[a-z][a-z0-9_]*$'),
  name text not null,
  description text not null default '',
  profile text not null,
  sort smallint not null default 0,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.business_types is 'Tipos de negócio do onboarding (passo 1).';
comment on column public.business_types.profile is 'Perfil de métricas (Profile em src/features/metrics/definitions.ts).';
comment on column public.business_types.is_available is 'false = aparece como "em breve" no onboarding.';

-- ---- templates de dashboard -----------------------------------------------------

create table public.dashboard_page_types (
  id text primary key check (id ~ '^[a-z][a-z0-9-]*$'),
  name text not null,
  description text not null default '',
  min_plan_id text not null references public.plans (id),
  template_only boolean not null default false,
  is_soon boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.dashboard_page_types is 'Páginas que um dashboard pode ter. Espelho de PAGES (src/features/templates/pages.ts).';

create table public.dashboard_templates (
  id text primary key check (id ~ '^[a-z][a-z0-9-]*$'),
  name text not null,
  description text not null default '',
  category text not null,
  profile text not null,
  min_plan_id text not null references public.plans (id),
  data_mode text not null default 'sample' check (data_mode in ('sample', 'live')),
  sort smallint not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.dashboard_templates is 'Templates de dashboard. Espelho de DASHBOARD_TEMPLATES e LIVE_TEMPLATES no código.';
comment on column public.dashboard_templates.data_mode is 'live = lê os dados sincronizados das contas; sample = dados de exemplo.';

create table public.dashboard_template_platforms (
  template_id text not null references public.dashboard_templates (id) on delete cascade,
  platform_id text not null references public.platforms (id),
  primary key (template_id, platform_id)
);
comment on table public.dashboard_template_platforms is 'Plataformas que alimentam cada template.';

create table public.dashboard_template_pages (
  template_id text not null references public.dashboard_templates (id) on delete cascade,
  page_type_id text not null references public.dashboard_page_types (id),
  position smallint not null check (position >= 0),
  primary key (template_id, page_type_id),
  unique (template_id, position)
);
comment on table public.dashboard_template_pages is 'Páginas padrão de cada template, na ordem.';

create table public.dashboard_template_business_types (
  template_id text not null references public.dashboard_templates (id) on delete cascade,
  business_type_id text not null references public.business_types (id),
  primary key (template_id, business_type_id)
);
comment on table public.dashboard_template_business_types is 'Tipos de negócio indicados para cada template (filtro do onboarding).';

create index dashboard_template_platforms_platform_idx on public.dashboard_template_platforms (platform_id);
create index dashboard_template_pages_page_idx on public.dashboard_template_pages (page_type_id);
create index dashboard_template_business_types_business_idx on public.dashboard_template_business_types (business_type_id);

-- ---- templates de landing page ----------------------------------------------------

create table public.landing_templates (
  id text primary key check (id ~ '^[a-z][a-z0-9-]*$'),
  name text not null,
  description text not null default '',
  category text not null,
  min_plan_id text not null references public.plans (id),
  sort smallint not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.landing_templates is 'Templates de landing page. Espelho de LANDING_TEMPLATES (src/features/templates/landing-pages.ts).';

-- ---- índices das FKs -------------------------------------------------------------

create index plan_entitlements_pages_plan_idx on public.plan_entitlements (pages_plan_id);
create index platforms_min_plan_idx on public.platforms (min_plan_id);
create index dashboard_page_types_min_plan_idx on public.dashboard_page_types (min_plan_id);
create index dashboard_templates_min_plan_idx on public.dashboard_templates (min_plan_id);
create index landing_templates_min_plan_idx on public.landing_templates (min_plan_id);

-- ---- updated_at -------------------------------------------------------------------

create trigger plans_touch before update on public.plans for each row execute function private.touch_updated_at();
create trigger plan_entitlements_touch before update on public.plan_entitlements for each row execute function private.touch_updated_at();
create trigger plan_prices_touch before update on public.plan_prices for each row execute function private.touch_updated_at();
create trigger billing_items_touch before update on public.billing_items for each row execute function private.touch_updated_at();
create trigger platforms_touch before update on public.platforms for each row execute function private.touch_updated_at();
create trigger business_types_touch before update on public.business_types for each row execute function private.touch_updated_at();
create trigger dashboard_page_types_touch before update on public.dashboard_page_types for each row execute function private.touch_updated_at();
create trigger dashboard_templates_touch before update on public.dashboard_templates for each row execute function private.touch_updated_at();
create trigger landing_templates_touch before update on public.landing_templates for each row execute function private.touch_updated_at();

-- ---- acesso: leitura pública, escrita só service_role -------------------------------

alter table public.plans enable row level security;
alter table public.plan_entitlements enable row level security;
alter table public.plan_prices enable row level security;
alter table public.billing_items enable row level security;
alter table public.platforms enable row level security;
alter table public.business_types enable row level security;
alter table public.dashboard_page_types enable row level security;
alter table public.dashboard_templates enable row level security;
alter table public.dashboard_template_platforms enable row level security;
alter table public.dashboard_template_pages enable row level security;
alter table public.dashboard_template_business_types enable row level security;
alter table public.landing_templates enable row level security;

create policy "catalogo: leitura publica" on public.plans for select to anon, authenticated using (true);
create policy "catalogo: leitura publica" on public.plan_entitlements for select to anon, authenticated using (true);
create policy "catalogo: leitura publica" on public.plan_prices for select to anon, authenticated using (true);
create policy "catalogo: leitura publica" on public.billing_items for select to anon, authenticated using (true);
create policy "catalogo: leitura publica" on public.platforms for select to anon, authenticated using (true);
create policy "catalogo: leitura publica" on public.business_types for select to anon, authenticated using (true);
create policy "catalogo: leitura publica" on public.dashboard_page_types for select to anon, authenticated using (true);
create policy "catalogo: leitura publica" on public.dashboard_templates for select to anon, authenticated using (true);
create policy "catalogo: leitura publica" on public.dashboard_template_platforms for select to anon, authenticated using (true);
create policy "catalogo: leitura publica" on public.dashboard_template_pages for select to anon, authenticated using (true);
create policy "catalogo: leitura publica" on public.dashboard_template_business_types for select to anon, authenticated using (true);
create policy "catalogo: leitura publica" on public.landing_templates for select to anon, authenticated using (true);

grant select on
  public.plans,
  public.plan_entitlements,
  public.plan_prices,
  public.billing_items,
  public.platforms,
  public.business_types,
  public.dashboard_page_types,
  public.dashboard_templates,
  public.dashboard_template_platforms,
  public.dashboard_template_pages,
  public.dashboard_template_business_types,
  public.landing_templates
to anon, authenticated;
