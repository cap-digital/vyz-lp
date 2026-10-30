-- =============================================================================
-- VYZ · 11 · Proteção e manutenção
--   rate_limits       limite de tentativas (login, cadastro, checkout, senha)
--   housekeeping()    limpeza diária (pg_cron): expira checkouts, apaga estados
--                     de OAuth e janelas vencidas, destrava sincronizações
--                     presas, cria partições futuras e apaga as vencidas
--   brand-assets      bucket de logos, escrita só por admin do workspace
-- =============================================================================

-- ---- limite de tentativas ------------------------------------------------------------

-- UNLOGGED: sem WAL (mais leve); se o banco reiniciar, as janelas zeram, o que
-- é aceitável para limite de tentativas.
create unlogged table public.rate_limits (
  bucket text not null check (char_length(bucket) between 3 and 200),
  window_start timestamptz not null,
  hits integer not null default 0 check (hits >= 0),
  primary key (bucket, window_start)
);
comment on table public.rate_limits is 'Contadores por janela de tempo (ex.: sign_in:ip:<hash>). Só service_role.';
alter table public.rate_limits enable row level security; -- sem políticas: só service_role

-- Conta uma tentativa e diz se ainda está dentro do limite.
create function public.rate_limit_hit(p_bucket text, p_window_seconds integer, p_max integer)
returns boolean
language sql
security definer
set search_path = ''
as $$
  insert into public.rate_limits as r (bucket, window_start, hits)
  values (
    p_bucket,
    to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds),
    1
  )
  on conflict (bucket, window_start) do update set hits = r.hits + 1
  returning hits <= p_max;
$$;
comment on function public.rate_limit_hit(text, integer, integer) is 'true = tentativa permitida. Só service_role.';
revoke all on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;

-- ---- manutenção diária -----------------------------------------------------------------

create function private.housekeeping()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expired_checkouts integer;
  v_oauth integer;
  v_rate integer;
  v_stuck integer;
  v_dropped integer := 0;
begin
  update public.checkout_sessions set status = 'expired'
    where status = 'open' and expires_at < now();
  get diagnostics v_expired_checkouts = row_count;

  delete from public.oauth_states where expires_at < now() - interval '1 day';
  get diagnostics v_oauth = row_count;

  delete from public.rate_limits where window_start < now() - interval '1 day';
  get diagnostics v_rate = row_count;

  update public.sync_runs
    set status = 'failed', error = coalesce(error, 'Tempo esgotado'), finished_at = now()
    where status in ('queued', 'running') and created_at < now() - interval '2 hours';
  get diagnostics v_stuck = row_count;

  perform private.ensure_monthly_partitions('public.audit_events'::regclass, 3);
  perform private.ensure_monthly_partitions('public.auth_events'::regclass, 3);
  perform private.ensure_monthly_partitions('public.activity_events'::regclass, 3);

  -- retenção: auditoria 5 anos (prazo fiscal), acessos 2 anos, atividade 13 meses
  v_dropped := v_dropped + private.drop_old_partitions('public.audit_events'::regclass, 60);
  v_dropped := v_dropped + private.drop_old_partitions('public.auth_events'::regclass, 24);
  v_dropped := v_dropped + private.drop_old_partitions('public.activity_events'::regclass, 13);

  return jsonb_build_object(
    'expired_checkouts', v_expired_checkouts,
    'oauth_states_deleted', v_oauth,
    'rate_limit_windows_deleted', v_rate,
    'stuck_syncs_failed', v_stuck,
    'partitions_dropped', v_dropped
  );
end;
$$;
comment on function private.housekeeping() is 'Limpeza diária do VYZ (pg_cron, 06:00 UTC).';

create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('vyz-housekeeping', '0 6 * * *', $cron$select private.housekeeping()$cron$);

-- ---- bucket de logos -------------------------------------------------------------------------

-- Público para leitura (o logo aparece no link compartilhado), escrita só de
-- admin na pasta do próprio workspace (<workspace_id>/arquivo). Sem SVG.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('brand-assets', 'brand-assets', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "brand-assets: membros listam a pasta do workspace" on storage.objects
  for select to authenticated
  using (bucket_id = 'brand-assets' and (storage.foldername(name))[1] in (select w::text from private.workspace_ids() as w));
create policy "brand-assets: admin envia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'brand-assets' and (storage.foldername(name))[1] in (select w::text from private.workspace_ids('admin') as w));
create policy "brand-assets: admin troca" on storage.objects
  for update to authenticated
  using (bucket_id = 'brand-assets' and (storage.foldername(name))[1] in (select w::text from private.workspace_ids('admin') as w))
  with check (bucket_id = 'brand-assets' and (storage.foldername(name))[1] in (select w::text from private.workspace_ids('admin') as w));
create policy "brand-assets: admin apaga" on storage.objects
  for delete to authenticated
  using (bucket_id = 'brand-assets' and (storage.foldername(name))[1] in (select w::text from private.workspace_ids('admin') as w));
