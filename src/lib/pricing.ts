// Todos os preços da página, em centavos. Mudou preço? Muda só aqui.
// Cada linha é arredondada em centavos e os totais somam as linhas.

import { brl } from "./format";

export type PlanId = "base" | "pro" | "avancado";
export type PlanChoice = PlanId | "sem";
export type Period = "mensal" | "anual";
export type Nicho = "ecommerce" | "imobiliario";

export const PLAN: Record<PlanId, Record<Period, number>> = {
  base: { mensal: 4166, anual: 2833 }, // 1ª conta
  pro: { mensal: 12500, anual: 8500 },
  avancado: { mensal: 12500, anual: 8500 }, // = Pro + AUDIO_ADDON
};

export const EXTRA_ACCOUNT: Record<PlanId, Record<Period, number>> = {
  base: { mensal: 9999, anual: 6799 },
  pro: { mensal: 14999, anual: 10199 },
  avancado: { mensal: 14999, anual: 10199 },
};

export const AUDIO_ADDON = 99000; // R$ 990/mês, só no Avançado, sem desconto anual
export const PRO_TRACKING_VALUE = 177000; // R$ 1.770 (CAPI 690 + conversões otimizadas 490 + GA4 590), incluso no Pro e no Avançado
export const LP_PRICE = 95000; // R$ 950, já com o GTM
export const DASH_CUSTOM_PRICE = 190000; // R$ 1.900
export const DASH_EXTRA_PRICE = 9900; // R$ 99
export const MAX_ACCOUNTS_IN_PLAN = 30; // acima disso: sob consulta
export const ANNUAL_SAVING_PCT = 32;
export const WHATSAPP_NUMBER = "5571999575898"; // trocar quando a VYZ tiver número próprio

/** Teto de cada contador de contas e de cada extra. */
export const MAX_PER_PLATFORM = 99;
export const MAX_EXTRA = 10;

export const PLAN_LABEL: Record<PlanChoice, string> = {
  base: "Base",
  pro: "Pro",
  avancado: "Avançado",
  sem: "Sem plano",
};

export const PERIOD_LABEL: Record<Period, string> = { mensal: "mensal", anual: "anual" };

export const NICHO_LABEL: Record<Nicho, string> = {
  ecommerce: "E-commerce",
  imobiliario: "Imobiliário",
};

export type PlanState = {
  plano: PlanChoice;
  periodo: Period;
  meta: number;
  google: number;
  ga4: number;
  /** TikTok, LinkedIn, marketplaces, CRMs: só o Pro e o Avançado aceitam. */
  outras: number;
  lp: number;
  sob: number;
  dash: number;
  nicho: Nicho | null;
};

export const DEFAULT_STATE: PlanState = {
  plano: "pro",
  periodo: "anual",
  meta: 1,
  google: 1,
  ga4: 0,
  outras: 0,
  lp: 0,
  sob: 0,
  dash: 0,
  nicho: null,
};

export type QuoteLine = {
  id: string;
  label: string;
  detail?: string;
  /** Quantidade, nas linhas de extras. */
  qty?: number;
  amount: number;
  kind: "monthly" | "once" | "included";
};

