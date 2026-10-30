// Pedido do checkout: a seleção da LP (PlanState) vira as linhas de cobrança
// (checkout_items) e os valores da primeira cobrança e da recorrência. O
// servidor recalcula tudo daqui; o navegador nunca manda preço.

import { BILLING_ITEMS, INTERVAL, planPriceId, type BillingItemId } from "@/features/pricing/catalog";
import { DEFAULT_STATE, PLAN_LABEL, quote, type Period, type PlanId, type PlanState, type Quote } from "@/features/pricing/pricing";

export type OrderItem = {
  kind: "recurring" | "one_time";
  /** Só no item do plano ("pro_year"). */
  planPriceId?: string;
  /** Extras (catálogo em src/features/pricing/catalog.ts). */
  billingItemId?: BillingItemId;
  quantity: number;
  /** Valor da linha em centavos: por mês (recurring) ou total (one_time). */
  amountCents: number;
  label: string;
};

/** Por que o pedido não pode ser pago no checkout. */
export type OrderBlock = "over_limit" | "recurring_without_plan" | "empty";

export type Order = {
  planId: PlanId | null;
  period: Period;
  interval: "month" | "year";
  /** Contas contratadas (0 sem plano). */
  accountsQuantity: number;
  items: OrderItem[];
  /** Primeira cobrança: o período (mês ou ano) + os itens únicos. */
  amountDueNowCents: number;
  /** Cobrança recorrente, por período (mês ou ano). */
  recurringCents: number;
  quote: Quote;
  blocked?: OrderBlock;
};

export const BLOCK_MESSAGE: Record<OrderBlock, string> = {
  over_limit: "Acima de 30 contas, o plano é montado com um especialista.",
  recurring_without_plan: "Itens mensais (hospedagem das LPs ou dashboard sob medida mensal) precisam de um plano.",
  empty: "Escolha um plano ou um extra para assinar.",
};

/**
 * Estado completo e coerente a partir da query da LP (fromQuery): sem plano
 * não há contas nem dashboard adicional, e hospedagem só com LP.
 */
export function normalizeState(patch: Partial<PlanState> | null | undefined): PlanState {
  const s: PlanState = { ...DEFAULT_STATE, ...patch };
  if (s.plano === "sem") Object.assign(s, { meta: 0, google: 0, ga4: 0, outras: 0, dash: 0 });
  if (s.lp === 0) s.lpcare = false;
  return s;
}

const accountsLabel = (n: number) => `${n} ${n === 1 ? "conta" : "contas"}`;

export function planItemLabel(plan: PlanId, accounts: number): string {
  return `Plano ${PLAN_LABEL[plan]} · ${accountsLabel(accounts)}${plan === "avancado" ? " · com análise por áudio" : ""}`;
}

export function buildOrder(state: PlanState): Order {
  const q = quote(state);
  const planId = state.plano === "sem" ? null : state.plano;
  const items: OrderItem[] = [];

  if (planId) {
    items.push({
      kind: "recurring",
      planPriceId: planPriceId(planId, state.periodo),
      quantity: q.accountsBilled,
      amountCents: q.planMonthly,
      label: planItemLabel(planId, q.accountsBilled),
    });
  }

  const extra = (id: BillingItemId, quantity: number) => {
    if (quantity <= 0) return;
    const item = BILLING_ITEMS[id];
    items.push({ kind: item.kind, billingItemId: id, quantity, amountCents: quantity * item.unitCents, label: item.name });
  };
  // mensais primeiro (entram na assinatura), depois os únicos (viram pedidos de serviço)
  if (state.lpcare) extra("lp_care", state.lp);
  if (state.sobm === "recorrente") extra("dash_custom_monthly", state.sob);
  extra("lp_team", state.lp);
  extra(state.sobm === "recorrente" ? "dash_custom_setup" : "dash_custom_once", state.sob);
  if (planId) extra("dash_extra", state.dash);

  const recurringCents = state.periodo === "anual" ? q.yearly : q.monthly;
  const recurringExtra = items.some((i) => i.kind === "recurring" && i.billingItemId);
  const blocked: OrderBlock | undefined = q.overLimit
    ? "over_limit"
    : !planId && recurringExtra
      ? "recurring_without_plan"
      : items.length === 0
        ? "empty"
        : undefined;

  return {
    planId,
    period: state.periodo,
    interval: INTERVAL[state.periodo],
    accountsQuantity: planId ? q.accountsBilled : 0,
    items,
    amountDueNowCents: recurringCents + q.oneTime,
    recurringCents,
    quote: q,
    ...(blocked ? { blocked } : {}),
  };
}
