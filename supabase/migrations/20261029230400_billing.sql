-- =============================================================================
-- VYZ · 04 · Cobrança
-- Checkout (com itens), cliente no provedor, assinatura e itens, faturas,
-- pedidos de serviço (LP feita pelo time, dashboard sob medida) e eventos de
-- webhook. O provedor é 'mock' até a Stripe entrar; as colunas provider_* já
-- recebem os ids da Stripe.
-- Escrita só pelo servidor (service_role). O usuário lê o que é dele.
-- =============================================================================

-- ---- cliente no provedor ----------------------------------------------------------

create table public.billing_customers (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  provider public.billing_provider not null,
  provider_customer_id text not null,
  email text not null,
  legal_name text,
  tax_id text check (tax_id is null or tax_id ~ '^([0-9]{11}|[0-9]{14})$'),
  phone text check (phone is null or phone ~ '^\+?[0-9]{10,15}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_customer_id)
);
comment on table public.billing_customers is 'Cliente do workspace no provedor de cobrança (Stripe customer).';
comment on column public.billing_customers.tax_id is 'CPF (11) ou CNPJ (14), só dígitos.';

-- ---- checkout -------------------------------------------------------------------

create table public.checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  status public.checkout_status not null default 'open',
  provider public.billing_provider not null,
  provider_session_id text unique,
  user_id uuid references auth.users (id) on delete set null,
  workspace_id uuid references public.workspaces (id) on delete set null,
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  full_name text not null check (char_length(btrim(full_name)) between 2 and 120),
  company_name text not null check (char_length(btrim(company_name)) between 1 and 80),
  phone text check (phone is null or phone ~ '^\+?[0-9]{10,15}$'),
  tax_id text check (tax_id is null or tax_id ~ '^([0-9]{11}|[0-9]{14})$'),
  plan_id text references public.plans (id),
  interval public.billing_interval not null,
  accounts_quantity smallint not null default 0 check (accounts_quantity between 0 and 30),
  business_type_id text references public.business_types (id),
  selection jsonb not null,
  quote jsonb not null,
  amount_due_now_cents bigint not null check (amount_due_now_cents >= 0),
  recurring_cents bigint not null default 0 check (recurring_cents >= 0),
  currency text not null default 'BRL' check (currency ~ '^[A-Z]{3}$'),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'completed') = (completed_at is not null)),
  check (plan_id is not null or accounts_quantity = 0)
);
comment on table public.checkout_sessions is 'Pedido montado na LP (Monte seu plano) e pago no checkout. Guarda a seleção e o orçamento calculados no servidor.';
comment on column public.checkout_sessions.plan_id is 'null = só itens avulsos, sem plano.';
comment on column public.checkout_sessions.workspace_id is 'Preenchido na conclusão (ou antes, quando o usuário já tem workspace).';
comment on column public.checkout_sessions.selection is 'PlanState normalizado (src/features/pricing/pricing.ts).';
comment on column public.checkout_sessions.quote is 'Quote calculado no servidor no momento do pedido.';
comment on column public.checkout_sessions.amount_due_now_cents is 'Primeira cobrança: o período (mês ou ano) + os itens únicos.';
comment on column public.checkout_sessions.recurring_cents is 'Valor recorrente por período (mês ou ano).';
create index checkout_sessions_user_idx on public.checkout_sessions (user_id);
create index checkout_sessions_workspace_idx on public.checkout_sessions (workspace_id);
create index checkout_sessions_plan_idx on public.checkout_sessions (plan_id);
create index checkout_sessions_business_type_idx on public.checkout_sessions (business_type_id);
create index checkout_sessions_email_idx on public.checkout_sessions (lower(email));

create table public.checkout_items (
  id uuid primary key default gen_random_uuid(),
  checkout_session_id uuid not null references public.checkout_sessions (id) on delete cascade,
  kind text not null check (kind in ('recurring', 'one_time')),
  plan_price_id text references public.plan_prices (id),
  billing_item_id text references public.billing_items (id),
  quantity integer not null check (quantity >= 1),
  amount_cents bigint not null check (amount_cents >= 0),
  label text not null,
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  check (num_nonnulls(plan_price_id, billing_item_id) = 1),
  check (plan_price_id is null or kind = 'recurring'),
  unique (checkout_session_id, position)
);
comment on table public.checkout_items is 'Linhas do pedido. recurring vira item da assinatura; one_time vira pedido de serviço.';
comment on column public.checkout_items.amount_cents is 'Valor da linha: por mês (recurring) ou total (one_time).';
create index checkout_items_session_idx on public.checkout_items (checkout_session_id);
create index checkout_items_plan_price_idx on public.checkout_items (plan_price_id);
create index checkout_items_billing_item_idx on public.checkout_items (billing_item_id);

