-- =============================================================================
-- VYZ · 15 · Existência de link público (para o proxy responder 404 de verdade)
-- Com pré-renderização parcial, a página já respondeu 200 quando descobre que
-- o link não existe; o proxy pergunta antes. Revela só o que a página já
-- revela: se a LP publicada ou o link compartilhado existe.
-- =============================================================================

create function public.public_link_exists(p_kind text, p_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case p_kind
    when 'lp' then exists (select 1 from public.landing_pages l where l.slug = p_key and l.status = 'published')
    when 'share' then exists (select 1 from public.share_links s where s.token_hash = p_key)
    else false
  end;
$$;
comment on function public.public_link_exists(text, text) is 'true se a LP publicada (slug) ou o link compartilhado (sha256 do token) existe. Usada pelo proxy.';
revoke all on function public.public_link_exists(text, text) from public;
grant execute on function public.public_link_exists(text, text) to anon, authenticated, service_role;