export type Quote = {
  /** Soma de todos os contadores. */
  accountsTotal: number;
  /** Contas que o plano aceita (o Base ignora "outras"). */
  accountsAccepted: number;
  /** Entre 1 e 30. */
  accountsBilled: number;
  /** Contas de outras plataformas guardadas fora do Base. */
  accountsOutside: number;
  /** Mais de 30 contas: sob consulta. */
  overLimit: boolean;
  /** Plano/mês no período escolhido. */
  monthly: number;
  monthlyMensal: number;
  monthlyAnual: number;
  /** Total cobrado por ano no anual (plano/mês × 12). */
  yearly: number;
  annualSaving: number;
  oneTime: number;
  twelveMonths: number;
  lines: QuoteLine[];
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function acceptedAccounts(s: PlanState): number {
  const core = s.meta + s.google + s.ga4;
  return s.plano === "base" ? core : core + s.outras;
}

export function planMonthly(plan: PlanId, period: Period, billed: number): number {
  const audio = plan === "avancado" ? AUDIO_ADDON : 0;
  return PLAN[plan][period] + (billed - 1) * EXTRA_ACCOUNT[plan][period] + audio;
}

/** Preço de entrada do plano, com 1 conta conectada. */
export function startingPrice(plan: PlanId, period: Period): number {
  return planMonthly(plan, period, 1);
}

export function quote(s: PlanState): Quote {
  const hasPlan = s.plano !== "sem";
  const accountsTotal = s.meta + s.google + s.ga4 + s.outras;
  const accountsAccepted = hasPlan ? acceptedAccounts(s) : 0;
  const accountsBilled = clamp(accountsAccepted, 1, MAX_ACCOUNTS_IN_PLAN);
  const accountsOutside = s.plano === "base" ? s.outras : 0;
  const overLimit = hasPlan && accountsAccepted > MAX_ACCOUNTS_IN_PLAN;

  const lines: QuoteLine[] = [];
  let monthlyMensal = 0;
  let monthlyAnual = 0;

  if (hasPlan) {
    const plan = s.plano as PlanId;
    monthlyMensal = planMonthly(plan, "mensal", accountsBilled);
    monthlyAnual = planMonthly(plan, "anual", accountsBilled);

    lines.push({
      id: "plan",
      label: `Plano ${PLAN_LABEL[plan]} + 1ª conta`,
      amount: PLAN[plan][s.periodo],
      kind: "monthly",
    });
    const extra = accountsBilled - 1;
    if (extra > 0) {
      const unit = EXTRA_ACCOUNT[plan][s.periodo];
      lines.push({
        id: "accounts",
        label: extra === 1 ? "1 conta a mais" : `${extra} contas a mais`,
        detail: `${extra} × ${brl(unit)}`,
        amount: extra * unit,
        kind: "monthly",
      });
    }
    if (plan === "avancado") {
      lines.push({
        id: "audio",
        label: "Análise por áudio",
        detail: "sem desconto no anual",
        amount: AUDIO_ADDON,
        kind: "monthly",
      });
    }
    if (plan === "pro" || plan === "avancado") {
      lines.push({
        id: "tracking",
        label: "Implantação do tracking",
        detail: `CAPI, conversões otimizadas e GA4 · juntos, valeria ${brl(PRO_TRACKING_VALUE, { decimals: false })} avulso`,
        amount: 0,
        kind: "included",
      });
    }
  }

  const extras: { id: string; label: string; qty: number; unit: number }[] = [
    { id: "lp", label: "Landing page com GTM", qty: s.lp, unit: LP_PRICE },
    { id: "sob", label: "Dashboard sob medida", qty: s.sob, unit: DASH_CUSTOM_PRICE },
    { id: "dash", label: "Dashboard adicional", qty: hasPlan ? s.dash : 0, unit: DASH_EXTRA_PRICE },
  ];
  let oneTime = 0;
  for (const e of extras) {
    if (e.qty <= 0) continue;
    const amount = e.qty * e.unit;
    oneTime += amount;
    lines.push({
      id: e.id,
      label: e.label,
      detail: `${e.qty} × ${brl(e.unit)}`,
      qty: e.qty,
      amount,
      kind: "once",
    });
  }

  const monthly = s.periodo === "anual" ? monthlyAnual : monthlyMensal;
  return {
    accountsTotal,
    accountsAccepted,
    accountsBilled,
    accountsOutside,
    overLimit,
    monthly,
    monthlyMensal,
    monthlyAnual,
    yearly: monthlyAnual * 12,
    annualSaving: (monthlyMensal - monthlyAnual) * 12,
    oneTime,
    twelveMonths: monthly * 12 + oneTime,
    lines,
  };
}

// ---- URL ----------------------------------------------------------------

const PLAN_CHOICES: PlanChoice[] = ["base", "pro", "avancado", "sem"];
const NUM_KEYS = ["meta", "google", "ga4", "outras", "lp", "sob", "dash"] as const;

export function toQuery(s: PlanState): string {
  const p = new URLSearchParams();
  p.set("plano", s.plano);
  p.set("periodo", s.periodo);
  for (const k of NUM_KEYS) p.set(k, String(s[k]));
  if (s.nicho) p.set("nicho", s.nicho);
  return p.toString();
}

export function fromQuery(params: { get(key: string): string | null }): Partial<PlanState> | null {
  if (!params.get("plano") && !params.get("periodo")) return null;
  const out: Partial<PlanState> = {};
  const plano = params.get("plano");
  if (plano && (PLAN_CHOICES as string[]).includes(plano)) out.plano = plano as PlanChoice;
  const periodo = params.get("periodo");
  if (periodo === "mensal" || periodo === "anual") out.periodo = periodo;
  for (const k of NUM_KEYS) {
    const raw = params.get(k);
    if (raw === null) continue;
    const n = Number.parseInt(raw, 10);
    if (Number.isNaN(n)) continue;
    const max = k === "lp" || k === "sob" || k === "dash" ? MAX_EXTRA : MAX_PER_PLATFORM;
    out[k] = clamp(n, 0, max);
  }
  const nicho = params.get("nicho");
  if (nicho === "ecommerce" || nicho === "imobiliario") out.nicho = nicho;
  return out;
}
