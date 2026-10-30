-- =============================================================================
-- VYZ · 03 · Identidade e workspaces
-- Perfis (1:1 com auth.users), workspaces (o "tenant": agência ou empresa),
-- membros com papel, convites e as plataformas escolhidas no onboarding.
-- =============================================================================

-- ---- perfis -------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  full_name text not null default '' check (char_length(full_name) <= 120),
  avatar_url text,
  phone text check (phone is null or phone ~ '^\+?[0-9]{10,15}$'),
  default_workspace_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is 'Dados do usuário. Criado por gatilho junto com auth.users; o e-mail é copiado de lá.';
comment on column public.profiles.default_workspace_id is 'Workspace aberto ao entrar.';
create index profiles_email_idx on public.profiles (lower(email));

-- ---- workspaces ---------------------------------------------------------------

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$'),
  business_type_id text references public.business_types (id),
  brand_color text not null default '#4B5320' check (brand_color ~ '^#[0-9A-Fa-f]{6}$'),
  brand_logo_path text,
  hide_vyz_brand boolean not null default false,
  timezone text not null default 'America/Sao_Paulo',
  currency text not null default 'BRL' check (currency ~ '^[A-Z]{3}$'),
  onboarding_step public.onboarding_step not null default 'business',
  onboarding_completed_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((onboarding_step = 'done') = (onboarding_completed_at is not null))
);
comment on table public.workspaces is 'Conta da agência ou empresa. Tudo (assinatura, contas, dashboards, LPs) pertence a um workspace.';
comment on column public.workspaces.brand_logo_path is 'Caminho no bucket brand-assets (<workspace_id>/...).';
comment on column public.workspaces.hide_vyz_brand is 'Marca própria: esconde a marca VYZ (só com white_label no plano).';
comment on column public.workspaces.onboarding_step is 'Passo atual do onboarding (negócio, plataformas, conexão, dashboard, concluído).';
create index workspaces_business_type_idx on public.workspaces (business_type_id);
create index workspaces_created_by_idx on public.workspaces (created_by);

alter table public.profiles
  add constraint profiles_default_workspace_fk foreign key (default_workspace_id) references public.workspaces (id) on delete set null;
create index profiles_default_workspace_idx on public.profiles (default_workspace_id);

-- ---- membros ------------------------------------------------------------------

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null default 'member',
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
comment on table public.workspace_members is 'Quem acessa cada workspace e com qual papel. Todo workspace tem ao menos um owner.';
create index workspace_members_user_idx on public.workspace_members (user_id);
create index workspace_members_invited_by_idx on public.workspace_members (invited_by);

-- ---- convites -----------------------------------------------------------------

create table public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role public.member_role not null default 'member' check (role <> 'owner'),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  invited_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
comment on table public.workspace_invitations is 'Convites para a equipe. Guarda só o hash (sha256) do token enviado por e-mail.';
create unique index workspace_invitations_pending_key on public.workspace_invitations (workspace_id, lower(email))
  where accepted_at is null and revoked_at is null;
create index workspace_invitations_invited_by_idx on public.workspace_invitations (invited_by);
create index workspace_invitations_accepted_by_idx on public.workspace_invitations (accepted_by);

-- ---- plataformas escolhidas ------------------------------------------------------

create table public.workspace_platforms (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  platform_id text not null references public.platforms (id),
  created_at timestamptz not null default now(),
  primary key (workspace_id, platform_id)
);
comment on table public.workspace_platforms is 'Plataformas que o workspace usa (passo 2 do onboarding).';
create index workspace_platforms_platform_idx on public.workspace_platforms (platform_id);

-- ---- helpers de RLS (private, security definer) -------------------------------------

-- Workspaces do usuário atual com papel >= min_role. Usar sempre como
-- `workspace_id in (select private.workspace_ids())`: roda uma vez por consulta.
create function private.workspace_ids(min_role public.member_role default 'viewer')
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.workspace_id
  from public.workspace_members m
  where m.user_id = (select auth.uid())
    and m.role >= min_role;
$$;
revoke all on function private.workspace_ids(public.member_role) from public;
grant execute on function private.workspace_ids(public.member_role) to authenticated, service_role;

-- Usuários que dividem algum workspace com o usuário atual (inclui ele mesmo).
create function private.co_member_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select distinct other.user_id
  from public.workspace_members me
  join public.workspace_members other on other.workspace_id = me.workspace_id
  where me.user_id = (select auth.uid());
$$;
revoke all on function private.co_member_ids() from public;
grant execute on function private.co_member_ids() to authenticated, service_role;

-- Slug único para um workspace novo ("Loja Verde" -> "loja-verde", "loja-verde-2"...).
create function private.unique_workspace_slug(base text)
returns text
language plpgsql
set search_path = ''
as $$
declare
  root text := private.slugify(base);
  candidate text := root;
  n integer := 1;
begin
  while exists (select 1 from public.workspaces w where w.slug = candidate) loop
    n := n + 1;
    candidate := rtrim(left(root, 40), '-') || '-' || n;
  end loop;
  return candidate;
