-- =============================================================================
-- VYZ · 06 · Métricas (armazém)
-- Dados sincronizados das contas de anúncio: entidades (campanhas, anúncios,
-- produtos) e fatos diários. A granularidade mínima é o dia; os dashboards
-- somam períodos a partir daqui e nunca chamam as APIs das plataformas.
--
-- Desempenho:
--   * insights_account_daily é o total por conta e dia (rollup), recalculado
--     pelo banco ao fim de cada sincronização: KPIs e séries leem ~30 linhas.
--   * Toda leitura filtra por (ad_account_id, date): há índice para isso.
--   * Escrita só pelo service_role (sincronização), em lote; sem gatilhos
--     de auditoria aqui (volume alto).
-- Valores monetários na moeda da conta (ad_accounts.currency).
-- =============================================================================

-- ---- entidades -----------------------------------------------------------------------

create table public.ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  ad_account_id uuid not null,
  external_id text not null,
  name text not null,
  status text not null default 'active' check (status in ('active', 'paused', 'archived', 'removed')),
  objective text,
  channel text check (channel in ('search', 'performance_max', 'shopping', 'display', 'video', 'demand_gen', 'app')),
  funnel_stage text check (funnel_stage in ('prospecting', 'retargeting', 'retention')),
  daily_budget numeric(18, 4) check (daily_budget >= 0),
  started_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ad_account_id, external_id),
  unique (workspace_id, ad_account_id, id),
  foreign key (workspace_id, ad_account_id) references public.ad_accounts (workspace_id, id) on delete cascade
);
comment on table public.ad_campaigns is 'Campanhas sincronizadas. channel = tipo de campanha do Google Ads; funnel_stage = etapa (prospecção, remarketing).';
create index ad_campaigns_account_idx on public.ad_campaigns (workspace_id, ad_account_id);

create table public.ads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  ad_account_id uuid not null,
  campaign_id uuid not null,
  external_id text not null,
  name text not null,
  format text not null default 'image' check (format in ('image', 'video', 'carousel', 'collection', 'text', 'shopping', 'responsive')),
  status text not null default 'active' check (status in ('active', 'paused', 'archived', 'removed')),
  headline text,
  body text,
  call_to_action text,
  thumbnail_url text,
  landing_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ad_account_id, external_id),
  unique (workspace_id, ad_account_id, id),
  foreign key (workspace_id, ad_account_id, campaign_id) references public.ad_campaigns (workspace_id, ad_account_id, id) on delete cascade
);
comment on table public.ads is 'Anúncios (e seus criativos) sincronizados.';
create index ads_campaign_idx on public.ads (workspace_id, ad_account_id, campaign_id);

create table public.ad_products (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  ad_account_id uuid not null,
  external_id text not null,
  title text not null,
  brand text,
  category text,
  image_url text,
  price numeric(18, 4) check (price >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ad_account_id, external_id),
  unique (workspace_id, ad_account_id, id),
  foreign key (workspace_id, ad_account_id) references public.ad_accounts (workspace_id, id) on delete cascade
);
comment on table public.ad_products is 'Produtos do catálogo vistos nos anúncios (Shopping, Performance Max, catálogo do Meta).';
create index ad_products_account_idx on public.ad_products (workspace_id, ad_account_id);

-- ---- fatos diários ----------------------------------------------------------------------

-- Colunas de métrica (as mesmas em todos os fatos, quando fazem sentido):
--   spend, impressions, reach, clicks, link_clicks, landing_page_views,
--   add_to_cart, initiate_checkout, conversions, conversion_value,
--   video_views (3 s), video_thruplays, search_impression_share (0–1),
--   search_lost_is_budget, search_lost_is_rank.

