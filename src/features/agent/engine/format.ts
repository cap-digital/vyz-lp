// Números das respostas do VYZ, sempre pt-BR via Intl.

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const INT = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const DEC = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const PCT = new Intl.NumberFormat("pt-BR", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: "exceptZero" });
const MONTH = new Intl.DateTimeFormat("pt-BR", { month: "long" });

/** Intl usa espaço inseparável depois do "R$"; aqui vira espaço comum (texto e voz). */
const plain = (s: string) => s.replace(/ /g, " ");

/** Centavos → "R$ 14.520,26". */
export const money = (cents: number) => plain(BRL.format(cents / 100));
export const count = (n: number) => plain(INT.format(Math.round(n)));
export const ratio = (n: number) => plain(DEC.format(n));
/** 0,054 → "+5,4%". */
export const change = (r: number) => plain(PCT.format(r));

/** "em outubro até hoje" (no dia 1º: "hoje, 1º de outubro"). */
export function periodLabel(now: Date): string {
  const month = MONTH.format(now);
  return now.getDate() === 1 ? `hoje, 1º de ${month}` : `em ${month} até hoje`;
}