-- ---- assinatura -------------------------------------------------------------------

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  plan_id text not null references public.plans (id),
  status public.subscription_status not null,
  interval public.billing_interval not null,
  accounts_quantity smallint not null check (accounts_quantity between 1 and 30),
  provider public.billing_provider not null,
  provider_subscription_id text unique,
  checkout_session_id uuid references public.checkout_sessions (id) on delete set null,
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  ended_at timestamptz,
  trial_end timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  check (current_period_end > current_period_start)
);
comment on table public.subscriptions is 'Assinatura do workspace. Só uma viva por vez (índice parcial).';
comment on column public.subscriptions.accounts_quantity is 'Contas contratadas (BMs do Meta, contas do Google Ads, propriedades do GA4...). Limita as contas ativas.';
create unique index subscriptions_one_live_per_workspace on public.subscriptions (workspace_id)
  where status not in ('canceled', 'incomplete_expired');
create index subscriptions_plan_idx on public.subscriptions (plan_id);
create index subscriptions_checkout_idx on public.subscriptions (checkout_session_id);

create table public.subscription_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  subscription_id uuid not null,
  plan_price_id text references public.plan_prices (id),
  billing_item_id text references public.billing_items (id),
  quantity integer not null check (quantity >= 1),
  amount_cents bigint not null check (amount_cents >= 0),
  provider_item_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(plan_price_id, billing_item_id) = 1),
  foreign key (workspace_id, subscription_id) references public.subscriptions (workspace_id, id) on delete cascade
);
comment on table public.subscription_items is 'Itens recorrentes da assinatura: o plano (quantidade = contas) e os extras mensais.';
comment on column public.subscription_items.amount_cents is 'Valor do item por mês.';
create index subscription_items_subscription_idx on public.subscription_items (workspace_id, subscription_id);
create index subscription_items_plan_price_idx on public.subscription_items (plan_price_id);
create index subscription_items_billing_item_idx on public.subscription_items (billing_item_id);

-- ---- faturas --------------------------------------------------------------------

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  checkout_session_id uuid references public.checkout_sessions (id) on delete set null,
  provider public.billing_provider not null,
  provider_invoice_id text unique,
  status public.invoice_status not null,
  currency text not null default 'BRL' check (currency ~ '^[A-Z]{3}$'),
  subtotal_cents bigint not null check (subtotal_cents >= 0),
  total_cents bigint not null check (total_cents >= 0),
  amount_paid_cents bigint not null default 0 check (amount_paid_cents >= 0),
  description text,
  lines jsonb not null default '[]'::jsonb,
  hosted_invoice_url text,
  invoice_pdf_url text,
  period_start timestamptz,
  period_end timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.invoices is 'Faturas (espelho das invoices da Stripe; no mock, a do checkout pago).';
create index invoices_workspace_idx on public.invoices (workspace_id, created_at desc);
create index invoices_subscription_idx on public.invoices (subscription_id);
create index invoices_checkout_idx on public.invoices (checkout_session_id);

-- ---- transações de pagamento ---------------------------------------------------------

create table public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  invoice_id uuid references public.invoices (id) on delete set null,
  checkout_session_id uuid references public.checkout_sessions (id) on delete set null,
  provider public.billing_provider not null,
  provider_payment_id text unique,
  kind text not null default 'charge' check (kind in ('charge', 'refund', 'chargeback')),
  status text not null check (status in ('pending', 'succeeded', 'failed', 'canceled')),
  amount_cents bigint not null check (amount_cents >= 0),
  currency text not null default 'BRL' check (currency ~ '^[A-Z]{3}$'),
  method text check (method in ('card', 'pix', 'boleto')),
  card_brand text,
  card_last4 text check (card_last4 is null or card_last4 ~ '^[0-9]{4}$'),
  installments smallint check (installments is null or installments between 1 and 12),
  failure_code text,
  failure_message text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.payment_transactions is 'Cada cobrança, estorno ou contestação, com forma de pagamento. Nunca guarda o número do cartão (só bandeira e final).';