create table public.insights_account_daily (
  workspace_id uuid not null,
  ad_account_id uuid not null,
  date date not null,
  spend numeric(18, 4) not null default 0 check (spend >= 0),
  impressions bigint not null default 0 check (impressions >= 0),
  reach bigint check (reach >= 0),
  clicks bigint not null default 0 check (clicks >= 0),
  link_clicks bigint check (link_clicks >= 0),
  landing_page_views bigint check (landing_page_views >= 0),
  add_to_cart numeric(14, 2) check (add_to_cart >= 0),
  initiate_checkout numeric(14, 2) check (initiate_checkout >= 0),
  conversions numeric(14, 2) not null default 0 check (conversions >= 0),
  conversion_value numeric(18, 4) not null default 0 check (conversion_value >= 0),
  video_views bigint check (video_views >= 0),
  video_thruplays bigint check (video_thruplays >= 0),
  search_impression_share numeric(7, 6) check (search_impression_share between 0 and 1),
  search_lost_is_budget numeric(7, 6) check (search_lost_is_budget between 0 and 1),
  search_lost_is_rank numeric(7, 6) check (search_lost_is_rank between 0 and 1),
  synced_at timestamptz not null default now(),
  primary key (ad_account_id, date),
  foreign key (workspace_id, ad_account_id) references public.ad_accounts (workspace_id, id) on delete cascade
);
comment on table public.insights_account_daily is 'Total por conta e dia (rollup de insights_campaign_daily, por public.rollup_account_insights). Fonte dos KPIs e das séries.';
create index insights_account_daily_workspace_idx on public.insights_account_daily (workspace_id, date);

create table public.insights_campaign_daily (
  workspace_id uuid not null,
  ad_account_id uuid not null,
  campaign_id uuid not null,
  date date not null,
  spend numeric(18, 4) not null default 0 check (spend >= 0),
  impressions bigint not null default 0 check (impressions >= 0),
  reach bigint check (reach >= 0),
  clicks bigint not null default 0 check (clicks >= 0),
  link_clicks bigint check (link_clicks >= 0),
  landing_page_views bigint check (landing_page_views >= 0),
  add_to_cart numeric(14, 2) check (add_to_cart >= 0),
  initiate_checkout numeric(14, 2) check (initiate_checkout >= 0),
  conversions numeric(14, 2) not null default 0 check (conversions >= 0),
  conversion_value numeric(18, 4) not null default 0 check (conversion_value >= 0),
  video_views bigint check (video_views >= 0),
  video_thruplays bigint check (video_thruplays >= 0),
  search_impression_share numeric(7, 6) check (search_impression_share between 0 and 1),
  search_lost_is_budget numeric(7, 6) check (search_lost_is_budget between 0 and 1),
  search_lost_is_rank numeric(7, 6) check (search_lost_is_rank between 0 and 1),
  synced_at timestamptz not null default now(),
  primary key (campaign_id, date),
  foreign key (workspace_id, ad_account_id, campaign_id) references public.ad_campaigns (workspace_id, ad_account_id, id) on delete cascade
);
comment on table public.insights_campaign_daily is 'Métricas por campanha e dia.';
create index insights_campaign_daily_account_idx on public.insights_campaign_daily (ad_account_id, date);
create index insights_campaign_daily_fk_idx on public.insights_campaign_daily (workspace_id, ad_account_id, campaign_id);

create table public.insights_ad_daily (
  workspace_id uuid not null,
  ad_account_id uuid not null,
  ad_id uuid not null,
  date date not null,
  spend numeric(18, 4) not null default 0 check (spend >= 0),
  impressions bigint not null default 0 check (impressions >= 0),
  reach bigint check (reach >= 0),
  clicks bigint not null default 0 check (clicks >= 0),
  link_clicks bigint check (link_clicks >= 0),
  conversions numeric(14, 2) not null default 0 check (conversions >= 0),
  conversion_value numeric(18, 4) not null default 0 check (conversion_value >= 0),
  video_views bigint check (video_views >= 0),
  video_thruplays bigint check (video_thruplays >= 0),
  synced_at timestamptz not null default now(),
  primary key (ad_id, date),
  foreign key (workspace_id, ad_account_id, ad_id) references public.ads (workspace_id, ad_account_id, id) on delete cascade
);
comment on table public.insights_ad_daily is 'Métricas por anúncio e dia (ranking de criativos).';
create index insights_ad_daily_account_idx on public.insights_ad_daily (ad_account_id, date);
create index insights_ad_daily_fk_idx on public.insights_ad_daily (workspace_id, ad_account_id, ad_id);

