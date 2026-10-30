-- =============================================================================
-- VYZ · 13 · Cobrança: complementos
--   * CNPJ alfanumérico (Receita Federal, a partir de jul/2026)
--   * pagamento recusado antes de existir workspace também vira transação
--   * troca de plano atômica (assinatura, item do plano, fatura e transação)
--   * assinaturas simuladas renovam sozinhas (fatura + transação), como na Stripe
--   * linha do tempo: troca de período não conta como renovação
-- =============================================================================

-- ---- CNPJ alfanumérico ------------------------------------------------------------------------

-- CPF: 11 dígitos. CNPJ: 12 caracteres (dígitos ou letras maiúsculas) + 2 dígitos verificadores.
alter table public.checkout_sessions drop constraint if exists checkout_sessions_tax_id_check;
alter table public.checkout_sessions add constraint checkout_sessions_tax_id_check
  check (tax_id is null or tax_id ~ '^([0-9]{11}|[0-9A-Z]{12}[0-9]{2})$');
alter table public.billing_customers drop constraint if exists billing_customers_tax_id_check;
alter table public.billing_customers add constraint billing_customers_tax_id_check
  check (tax_id is null or tax_id ~ '^([0-9]{11}|[0-9A-Z]{12}[0-9]{2})$');
comment on column public.billing_customers.tax_id is 'CPF (11 dígitos) ou CNPJ (14, alfanumérico desde jul/2026), sem pontuação.';

-- ---- tentativa de pagamento antes do workspace -------------------------------------------------

-- Recusa no primeiro checkout (ainda sem workspace) fica ligada ao checkout.
alter table public.payment_transactions alter column workspace_id drop not null;
alter table public.payment_transactions drop constraint if exists payment_transactions_owner_check;
alter table public.payment_transactions add constraint payment_transactions_owner_check
  check (workspace_id is not null or checkout_session_id is not null);
comment on column public.payment_transactions.workspace_id is 'null só em tentativa recusada de um checkout que ainda não criou workspace (checkout_session_id preenchido).';

-- ---- troca de plano atômica ----------------------------------------------------------------------

