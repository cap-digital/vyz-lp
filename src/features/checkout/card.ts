// Cartão no navegador: bandeira, Luhn, validade e máscaras. Como na Stripe
// (Elements), o número e o CVC nunca saem do navegador: o servidor recebe só
// a bandeira, o final e a validade (CardSummary).

export const CARD_BRANDS = ["visa", "mastercard", "amex", "elo", "hipercard", "diners", "discover", "jcb"] as const;
export type CardBrand = (typeof CARD_BRANDS)[number];

export const CARD_BRAND_LABEL: Record<CardBrand, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  elo: "Elo",
  hipercard: "Hipercard",
  diners: "Diners Club",
  discover: "Discover",
  jcb: "JCB",
};

/** O que o servidor recebe do cartão. */
export type CardSummary = { brand: CardBrand; last4: string; expMonth: number; expYear: number };

/** Cartões de teste (os mesmos números da Stripe). */
export const TEST_CARDS = {
  approved: "4242 4242 4242 4242",
  declined: "4000 0000 0000 0002",
  insufficientFunds: "4000 0000 0000 9995",
} as const;

// Faixas de BIN (6 dígitos) do Elo e do Hipercard: vêm antes de Visa e Discover,
// que dividem o começo com eles.
const ELO: [number, number][] = [
  [401178, 401179],
  [431274, 431274],
  [438935, 438935],
  [451416, 451416],
  [457393, 457393],
  [457631, 457632],
  [504175, 504175],
  [506699, 506778],
  [509000, 509999],
  [627780, 627780],
  [636297, 636297],
  [636368, 636368],
  [650031, 650033],
  [650035, 650051],
  [650405, 650439],
  [650485, 650538],
  [650541, 650598],
  [650700, 650718],
  [650720, 650727],
  [650901, 650978],
  [651652, 651679],
  [655000, 655019],
  [655021, 655058],
];
const HIPERCARD = [606282, 384100, 384140, 384160, 637095, 637568, 637599, 637609, 637612];

const inRanges = (bin: number, ranges: [number, number][]) => ranges.some(([from, to]) => bin >= from && bin <= to);

export function detectBrand(number: string): CardBrand | null {
  const d = number.replace(/\D/g, "");
  if (!d) return null;
  if (d.length >= 6) {
    const bin = Number(d.slice(0, 6));
    if (inRanges(bin, ELO)) return "elo";
    if (HIPERCARD.includes(bin)) return "hipercard";
  }
  const p2 = Number(d.slice(0, 2));
  const p3 = Number(d.slice(0, 3));
  const p4 = Number(d.slice(0, 4));
  if (p2 === 34 || p2 === 37) return "amex";
  if (p2 === 36 || p2 === 38 || (p3 >= 300 && p3 <= 305)) return "diners";
  if (p4 === 6011 || p2 === 65 || (p3 >= 644 && p3 <= 649)) return "discover";
  if (p4 >= 3528 && p4 <= 3589) return "jcb";
  if ((p2 >= 51 && p2 <= 55) || (p4 >= 2221 && p4 <= 2720)) return "mastercard";
  if (d[0] === "4") return "visa";
  return null;
}

const LENGTHS: Record<CardBrand, number[]> = {
  visa: [13, 16, 19],
  mastercard: [16],
  amex: [15],
  elo: [16],
  hipercard: [13, 16, 19],
  diners: [14, 16],
  discover: [16, 19],
  jcb: [16, 19],
};

export const cvcLength = (brand: CardBrand | null) => (brand === "amex" ? 4 : 3);
export const maxCardLength = (brand: CardBrand | null) => (brand ? Math.max(...LENGTHS[brand]) : 19);

export function luhnValid(number: string): boolean {
  const d = number.replace(/\D/g, "");
  if (d.length < 12) return false;
  let sum = 0;
  for (let i = 0; i < d.length; i++) {
    let n = Number(d[d.length - 1 - i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 === 0;
}

/** Grupos de 4 (American Express: 4-6-5). */
export function formatCardNumber(raw: string): string {
  const brand = detectBrand(raw);
  const d = raw.replace(/\D/g, "").slice(0, maxCardLength(brand));
  if (brand === "amex") return [d.slice(0, 4), d.slice(4, 10), d.slice(10)].filter(Boolean).join(" ");
  return d.replace(/(\d{4})(?=\d)/g, "$1 ");
}

/** "1234" → "12/34". */
export function formatExpiry(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

/** "MM/AA" → mês e ano com 4 dígitos. */
export function parseExpiry(raw: string): { month: number; year: number } | null {
  const m = /^\s*(\d{2})\s*\/\s*(\d{2})\s*$/.exec(raw);
  if (!m) return null;
  const month = Number(m[1]);
  if (month < 1 || month > 12) return null;
  return { month, year: 2000 + Number(m[2]) };
}

/** Vale até o último dia do mês da validade. */
export function isExpired(exp: { month: number; year: number }, now: Date): boolean {
  return exp.year * 12 + exp.month < now.getFullYear() * 12 + now.getMonth() + 1;
}

/** Validade aceitável: não vencida e até 20 anos à frente. */
export function isValidExpiry(exp: { month: number; year: number }, now: Date): boolean {
  return !isExpired(exp, now) && exp.year <= now.getFullYear() + 20;
}

export type CardInput = { number: string; expiry: string; cvc: string; name: string };
export type CardErrors = Partial<Record<keyof CardInput, string>>;

/** Confere o formulário do cartão e devolve só o que pode ir ao servidor. */
export function validateCard(input: CardInput, now: Date): { ok: true; card: CardSummary } | { ok: false; errors: CardErrors } {
  const errors: CardErrors = {};
  const digits = input.number.replace(/\D/g, "");
  const brand = detectBrand(digits);
  if (!digits) errors.number = "Informe o número do cartão.";
  else if (!brand) errors.number = "Não reconhecemos a bandeira deste cartão.";
  else if (!LENGTHS[brand].includes(digits.length) || !luhnValid(digits)) errors.number = "Confira o número do cartão.";

  const exp = parseExpiry(input.expiry);
  if (!exp) errors.expiry = "Use o formato MM/AA.";
  else if (isExpired(exp, now)) errors.expiry = "Este cartão está vencido.";
  else if (!isValidExpiry(exp, now)) errors.expiry = "Confira a validade.";

  const cvc = input.cvc.replace(/\D/g, "");
  if (cvc.length !== cvcLength(brand)) errors.cvc = brand === "amex" ? "O código tem 4 dígitos." : "O código tem 3 dígitos.";

  const name = input.name.trim();
  if (name.length < 2) errors.name = "Informe o nome impresso no cartão.";
  else if (!/^[\p{L}][\p{L} .'-]*$/u.test(name)) errors.name = "Use só letras no nome.";

  if (Object.keys(errors).length || !brand || !exp) return { ok: false, errors };
  return { ok: true, card: { brand, last4: digits.slice(-4), expMonth: exp.month, expYear: exp.year } };
}