create table public.insights_breakdown_daily (
  workspace_id uuid not null,
  ad_account_id uuid not null,
  date date not null,
  dimension text not null check (dimension in ('age', 'gender', 'age_gender', 'placement', 'device', 'region', 'hour')),
  value text not null check (char_length(value) between 1 and 64),
  spend numeric(18, 4) not null default 0 check (spend >= 0),
  impressions bigint not null default 0 check (impressions >= 0),
  clicks bigint not null default 0 check (clicks >= 0),
  conversions numeric(14, 2) not null default 0 check (conversions >= 0),
  conversion_value numeric(18, 4) not null default 0 check (conversion_value >= 0),
  synced_at timestamptz not null default now(),
  primary key (ad_account_id, date, dimension, value),
  foreign key (workspace_id, ad_account_id) references public.ad_accounts (workspace_id, id) on delete cascade
);
comment on table public.insights_breakdown_daily is 'Métricas da conta por dia, quebradas por público (idade, gênero), posicionamento, dispositivo, região e hora.';
create index insights_breakdown_daily_fk_idx on public.insights_breakdown_daily (workspace_id, ad_account_id);

create table public.insights_search_term_daily (
  workspace_id uuid not null,
  ad_account_id uuid not null,
  campaign_id uuid not null,
  date date not null,
  search_term text not null check (char_length(search_term) between 1 and 300),
  match_type text not null default 'broad' check (match_type in ('exact', 'phrase', 'broad', 'near_exact', 'near_phrase', 'unknown')),
  impressions bigint not null default 0 check (impressions >= 0),
  clicks bigint not null default 0 check (clicks >= 0),
  spend numeric(18, 4) not null default 0 check (spend >= 0),
  conversions numeric(14, 2) not null default 0 check (conversions >= 0),
  conversion_value numeric(18, 4) not null default 0 check (conversion_value >= 0),
  synced_at timestamptz not null default now(),
  primary key (campaign_id, date, search_term, match_type),
  foreign key (workspace_id, ad_account_id, campaign_id) references public.ad_campaigns (workspace_id, ad_account_id, id) on delete cascade
);
comment on table public.insights_search_term_daily is 'Termos de pesquisa do Google Ads por campanha e dia.';
create index insights_search_term_daily_account_idx on public.insights_search_term_daily (ad_account_id, date);
create index insights_search_term_daily_fk_idx on public.insights_search_term_daily (workspace_id, ad_account_id, campaign_id);

create table public.insights_product_daily (
  workspace_id uuid not null,
  ad_account_id uuid not null,
  product_id uuid not null,
  date date not null,
  impressions bigint not null default 0 check (impressions >= 0),
  clicks bigint not null default 0 check (clicks >= 0),
  spend numeric(18, 4) not null default 0 check (spend >= 0),
  conversions numeric(14, 2) not null default 0 check (conversions >= 0),
  conversion_value numeric(18, 4) not null default 0 check (conversion_value >= 0),
  synced_at timestamptz not null default now(),
  primary key (product_id, date),
  foreign key (workspace_id, ad_account_id, product_id) references public.ad_products (workspace_id, ad_account_id, id) on delete cascade
);
comment on table public.insights_product_daily is 'Métricas por produto e dia (Shopping, Performance Max, catálogo).';
create index insights_product_daily_account_idx on public.insights_product_daily (ad_account_id, date);
create index insights_product_daily_fk_idx on public.insights_product_daily (workspace_id, ad_account_id, product_id);

-- ---- gatilhos ---------------------------------------------------------------------------

create trigger ad_campaigns_touch before update on public.ad_campaigns for each row execute function private.touch_updated_at();
create trigger ads_touch before update on public.ads for each row execute function private.touch_updated_at();
create trigger ad_products_touch before update on public.ad_products for each row execute function private.touch_updated_at();