create index payment_transactions_workspace_idx on public.payment_transactions (workspace_id, created_at desc);
create index payment_transactions_invoice_idx on public.payment_transactions (invoice_id);
create index payment_transactions_checkout_idx on public.payment_transactions (checkout_session_id);

-- ---- pedidos de serviço -------------------------------------------------------------

create table public.service_orders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  checkout_session_id uuid references public.checkout_sessions (id) on delete set null,
  billing_item_id text not null references public.billing_items (id),
  quantity integer not null check (quantity >= 1),
  status public.service_order_status not null default 'pending',
  notes text,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'delivered') = (delivered_at is not null))
);
comment on table public.service_orders is 'Serviços comprados que o time entrega (LP feita pelo time, dashboard sob medida, dashboard adicional).';
create index service_orders_workspace_idx on public.service_orders (workspace_id);
create index service_orders_checkout_idx on public.service_orders (checkout_session_id);
create index service_orders_item_idx on public.service_orders (billing_item_id);

-- ---- eventos do provedor (idempotência) ----------------------------------------------

create table public.billing_events (
  id text primary key,
  provider public.billing_provider not null,
  type text not null,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error text
);
comment on table public.billing_events is 'Eventos de webhook recebidos (id do provedor como chave: o mesmo evento nunca é processado duas vezes). Só service_role.';
create index billing_events_unprocessed_idx on public.billing_events (received_at) where processed_at is null;

-- ---- updated_at ---------------------------------------------------------------------

create trigger billing_customers_touch before update on public.billing_customers for each row execute function private.touch_updated_at();
create trigger checkout_sessions_touch before update on public.checkout_sessions for each row execute function private.touch_updated_at();
create trigger subscriptions_touch before update on public.subscriptions for each row execute function private.touch_updated_at();
create trigger subscription_items_touch before update on public.subscription_items for each row execute function private.touch_updated_at();
create trigger invoices_touch before update on public.invoices for each row execute function private.touch_updated_at();
create trigger service_orders_touch before update on public.service_orders for each row execute function private.touch_updated_at();
create trigger payment_transactions_touch before update on public.payment_transactions for each row execute function private.touch_updated_at();

-- ---- RLS ------------------------------------------------------------------------------

alter table public.billing_customers enable row level security;
alter table public.checkout_sessions enable row level security;
alter table public.checkout_items enable row level security;
alter table public.subscriptions enable row level security;
alter table public.subscription_items enable row level security;
alter table public.invoices enable row level security;
alter table public.service_orders enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.billing_events enable row level security; -- sem políticas: só service_role

create policy "billing_customers: owner e admin leem" on public.billing_customers
  for select to authenticated using (workspace_id in (select private.workspace_ids('admin')));
create policy "checkout_sessions: o proprio usuario le" on public.checkout_sessions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "checkout_items: do checkout do usuario" on public.checkout_items
  for select to authenticated
  using (checkout_session_id in (select s.id from public.checkout_sessions s where s.user_id = (select auth.uid())));
-- O status da assinatura libera o painel: todo membro lê.
create policy "subscriptions: membros leem" on public.subscriptions
  for select to authenticated using (workspace_id in (select private.workspace_ids()));
create policy "subscription_items: owner e admin leem" on public.subscription_items
  for select to authenticated using (workspace_id in (select private.workspace_ids('admin')));
create policy "invoices: owner e admin leem" on public.invoices
  for select to authenticated using (workspace_id in (select private.workspace_ids('admin')));
create policy "service_orders: membros leem" on public.service_orders
  for select to authenticated using (workspace_id in (select private.workspace_ids()));
create policy "payment_transactions: owner e admin leem" on public.payment_transactions
  for select to authenticated using (workspace_id in (select private.workspace_ids('admin')));

grant select on
  public.billing_customers,
  public.checkout_sessions,
  public.checkout_items,
  public.subscriptions,
  public.subscription_items,
  public.invoices,
  public.service_orders,
  public.payment_transactions
to authenticated;

-- ---- acesso do workspace (plano vigente + limites) ---------------------------------------

