-- =============================================================================
-- VYZ · 01 · Fundação
-- Schema privado, privilégios negados por padrão, tipos (enums) e utilitários.
--
-- Convenções (detalhes em docs/BANCO.md):
--   * public  : tabelas e funções expostas pela API do Supabase. Toda tabela tem
--               RLS ligado e grants explícitos; nada nasce aberto.
--   * private : funções internas (helpers de RLS, gatilhos). Nunca é exposto.
--   * Ids uuid (gen_random_uuid); catálogos usam slugs de texto compartilhados
--     com o código (ex.: 'pro', 'meta', 'meta-ecommerce').
--   * Dinheiro da cobrança em centavos (bigint, sufixo _cents). Valores das
--     plataformas de anúncio em numeric(18,4), na moeda da conta.
--   * Tabelas de um workspace carregam workspace_id e usam FKs compostas
--     (workspace_id, x_id) para impedir referência entre workspaces.
-- =============================================================================

create schema if not exists private;
comment on schema private is 'Funções internas do VYZ (helpers de RLS e gatilhos). Fora da API.';
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- Negado por padrão: objetos criados daqui em diante em public não ficam
-- acessíveis para anon/authenticated sem um grant explícito na migration.
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema private revoke execute on functions from public;

-- ---- tipos ------------------------------------------------------------------

-- Ordem importa: comparações (role >= 'admin') seguem a ordem declarada.
create type public.member_role as enum ('viewer', 'member', 'admin', 'owner');
comment on type public.member_role is 'viewer lê; member cria e edita; admin gerencia contas, equipe e marca; owner cuida da cobrança.';

create type public.billing_interval as enum ('month', 'year');
create type public.billing_provider as enum ('mock', 'stripe');
comment on type public.billing_provider is 'mock = pagamento simulado (sem credenciais); stripe = cobrança real.';

-- Mesmos estados da Stripe, para o webhook gravar sem tradução.
create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'unpaid', 'paused', 'incomplete', 'incomplete_expired', 'canceled');
create type public.checkout_status as enum ('open', 'completed', 'expired', 'canceled');
create type public.invoice_status as enum ('draft', 'open', 'paid', 'void', 'uncollectible');
create type public.service_order_status as enum ('pending', 'in_progress', 'delivered', 'canceled');

create type public.integration_provider as enum ('meta', 'google');
create type public.connection_status as enum ('active', 'expired', 'revoked', 'error');
create type public.sync_status as enum ('queued', 'running', 'succeeded', 'failed');

create type public.onboarding_step as enum ('business', 'platforms', 'connect', 'dashboard', 'done');
create type public.landing_status as enum ('draft', 'published', 'archived');
create type public.report_frequency as enum ('weekly', 'monthly');
create type public.report_format as enum ('pdf', 'whatsapp');

-- ---- utilitários ------------------------------------------------------------

create function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
comment on function private.touch_updated_at() is 'Gatilho: mantém updated_at.';

-- "Loja Verde Ltda." -> "loja-verde-ltda" (até 40 caracteres).
create function private.slugify(input text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select coalesce(
    nullif(
      trim(both '-' from left(
        regexp_replace(
          translate(lower(coalesce(input, '')), 'áàâãäåçéèêëíìîïñóòôõöúùûüýÿ', 'aaaaaaceeeeiiiinooooouuuuyy'),
          '[^a-z0-9]+', '-', 'g'
        ),
        40
      )),
      ''
    ),
    'vyz'
  );
$$;
