-- =============================================================================
-- VYZ · 08 · Landing pages
-- Páginas (conteúdo e rastreamento), versões publicadas (histórico e volta
-- atrás) e os leads enviados pelos formulários.
-- =============================================================================

create table public.landing_pages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  template_id text not null references public.landing_templates (id),
  name text not null default '' check (char_length(name) <= 80),
  slug text not null unique check (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$'),
  content jsonb not null default '{}'::jsonb check (jsonb_typeof(content) = 'object'),
  gtm_container_id text check (gtm_container_id is null or gtm_container_id ~ '^GTM-[A-Z0-9]{6,8}$'),
  meta_pixel_id text check (meta_pixel_id is null or meta_pixel_id ~ '^[0-9]{15,16}$'),
  google_ads_conversion text check (google_ads_conversion is null or google_ads_conversion ~ '^AW-[0-9]{9,11}/[A-Za-z0-9_-]{4,}$'),
  ga4_measurement_id text check (ga4_measurement_id is null or ga4_measurement_id ~ '^G-[A-Z0-9]{6,12}$'),
  status public.landing_status not null default 'draft',
  published_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  check (status <> 'published' or published_at is not null)
);
comment on table public.landing_pages is 'Landing page: conteúdo (LandingContent em src/features/templates/landing-pages.ts) e IDs de rastreamento. O slug vira o subdomínio.';
create index landing_pages_workspace_idx on public.landing_pages (workspace_id, created_at desc);
create index landing_pages_template_idx on public.landing_pages (template_id);
create index landing_pages_created_by_idx on public.landing_pages (created_by);
create index landing_pages_published_idx on public.landing_pages (workspace_id) where status = 'published';

create table public.landing_page_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  landing_page_id uuid not null,
  version integer not null check (version >= 1),
  content jsonb not null,
  tracking jsonb not null default '{}'::jsonb,
  published_by uuid references auth.users (id) on delete set null,
  published_at timestamptz not null default now(),
  unique (landing_page_id, version),
  foreign key (workspace_id, landing_page_id) references public.landing_pages (workspace_id, id) on delete cascade
);
comment on table public.landing_page_versions is 'Cada publicação vira uma versão (gatilho). Permite ver o histórico e voltar atrás.';
create index landing_page_versions_fk_idx on public.landing_page_versions (workspace_id, landing_page_id);
create index landing_page_versions_published_by_idx on public.landing_page_versions (published_by);

create table public.landing_page_submissions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  landing_page_id uuid not null,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  utm jsonb not null default '{}'::jsonb,
  referrer text,
  ip inet,
  user_agent text,
  created_at timestamptz not null default now(),
  foreign key (workspace_id, landing_page_id) references public.landing_pages (workspace_id, id) on delete cascade
);
comment on table public.landing_page_submissions is 'Leads enviados pelos formulários das LPs publicadas (gravados pelo servidor).';
create index landing_page_submissions_fk_idx on public.landing_page_submissions (workspace_id, landing_page_id, created_at desc);

create trigger landing_pages_touch before update on public.landing_pages for each row execute function private.touch_updated_at();

-- Publicar (ou republicar) grava uma versão.
create function private.snapshot_landing_page_version()
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
      (select auth.uid()),
      coalesce(new.published_at, now())
    );
  end if;
  return new;
end;
$$;
create trigger landing_pages_snapshot
  after insert or update of status, published_at on public.landing_pages
  for each row execute function private.snapshot_landing_page_version();

alter table public.landing_pages enable row level security;
alter table public.landing_page_versions enable row level security;
alter table public.landing_page_submissions enable row level security;

create policy "landing_pages: membros leem" on public.landing_pages
  for select to authenticated using (workspace_id in (select private.workspace_ids()));
create policy "landing_pages: member cria" on public.landing_pages
  for insert to authenticated
  with check (workspace_id in (select private.workspace_ids('member')) and created_by = (select auth.uid()));
create policy "landing_pages: member edita" on public.landing_pages
  for update to authenticated
  using (workspace_id in (select private.workspace_ids('member')))
  with check (workspace_id in (select private.workspace_ids('member')));
create policy "landing_pages: member apaga" on public.landing_pages
  for delete to authenticated using (workspace_id in (select private.workspace_ids('member')));
grant select, delete on public.landing_pages to authenticated;
grant insert (workspace_id, template_id, name, slug, content, gtm_container_id, meta_pixel_id, google_ads_conversion, ga4_measurement_id, status, published_at, created_by)
  on public.landing_pages to authenticated;
grant update (name, slug, content, gtm_container_id, meta_pixel_id, google_ads_conversion, ga4_measurement_id, status, published_at)
  on public.landing_pages to authenticated;

create policy "landing_page_versions: membros leem" on public.landing_page_versions
  for select to authenticated using (workspace_id in (select private.workspace_ids()));
grant select on public.landing_page_versions to authenticated;

-- Leads têm dados pessoais: só admin lê.
create policy "landing_page_submissions: admin le" on public.landing_page_submissions
  for select to authenticated using (workspace_id in (select private.workspace_ids('admin')));
grant select on public.landing_page_submissions to authenticated;