-- security_invoker: respeita o RLS de quem consulta.
create view public.workspace_access
with (security_invoker = true)
as
select
  w.id as workspace_id,
  s.id as subscription_id,
  s.plan_id,
  s.status as subscription_status,
  s.interval,
  coalesce(s.accounts_quantity, 0)::integer as accounts_quantity,
  s.current_period_end,
  coalesce(s.cancel_at_period_end, false) as cancel_at_period_end,
  coalesce(s.status in ('active', 'trialing', 'past_due'), false) as has_access,
  e.dashboard_templates,
  e.landing_templates,
  e.platforms,
  e.pages_plan_id,
  e.white_label,
  e.audio,
  e.custom_dashboards,
  e.agent_chat,
  e.agent_voice,
  e.max_dashboards,
  e.max_landing_pages
from public.workspaces w
left join lateral (
  select sub.*
  from public.subscriptions sub
  where sub.workspace_id = w.id and sub.status not in ('canceled', 'incomplete_expired')
  order by sub.created_at desc
  limit 1
) s on true
left join public.plan_entitlements e on e.plan_id = s.plan_id;
comment on view public.workspace_access is 'Plano vigente e limites de cada workspace. has_access = assinatura ativa, em teste ou com pagamento atrasado (carência).';
grant select on public.workspace_access to authenticated;

