-- =============================================================================
-- VYZ · 14 · App nativo (iOS e Android)
--   credit_ledger        créditos do usuário (compras na loja via RevenueCat); saldo vale no app e no site
--   store_events         eventos do RevenueCat (idempotência: o mesmo evento credita uma vez)
--   push_tokens          tokens nativos (APNs no iOS, FCM no Android), enviados pelo nosso backend
--   prepare_account_deletion  exclusão de conta pedida no app (exigência da Apple)
-- =============================================================================

-- ---- créditos ----------------------------------------------------------------------------

create table public.credit_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  delta integer not null check (delta <> 0),
  reason text not null check (reason in ('purchase', 'refund', 'consumption', 'adjustment')),
  store text check (store in ('app_store', 'play_store', 'admin')),
  product_id text,
  store_transaction_id text unique,
  store_event_id text,
  created_at timestamptz not null default now()
);
comment on table public.credit_ledger is 'Lançamentos de créditos do usuário (só cresce). Saldo = soma de delta (view credit_balances).';
create index credit_ledger_user_idx on public.credit_ledger (user_id, created_at desc);

create view public.credit_balances
with (security_invoker = true)
as
select user_id, sum(delta)::integer as balance, max(created_at) as updated_at
from public.credit_ledger
group by user_id;
comment on view public.credit_balances is 'Saldo de créditos por usuário.';

alter table public.credit_ledger enable row level security;
create policy "credit_ledger: o proprio usuario le" on public.credit_ledger
  for select to authenticated using (user_id = (select auth.uid()));
grant select on public.credit_ledger, public.credit_balances to authenticated;
-- só cresce: nem o servidor altera ou apaga lançamentos
revoke update, delete, truncate on public.credit_ledger from service_role;

-- ---- eventos da loja ---------------------------------------------------------------------

create table public.store_events (
  id text primary key,
  type text not null,
  app_user_id text,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error text
);
comment on table public.store_events is 'Webhooks do RevenueCat recebidos (id do evento como chave). Só service_role.';
alter table public.store_events enable row level security; -- sem políticas: só service_role

-- Credita uma compra numa transação: grava o lançamento uma vez por transação da loja.
create function public.credit_store_purchase(
  p_event_id text,
  p_user_id uuid,
  p_store text,
  p_product_id text,
  p_transaction_id text,
  p_credits integer,
  p_reason text default 'purchase'
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_credits = 0 or p_transaction_id is null or p_reason not in ('purchase', 'refund') then
    raise exception using errcode = 'P0001', message = 'credits:invalid_purchase';
  end if;
  insert into public.credit_ledger (user_id, delta, reason, store, product_id, store_transaction_id, store_event_id)
  values (p_user_id, p_credits, p_reason, p_store, p_product_id,
          case when p_reason = 'refund' then 'refund:' || p_transaction_id else p_transaction_id end, p_event_id)
  on conflict (store_transaction_id) do nothing;
  update public.store_events set processed_at = now(), error = null where id = p_event_id;
  return found;
end;
$$;
revoke all on function public.credit_store_purchase(text, uuid, text, text, text, integer, text) from public, anon, authenticated;
grant execute on function public.credit_store_purchase(text, uuid, text, text, text, integer, text) to service_role;

-- ---- push --------------------------------------------------------------------------------

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  token text not null unique check (char_length(token) between 32 and 4096),
  app_version text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
comment on table public.push_tokens is 'Token nativo do aparelho (APNs no iOS, FCM no Android). O backend envia direto.';
create index push_tokens_user_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;
create policy "push_tokens: o proprio usuario le" on public.push_tokens
  for select to authenticated using (user_id = (select auth.uid()));
create policy "push_tokens: o proprio usuario remove" on public.push_tokens
  for delete to authenticated using (user_id = (select auth.uid()));
grant select, delete on public.push_tokens to authenticated;

-- ---- exclusão de conta -------------------------------------------------------------------

-- Prepara a exclusão do usuário: em cada workspace onde ele é o único dono,
-- passa a propriedade ao membro mais antigo (admin antes de member) ou, sem
-- equipe, encerra a assinatura (faturas e transações ficam, por obrigação
-- fiscal). Depois tira o usuário de todos os workspaces. O servidor então
-- apaga o usuário no Auth. Só service_role.
create function public.prepare_account_deletion(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  w record;
  v_heir uuid;
  v_transferred integer := 0;
  v_closed integer := 0;
begin
  for w in
    select m.workspace_id
    from public.workspace_members m
    where m.user_id = p_user_id and m.role = 'owner'
      and not exists (
        select 1 from public.workspace_members o
        where o.workspace_id = m.workspace_id and o.role = 'owner' and o.user_id <> p_user_id
      )
  loop
    select x.user_id into v_heir
    from public.workspace_members x
    where x.workspace_id = w.workspace_id and x.user_id <> p_user_id
    order by x.role desc, x.created_at
    limit 1;
    if v_heir is not null then
      update public.workspace_members set role = 'owner' where workspace_id = w.workspace_id and user_id = v_heir;
      v_transferred := v_transferred + 1;
    else
      update public.subscriptions
        set status = 'canceled', canceled_at = now(), ended_at = now()
        where workspace_id = w.workspace_id and status not in ('canceled', 'incomplete_expired');
      v_closed := v_closed + 1;
    end if;
  end loop;

  -- sem dono restante: o guard de último dono não se aplica a workspace sem outros membros
  delete from public.workspace_members m
  where m.user_id = p_user_id
    and (m.role <> 'owner' or exists (
      select 1 from public.workspace_members o where o.workspace_id = m.workspace_id and o.role = 'owner' and o.user_id <> p_user_id
    ));
  delete from public.push_tokens where user_id = p_user_id;
  return jsonb_build_object('transferred', v_transferred, 'closed', v_closed);
end;
$$;
revoke all on function public.prepare_account_deletion(uuid) from public, anon, authenticated;
grant execute on function public.prepare_account_deletion(uuid) to service_role;

-- O último dono de um workspace sem equipe e sem assinatura viva pode ser apagado
-- (guard_owner_user_delete já permite); a linha de membro sai em cascata.

-- auditoria
create trigger audit after insert or update or delete on public.push_tokens for each row execute function private.audit_row_change('-', 'id');