end;
$$;

-- ---- gatilhos -------------------------------------------------------------------

-- Perfil nasce com o usuário (e-mail e senha, Google ou admin).
create function private.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, phone)
  values (
    new.id,
    coalesce(new.email, ''),
    left(coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), nullif(new.raw_user_meta_data ->> 'name', ''), ''), 120),
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    case when (new.raw_user_meta_data ->> 'phone') ~ '^\+?[0-9]{10,15}$' then new.raw_user_meta_data ->> 'phone' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_auth_user_created();

create function private.handle_auth_user_email_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = coalesce(new.email, '') where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function private.handle_auth_user_email_changed();

-- Todo workspace precisa de um owner. Não bloqueia quando o próprio workspace
-- ou o usuário estão sendo apagados (cascata).
create function private.guard_last_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role = 'owner'
     and (tg_op = 'DELETE' or new.role <> 'owner')
     and exists (select 1 from public.workspaces w where w.id = old.workspace_id)
     and exists (select 1 from auth.users u where u.id = old.user_id)
     and not exists (
       select 1 from public.workspace_members m
       where m.workspace_id = old.workspace_id and m.role = 'owner' and m.user_id <> old.user_id
     )
  then
    raise exception using errcode = 'P0001', message = 'workspace:last_owner', hint = 'Transfira a propriedade antes de sair.';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger workspace_members_guard_last_owner
  before update of role or delete on public.workspace_members
  for each row execute function private.guard_last_owner();

create trigger profiles_touch before update on public.profiles for each row execute function private.touch_updated_at();
create trigger workspaces_touch before update on public.workspaces for each row execute function private.touch_updated_at();
create trigger workspace_members_touch before update on public.workspace_members for each row execute function private.touch_updated_at();

-- ---- RLS -------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invitations enable row level security;
alter table public.workspace_platforms enable row level security;

-- perfis: o próprio e quem divide workspace
create policy "profiles: ler o proprio e da equipe" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or id in (select private.co_member_ids()));
create policy "profiles: editar o proprio" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    and (default_workspace_id is null or default_workspace_id in (select private.workspace_ids()))
  );
grant select on public.profiles to authenticated;
grant update (full_name, avatar_url, phone, default_workspace_id) on public.profiles to authenticated;

-- workspaces: membros leem; admin edita nome, marca e onboarding
create policy "workspaces: membros leem" on public.workspaces
  for select to authenticated
  using (id in (select private.workspace_ids()));
create policy "workspaces: admin edita" on public.workspaces
  for update to authenticated
  using (id in (select private.workspace_ids('admin')))
  with check (id in (select private.workspace_ids('admin')));
grant select on public.workspaces to authenticated;
grant update (name, business_type_id, brand_color, brand_logo_path, hide_vyz_brand, timezone, onboarding_step, onboarding_completed_at)
  on public.workspaces to authenticated;

-- membros: a equipe se vê; sair do workspace ou admin remover (owner só por owner)
create policy "workspace_members: equipe le" on public.workspace_members
  for select to authenticated
  using (workspace_id in (select private.workspace_ids()));
create policy "workspace_members: sair ou remover" on public.workspace_members
  for delete to authenticated
  using (
    user_id = (select auth.uid())
    or (role <> 'owner' and workspace_id in (select private.workspace_ids('admin')))
    or workspace_id in (select private.workspace_ids('owner'))
  );
grant select, delete on public.workspace_members to authenticated;

-- convites: admin cria, lista e revoga
create policy "workspace_invitations: admin le" on public.workspace_invitations
  for select to authenticated
  using (workspace_id in (select private.workspace_ids('admin')));
create policy "workspace_invitations: admin cria" on public.workspace_invitations
  for insert to authenticated
  with check (workspace_id in (select private.workspace_ids('admin')) and invited_by = (select auth.uid()));
create policy "workspace_invitations: admin revoga" on public.workspace_invitations
  for update to authenticated
  using (workspace_id in (select private.workspace_ids('admin')))
  with check (workspace_id in (select private.workspace_ids('admin')));
grant select on public.workspace_invitations to authenticated;
grant insert (workspace_id, email, role, token_hash, invited_by, expires_at) on public.workspace_invitations to authenticated;
grant update (revoked_at) on public.workspace_invitations to authenticated;

-- plataformas do workspace: membros leem; admin escolhe
create policy "workspace_platforms: membros leem" on public.workspace_platforms
  for select to authenticated
  using (workspace_id in (select private.workspace_ids()));
create policy "workspace_platforms: admin adiciona" on public.workspace_platforms
  for insert to authenticated
  with check (workspace_id in (select private.workspace_ids('admin')));
create policy "workspace_platforms: admin remove" on public.workspace_platforms
  for delete to authenticated
  using (workspace_id in (select private.workspace_ids('admin')));
grant select, insert, delete on public.workspace_platforms to authenticated;

-- ---- aceitar convite ---------------------------------------------------------------

-- O e-mail do convite precisa ser o do usuário logado. Retorna o workspace.
create function public.accept_workspace_invitation(p_token text)
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