-- Mesma informação para gatilhos e funções (ignora RLS).
create function private.workspace_plan(p_workspace_id uuid)
returns table (plan_id text, accounts_quantity integer, has_access boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select s.plan_id, s.accounts_quantity::integer, s.status in ('active', 'trialing', 'past_due')
  from public.subscriptions s
  where s.workspace_id = p_workspace_id and s.status not in ('canceled', 'incomplete_expired')
  order by s.created_at desc
  limit 1;
$$;
revoke all on function private.workspace_plan(uuid) from public;

-- ---- conclusão do checkout (atômica e idempotente) -----------------------------------------

-- Chamada pelo servidor quando o pagamento é confirmado (mock ou webhook da
-- Stripe). Cria o workspace (se ainda não existir), o dono, o cliente, a
-- assinatura com os itens, a fatura paga, a transação e os pedidos de serviço.
-- Chamar de novo com o mesmo checkout devolve o mesmo workspace.
-- p_payment: {provider_payment_id?, method?, card_brand?, card_last4?, installments?}
create function public.fulfill_checkout(
  p_checkout_id uuid,
  p_provider_customer_id text,
  p_provider_subscription_id text default null,
  p_provider_invoice_id text default null,
  p_payment jsonb default '{}'::jsonb,
  p_period_start timestamptz default now(),
  p_period_end timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.checkout_sessions%rowtype;
  v_ws uuid;
  v_sub uuid;
  v_invoice uuid;
  v_end timestamptz;
begin
  select * into c from public.checkout_sessions where id = p_checkout_id for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'checkout:not_found';
  end if;
  if c.status = 'completed' then
    return c.workspace_id;
  end if;
  if c.status <> 'open' then
    raise exception using errcode = 'P0001', message = 'checkout:not_open';
  end if;
  if c.user_id is null then
    raise exception using errcode = 'P0001', message = 'checkout:no_user';
  end if;

  -- workspace: o informado no checkout (o usuário precisa ser owner) ou um novo
  if c.workspace_id is not null then
    if not exists (
      select 1 from public.workspace_members m
      where m.workspace_id = c.workspace_id and m.user_id = c.user_id and m.role = 'owner'
    ) then
      raise exception using errcode = 'P0001', message = 'checkout:not_owner';
    end if;
    v_ws := c.workspace_id;
  else
    insert into public.workspaces (name, slug, business_type_id, created_by)
    values (btrim(c.company_name), private.unique_workspace_slug(c.company_name), c.business_type_id, c.user_id)
    returning id into v_ws;
    insert into public.workspace_members (workspace_id, user_id, role) values (v_ws, c.user_id, 'owner');
    update public.profiles set default_workspace_id = v_ws where id = c.user_id and default_workspace_id is null;
  end if;

  insert into public.billing_customers (workspace_id, provider, provider_customer_id, email, legal_name, tax_id, phone)
  values (v_ws, c.provider, p_provider_customer_id, c.email, btrim(c.company_name), c.tax_id, c.phone)
  on conflict (workspace_id) do update set
    provider = excluded.provider,
    provider_customer_id = excluded.provider_customer_id,
    email = excluded.email,
    legal_name = coalesce(excluded.legal_name, public.billing_customers.legal_name),
    tax_id = coalesce(excluded.tax_id, public.billing_customers.tax_id),
    phone = coalesce(excluded.phone, public.billing_customers.phone);

  if c.plan_id is not null then
    -- um novo checkout com plano substitui a assinatura viva anterior
    update public.subscriptions
      set status = 'canceled', canceled_at = now(), ended_at = now()
      where workspace_id = v_ws and status not in ('canceled', 'incomplete_expired');

    v_end := coalesce(p_period_end, p_period_start + case c.interval when 'year' then interval '1 year' else interval '1 month' end);
    insert into public.subscriptions (
      workspace_id, plan_id, status, interval, accounts_quantity, provider,
      provider_subscription_id, checkout_session_id, current_period_start, current_period_end
    ) values (
      v_ws, c.plan_id, 'active', c.interval, c.accounts_quantity, c.provider,
      p_provider_subscription_id, c.id, p_period_start, v_end
    )
    returning id into v_sub;

    insert into public.subscription_items (workspace_id, subscription_id, plan_price_id, billing_item_id, quantity, amount_cents)
    select v_ws, v_sub, i.plan_price_id, i.billing_item_id, i.quantity, i.amount_cents
    from public.checkout_items i
    where i.checkout_session_id = c.id and i.kind = 'recurring'
    order by i.position;
  end if;

  insert into public.service_orders (workspace_id, checkout_session_id, billing_item_id, quantity)
  select v_ws, c.id, i.billing_item_id, i.quantity
  from public.checkout_items i
  where i.checkout_session_id = c.id and i.kind = 'one_time'
  order by i.position;

  insert into public.invoices (
    workspace_id, subscription_id, checkout_session_id, provider, provider_invoice_id, status,
    currency, subtotal_cents, total_cents, amount_paid_cents, description, lines,
    period_start, period_end, paid_at
  ) values (
    v_ws, v_sub, c.id, c.provider, p_provider_invoice_id, 'paid',
    c.currency, c.amount_due_now_cents, c.amount_due_now_cents, c.amount_due_now_cents,
    case when c.plan_id is null then 'Pedido avulso' else 'Assinatura ' || c.plan_id end,
    coalesce((
      select jsonb_agg(jsonb_build_object('label', i.label, 'kind', i.kind, 'quantity', i.quantity, 'amount_cents', i.amount_cents) order by i.position)
      from public.checkout_items i where i.checkout_session_id = c.id
    ), '[]'::jsonb),
    case when c.plan_id is not null then p_period_start end,
    case when c.plan_id is not null then v_end end,
    now()
  )
  returning id into v_invoice;

  insert into public.payment_transactions (
    workspace_id, invoice_id, checkout_session_id, provider, provider_payment_id, kind, status,
    amount_cents, currency, method, card_brand, card_last4, installments, processed_at
  ) values (
    v_ws, v_invoice, c.id, c.provider, nullif(p_payment ->> 'provider_payment_id', ''), 'charge', 'succeeded',
    c.amount_due_now_cents, c.currency,
    nullif(p_payment ->> 'method', ''), nullif(p_payment ->> 'card_brand', ''), nullif(p_payment ->> 'card_last4', ''),
    nullif(p_payment ->> 'installments', '')::smallint, now()
  );

  -- plataformas contratadas viram as sugeridas no onboarding
  insert into public.workspace_platforms (workspace_id, platform_id)
  select v_ws, p.id
  from public.platforms p
  where (p.id = 'meta' and coalesce((c.selection ->> 'meta')::integer, 0) > 0)
     or (p.id = 'google' and coalesce((c.selection ->> 'google')::integer, 0) > 0)
     or (p.id = 'ga4' and coalesce((c.selection ->> 'ga4')::integer, 0) > 0)
  on conflict do nothing;

  update public.checkout_sessions
    set status = 'completed', completed_at = now(), workspace_id = v_ws
    where id = c.id;

  return v_ws;
end;
$$;
comment on function public.fulfill_checkout(uuid, text, text, text, jsonb, timestamptz, timestamptz) is 'Conclui um checkout pago. Idempotente. Só service_role.';
revoke all on function public.fulfill_checkout(uuid, text, text, text, jsonb, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.fulfill_checkout(uuid, text, text, text, jsonb, timestamptz, timestamptz) to service_role;