-- Troca plano, período e contas da assinatura viva numa transação: confere o
-- preço no catálogo e se o uso cabe no plano novo, atualiza a assinatura e o
-- item do plano e, quando há cobrança proporcional, grava a fatura e a
-- transação. Devolve o id da fatura (ou null). Só service_role.
-- p_invoice: {provider_invoice_id?, description?, label, amount_cents} (null = sem cobrança)
-- p_payment: {provider_payment_id?, method?, card_brand?, card_last4?}
create or replace function public.change_subscription(
  p_subscription_id uuid,
  p_plan_id text,
  p_interval public.billing_interval,
  p_accounts integer,
  p_plan_amount_cents bigint,
  p_period_start timestamptz default null,
  p_period_end timestamptz default null,
  p_invoice jsonb default null,
  p_payment jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.subscriptions%rowtype;
  pp public.plan_prices%rowtype;
  e public.plan_entitlements%rowtype;
  v_price_id text := p_plan_id || '_' || p_interval;
  v_invoice uuid;
  v_amount bigint;
  v_billable integer;
  v_rank smallint;
begin
  select * into s from public.subscriptions where id = p_subscription_id for update;
  if not found or s.status not in ('active', 'trialing', 'past_due') then
    raise exception using errcode = 'P0001', message = 'plan:inactive';
  end if;
  if p_accounts is null or p_accounts < 1 or p_accounts > 30 then
    raise exception using errcode = 'P0001', message = 'checkout:invalid_order', hint = 'De 1 a 30 contas.';
  end if;

  select * into pp from public.plan_prices where id = v_price_id and is_active;
  if not found or pp.plan_id <> p_plan_id
     or p_plan_amount_cents <> pp.first_account_cents + pp.extra_account_cents * (p_accounts - 1) + pp.addon_cents then
    raise exception using errcode = 'P0001', message = 'checkout:invalid_order', hint = 'O valor do plano não confere com o catálogo.';
  end if;

  -- o uso precisa caber no plano novo (contas, dashboards, LPs e plataformas)
  perform pg_advisory_xact_lock(hashtextextended('vyz:ad_accounts:' || s.workspace_id::text, 0));
  select * into e from public.plan_entitlements where plan_id = p_plan_id;
  select p.rank into v_rank from public.plans p where p.id = p_plan_id;
  select count(distinct private.billable_unit(a.platform_id, a.external_id, a.business_external_id)) into v_billable
  from public.ad_accounts a where a.workspace_id = s.workspace_id and a.is_enabled;
  if v_billable > p_accounts then
    raise exception using errcode = 'P0001', message = 'limit:accounts_in_use',
      hint = format('Há %s contas ativas; o novo plano tem %s.', v_billable, p_accounts);
  end if;
  if (select count(*) from public.dashboards d where d.workspace_id = s.workspace_id) > e.max_dashboards then
    raise exception using errcode = 'P0001', message = 'limit:dashboards_in_use',
      hint = format('O novo plano permite até %s dashboards.', e.max_dashboards);
  end if;
  if (select count(*) from public.landing_pages l where l.workspace_id = s.workspace_id and l.status = 'published') > e.max_landing_pages then
    raise exception using errcode = 'P0001', message = 'limit:landing_pages_in_use',
      hint = format('O novo plano permite até %s landing pages publicadas.', e.max_landing_pages);
  end if;
  if exists (
    select 1 from public.ad_accounts a
    join public.platforms pl on pl.id = a.platform_id
    join public.plans mp on mp.id = pl.min_plan_id
    where a.workspace_id = s.workspace_id and a.is_enabled and mp.rank > v_rank
  ) then
    raise exception using errcode = 'P0001', message = 'plan:platform_in_use';
  end if;

  update public.subscriptions
     set plan_id = p_plan_id,
         interval = p_interval,
         accounts_quantity = p_accounts,
         current_period_start = coalesce(p_period_start, current_period_start),
         current_period_end = coalesce(p_period_end, current_period_end)
   where id = s.id;

  update public.subscription_items
     set plan_price_id = v_price_id, quantity = p_accounts, amount_cents = p_plan_amount_cents
   where subscription_id = s.id and plan_price_id is not null;
  if not found then
    insert into public.subscription_items (workspace_id, subscription_id, plan_price_id, quantity, amount_cents)
    values (s.workspace_id, s.id, v_price_id, p_accounts, p_plan_amount_cents);
  end if;

  if p_invoice is not null then
    v_amount := (p_invoice ->> 'amount_cents')::bigint;
    if v_amount is null or v_amount <= 0 then
      raise exception using errcode = 'P0001', message = 'checkout:invalid_order', hint = 'Valor da cobrança inválido.';
    end if;
    insert into public.invoices (
      workspace_id, subscription_id, provider, provider_invoice_id, status, currency,
      subtotal_cents, total_cents, amount_paid_cents, description, lines, period_start, period_end, paid_at
    ) values (
      s.workspace_id, s.id, s.provider, nullif(p_invoice ->> 'provider_invoice_id', ''), 'paid', 'BRL',
      v_amount, v_amount, v_amount, coalesce(nullif(p_invoice ->> 'description', ''), 'Troca de plano'),
      jsonb_build_array(jsonb_build_object('label', coalesce(p_invoice ->> 'label', 'Ajuste proporcional'), 'kind', 'proration', 'quantity', 1, 'amount_cents', v_amount)),
      now(), coalesce(p_period_end, s.current_period_end), now()
    )
    returning id into v_invoice;

    insert into public.payment_transactions (
      workspace_id, invoice_id, provider, provider_payment_id, kind, status, amount_cents, currency,
      method, card_brand, card_last4, processed_at
    ) values (
      s.workspace_id, v_invoice, s.provider, nullif(p_payment ->> 'provider_payment_id', ''), 'charge', 'succeeded', v_amount, 'BRL',
      nullif(p_payment ->> 'method', ''), nullif(p_payment ->> 'card_brand', ''), nullif(p_payment ->> 'card_last4', ''), now()
    );
  end if;

  return v_invoice;
end;
$$;
comment on function public.change_subscription(uuid, text, public.billing_interval, integer, bigint, timestamptz, timestamptz, jsonb, jsonb) is 'Troca de plano atômica (assinatura, item, fatura e transação). Só service_role.';
revoke all on function public.change_subscription(uuid, text, public.billing_interval, integer, bigint, timestamptz, timestamptz, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.change_subscription(uuid, text, public.billing_interval, integer, bigint, timestamptz, timestamptz, jsonb, jsonb) to service_role;

-- ---- renovação das assinaturas simuladas ---------------------------------------------------------

-- Assinatura simulada vencida (sem cancelamento agendado) renova: novo período,
-- fatura paga com os itens recorrentes e transação no último cartão usado.
-- Recupera períodos perdidos (no máximo 24 por execução).
create or replace function private.renew_mock_subscriptions()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
  v_months integer;
  v_step interval;
  v_start timestamptz;
  v_end timestamptz;
  v_lines jsonb;
  v_total bigint;
  v_invoice uuid;
  v_card record;
  v_renewed integer := 0;
  v_guard integer;
begin
  for s in
    select * from public.subscriptions
    where provider = 'mock' and status in ('active', 'trialing') and not cancel_at_period_end and current_period_end <= now()
    order by current_period_end
    for update skip locked
  loop
    v_months := case s.interval when 'year' then 12 else 1 end;
    v_step := case s.interval when 'year' then interval '1 year' else interval '1 month' end;
    select
      coalesce(jsonb_agg(jsonb_build_object(
        'label', coalesce(pp.plan_id, bi.name, 'Item'), 'kind', 'recurring', 'quantity', i.quantity,
        'plan_price_id', i.plan_price_id, 'billing_item_id', i.billing_item_id,
        'months', v_months, 'monthly_amount_cents', i.amount_cents, 'amount_cents', i.amount_cents * v_months
      ) order by i.created_at), '[]'::jsonb),
      coalesce(sum(i.amount_cents), 0) * v_months
      into v_lines, v_total
    from public.subscription_items i
    left join public.plan_prices pp on pp.id = i.plan_price_id
    left join public.billing_items bi on bi.id = i.billing_item_id
    where i.subscription_id = s.id;

    select t.card_brand, t.card_last4, t.method into v_card
    from public.payment_transactions t
    where t.workspace_id = s.workspace_id and t.status = 'succeeded'
    order by t.created_at desc limit 1;

    v_start := s.current_period_start;
    v_end := s.current_period_end;
    v_guard := 0;
    while v_end <= now() and v_guard < 24 loop
      v_guard := v_guard + 1;
      v_start := v_end;
      v_end := v_end + v_step;
      insert into public.invoices (
        workspace_id, subscription_id, provider, provider_invoice_id, status, currency,
        subtotal_cents, total_cents, amount_paid_cents, description, lines, period_start, period_end, paid_at
      ) values (
        s.workspace_id, s.id, 'mock', 'mock_in_' || replace(gen_random_uuid()::text, '-', ''), 'paid', 'BRL',
        v_total, v_total, v_total, 'Renovação ' || s.plan_id, v_lines, v_start, v_end, v_start
      )
      returning id into v_invoice;
      insert into public.payment_transactions (
        workspace_id, invoice_id, provider, provider_payment_id, kind, status, amount_cents, currency,
        method, card_brand, card_last4, processed_at
      ) values (
        s.workspace_id, v_invoice, 'mock', 'mock_pi_' || replace(gen_random_uuid()::text, '-', ''), 'charge', 'succeeded', v_total, 'BRL',
        coalesce(v_card.method, 'card'), v_card.card_brand, v_card.card_last4, v_start
      );
    end loop;

    update public.subscriptions set current_period_start = v_start, current_period_end = v_end where id = s.id;
    v_renewed := v_renewed + 1;
  end loop;
  return v_renewed;
end;
$$;
revoke all on function private.renew_mock_subscriptions() from public;

-- Ciclo de cobrança (a cada 15 min): fecha cancelamentos vencidos e renova as simuladas.
create or replace function private.billing_tick()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_out jsonb := '{}'::jsonb;
begin
  begin
    v_out := v_out || jsonb_build_object('closed', private.close_ended_subscriptions());
  exception when others then
    v_out := v_out || jsonb_build_object('close_error', sqlerrm);
    raise warning 'vyz billing (encerrar): %', sqlerrm;
  end;
  begin
    v_out := v_out || jsonb_build_object('renewed_mock', private.renew_mock_subscriptions());
  exception when others then
    v_out := v_out || jsonb_build_object('renew_error', sqlerrm);
    raise warning 'vyz billing (renovar simuladas): %', sqlerrm;
  end;
  return v_out;
end;
$$;
revoke all on function private.billing_tick() from public;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'vyz-close-subscriptions') then
    perform cron.unschedule('vyz-close-subscriptions');
  end if;
end $$;
select cron.schedule('vyz-billing', '*/15 * * * *', $cron$select private.billing_tick()$cron$);

-- ---- linha do tempo da assinatura ----------------------------------------------------------------

-- Trocar o período (mensal ↔ anual) recomeça o ciclo: não é renovação.
create or replace function private.track_subscription_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := private.current_actor_id();
begin
  if tg_op = 'INSERT' then
    insert into public.subscription_changes (workspace_id, subscription_id, change, to_value, actor_id)
    values (new.workspace_id, new.id, 'created', new.plan_id || ' · ' || new.interval || ' · ' || new.accounts_quantity || ' conta(s)', v_actor);
    return null;
  end if;

  if new.plan_id is distinct from old.plan_id then
    insert into public.subscription_changes (workspace_id, subscription_id, change, from_value, to_value, actor_id)
    values (new.workspace_id, new.id, 'plan_changed', old.plan_id, new.plan_id, v_actor);
  end if;
  if new.accounts_quantity is distinct from old.accounts_quantity then
    insert into public.subscription_changes (workspace_id, subscription_id, change, from_value, to_value, actor_id)
    values (new.workspace_id, new.id, 'quantity_changed', old.accounts_quantity::text, new.accounts_quantity::text, v_actor);
  end if;
  if new.interval is distinct from old.interval then
    insert into public.subscription_changes (workspace_id, subscription_id, change, from_value, to_value, actor_id)
    values (new.workspace_id, new.id, 'interval_changed', old.interval::text, new.interval::text, v_actor);
  end if;
  if new.status is distinct from old.status then
    insert into public.subscription_changes (workspace_id, subscription_id, change, from_value, to_value, actor_id)
    values (new.workspace_id, new.id, 'status_changed', old.status::text, new.status::text, v_actor);
  end if;
  if new.cancel_at_period_end and not old.cancel_at_period_end then
    insert into public.subscription_changes (workspace_id, subscription_id, change, to_value, actor_id)
    values (new.workspace_id, new.id, 'cancel_scheduled', new.current_period_end::text, v_actor);
  elsif old.cancel_at_period_end and not new.cancel_at_period_end then
    insert into public.subscription_changes (workspace_id, subscription_id, change, actor_id)
    values (new.workspace_id, new.id, 'cancel_reverted', v_actor);
  end if;
  if new.current_period_end > old.current_period_end and new.status = 'active' and new.interval is not distinct from old.interval then
    insert into public.subscription_changes (workspace_id, subscription_id, change, from_value, to_value, actor_id)
    values (new.workspace_id, new.id, 'renewed', old.current_period_end::text, new.current_period_end::text, v_actor);
  end if;
  return null;
end;
$$;