-- ---- RLS: membros leem; só a sincronização (service_role) escreve ---------------------------

alter table public.ad_campaigns enable row level security;
alter table public.ads enable row level security;
alter table public.ad_products enable row level security;
alter table public.insights_account_daily enable row level security;
alter table public.insights_campaign_daily enable row level security;
alter table public.insights_ad_daily enable row level security;
alter table public.insights_breakdown_daily enable row level security;
alter table public.insights_search_term_daily enable row level security;
alter table public.insights_product_daily enable row level security;

create policy "ad_campaigns: membros leem" on public.ad_campaigns for select to authenticated using (workspace_id in (select private.workspace_ids()));
create policy "ads: membros leem" on public.ads for select to authenticated using (workspace_id in (select private.workspace_ids()));
create policy "ad_products: membros leem" on public.ad_products for select to authenticated using (workspace_id in (select private.workspace_ids()));
create policy "insights_account_daily: membros leem" on public.insights_account_daily for select to authenticated using (workspace_id in (select private.workspace_ids()));
create policy "insights_campaign_daily: membros leem" on public.insights_campaign_daily for select to authenticated using (workspace_id in (select private.workspace_ids()));
create policy "insights_ad_daily: membros leem" on public.insights_ad_daily for select to authenticated using (workspace_id in (select private.workspace_ids()));
create policy "insights_breakdown_daily: membros leem" on public.insights_breakdown_daily for select to authenticated using (workspace_id in (select private.workspace_ids()));
create policy "insights_search_term_daily: membros leem" on public.insights_search_term_daily for select to authenticated using (workspace_id in (select private.workspace_ids()));
create policy "insights_product_daily: membros leem" on public.insights_product_daily for select to authenticated using (workspace_id in (select private.workspace_ids()));

grant select on
  public.ad_campaigns,
  public.ads,
  public.ad_products,
  public.insights_account_daily,
  public.insights_campaign_daily,
  public.insights_ad_daily,
  public.insights_breakdown_daily,
  public.insights_search_term_daily,
  public.insights_product_daily
to authenticated;

-- ---- rollup por conta e dia -----------------------------------------------------------------

-- Recalcula insights_account_daily de uma conta num intervalo, a partir das
-- campanhas. Parcela de impressões: média ponderada pelas impressões das
-- campanhas que têm o dado (Pesquisa). Só service_role.
create function public.rollup_account_insights(p_ad_account_id uuid, p_from date, p_to date)
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
      sum(c.reach) as reach,
      sum(c.clicks) as clicks,
      sum(c.link_clicks) as link_clicks,
      sum(c.landing_page_views) as landing_page_views,
      sum(c.add_to_cart) as add_to_cart,
      sum(c.initiate_checkout) as initiate_checkout,
      sum(c.conversions) as conversions,
      sum(c.conversion_value) as conversion_value,
      sum(c.video_views) as video_views,
      sum(c.video_thruplays) as video_thruplays,
      (sum(c.search_impression_share * c.impressions) filter (where c.search_impression_share is not null)
        / nullif(sum(c.impressions) filter (where c.search_impression_share is not null), 0))::numeric(7, 6) as search_impression_share,
      (sum(c.search_lost_is_budget * c.impressions) filter (where c.search_lost_is_budget is not null)
        / nullif(sum(c.impressions) filter (where c.search_lost_is_budget is not null), 0))::numeric(7, 6) as search_lost_is_budget,
      (sum(c.search_lost_is_rank * c.impressions) filter (where c.search_lost_is_rank is not null)
        / nullif(sum(c.impressions) filter (where c.search_lost_is_rank is not null), 0))::numeric(7, 6) as search_lost_is_rank
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
      reach = excluded.reach,
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
comment on function public.rollup_account_insights(uuid, date, date) is 'Recalcula o total por conta e dia. Chamada ao fim de cada sincronização. Só service_role.';
revoke all on function public.rollup_account_insights(uuid, date, date) from public, anon, authenticated;
grant execute on function public.rollup_account_insights(uuid, date, date) to service_role;
