import { brl, joinPt } from "./format";
import {
  NICHO_LABEL,
  PERIOD_LABEL,
  PLAN_LABEL,
  WHATSAPP_NUMBER,
  type PlanState,
  type Quote,
} from "./pricing";

export function waLink(text: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

export const MSG_SPECIALIST = "Olá, VYZ! Quero montar um plano com um especialista.";
export const MSG_SEGMENT = "Olá, VYZ! Quero um dashboard para o meu segmento: ";
export const MSG_OVER_30 =
  "Olá, VYZ! Tenho mais de 30 contas para conectar e quero montar um plano com um especialista.";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function describeAccounts(s: PlanState): string {
  const parts: string[] = [];
  if (s.meta) parts.push(plural(s.meta, "BM do Meta", "BMs do Meta"));
  if (s.google) parts.push(plural(s.google, "conta do Google Ads", "contas do Google Ads"));
  if (s.ga4) parts.push(plural(s.ga4, "propriedade do GA4", "propriedades do GA4"));
  if (s.outras && s.plano !== "base")
    parts.push(plural(s.outras, "conta de outra plataforma", "contas de outras plataformas"));
  return joinPt(parts);
}

function describeExtras(s: PlanState): string[] {
  const items: string[] = [];
  if (s.lp) items.push(`${s.lp}× Landing page`);
  if (s.sob) items.push(`${s.sob}× Dashboard sob medida`);
  if (s.dash && s.plano !== "sem") items.push(`${s.dash}× Dashboard adicional`);
  return items;
}

export function buildPlanMessage(s: PlanState, q: Quote, url: string): string {
  if (q.overLimit) {
    return [
      `Olá, VYZ! Tenho ${q.accountsAccepted} contas para conectar e quero montar um plano com um especialista.`,
      `Simulação: ${url}`,
    ].join("\n");
  }

  const extras = describeExtras(s);

  if (s.plano === "sem") {
    const lines = ["Olá, VYZ! Quero só os extras:"];
    for (const l of q.lines) {
      if (l.kind === "once") lines.push(`• ${l.qty}× ${l.label}: ${brl(l.amount)}`);
    }
    if (q.oneTime === 0) lines.push("• Ainda não escolhi os extras");
    if (s.nicho) lines.push(`• Tipo de negócio: ${NICHO_LABEL[s.nicho]}`);
    if (q.oneTime > 0) lines.push(`• Uma vez: ${brl(q.oneTime)}`);
    lines.push(`Simulação: ${url}`, "Podemos seguir?");
    return lines.join("\n");
  }

  const lines = [
    "Olá, VYZ! Montei meu plano no site:",
    `• Plano ${PLAN_LABEL[s.plano]}, ${PERIOD_LABEL[s.periodo]}`,
  ];
  if (q.accountsAccepted === 0) {
    lines.push("• Ainda não sei quantas contas vou conectar");
  } else {
    lines.push(`• ${plural(q.accountsAccepted, "conta", "contas")} (${describeAccounts(s)})`);
  }
  if (q.accountsOutside > 0) {
    lines.push(
      `• + ${plural(q.accountsOutside, "conta", "contas")} de outras plataformas (${q.accountsOutside === 1 ? "fica" : "ficam"} fora do Base)`,
    );
  }
  if (s.nicho) lines.push(`• Tipo de negócio: ${NICHO_LABEL[s.nicho]}`);
  if (extras.length) lines.push(`• Extras: ${extras.join(", ")}`);
  const from = q.accountsAccepted === 0 ? "a partir de " : "";
  const year = s.periodo === "anual" ? ` (${brl(q.yearly)} no ano)` : "";
  lines.push(`• Todo mês: ${from}${brl(q.monthly)}${year}`);
  if (q.oneTime > 0) lines.push(`• Uma vez: ${brl(q.oneTime)}`);
  lines.push(`Simulação: ${url}`, "Podemos seguir?");
  return lines.join("\n");
}

/** Resumo em texto puro para o botão "Copiar resumo". */
export function buildSummary(s: PlanState, q: Quote, url: string, date: string): string {
  const head =
    s.plano === "sem"
      ? "VYZ · Sem plano (só extras)"
      : `VYZ · Plano ${PLAN_LABEL[s.plano]}, ${PERIOD_LABEL[s.periodo]}`;
  const lines = [head];
  if (q.overLimit) {
    lines.push(`${q.accountsAccepted} contas · Sob consulta`);
  } else {
    for (const l of q.lines) {
      const value = l.kind === "included" ? "R$ 0,00 (incluso)" : brl(l.amount);
      lines.push(`${l.label}${l.detail && l.kind !== "included" ? ` (${l.detail})` : ""}: ${value}`);
    }
    if (s.plano !== "sem") lines.push(`Todo mês: ${brl(q.monthly)}`);
    if (q.oneTime > 0) lines.push(`Uma vez: ${brl(q.oneTime)}`);
    lines.push(`Em 12 meses: ${brl(q.twelveMonths)}`);
  }
  lines.push(`Simulação · não é cobrança · ${date}`, url);
  return lines.join("\n");
}
