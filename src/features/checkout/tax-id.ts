// CPF e CNPJ: dígitos verificadores (módulo 11) e máscara de digitação. Desde
// julho de 2026 o CNPJ pode ser alfanumérico: 12 caracteres (dígitos ou
// letras) + 2 dígitos verificadores, e cada caractere vale o código ASCII
// menos 48 ("0" = 0, "A" = 17). O banco guarda sem pontuação, em maiúsculas
// (CPF: 11 dígitos; CNPJ: 14 caracteres).

export type TaxIdKind = "cpf" | "cnpj";

export const onlyDigits = (value: string) => value.replace(/\D/g, "");

/** Sem pontuação e em maiúsculas: "12.abc.345/01de-35" → "12ABC34501DE35". */
export const normalizeTaxId = (value: string) => value.toUpperCase().replace(/[^0-9A-Z]/g, "");

const CPF = /^\d{11}$/;
const CNPJ = /^[0-9A-Z]{12}\d{2}$/;

const CPF_WEIGHTS = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
const CNPJ_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

/** Dígito verificador: os pesos são os últimos `base.length` da lista. */
function checkDigit(base: string, weights: number[]): number {
  const w = weights.slice(weights.length - base.length);
  let sum = 0;
  for (let i = 0; i < base.length; i++) sum += (base.charCodeAt(i) - 48) * w[i];
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

function valid(value: string, weights: number[]): boolean {
  if (/^(.)\1+$/.test(value)) return false;
  const base = value.slice(0, -2);
  const first = checkDigit(base, weights);
  const second = checkDigit(base + first, weights);
  return value.endsWith(`${first}${second}`);
}

export function isValidCpf(value: string): boolean {
  const v = normalizeTaxId(value);
  return CPF.test(v) && valid(v, CPF_WEIGHTS);
}

export function isValidCnpj(value: string): boolean {
  const v = normalizeTaxId(value);
  return CNPJ.test(v) && valid(v, CNPJ_WEIGHTS);
}

/** "cpf" (11 dígitos), "cnpj" (12 caracteres + 2 dígitos) ou null. */
export function taxIdKind(value: string): TaxIdKind | null {
  const v = normalizeTaxId(value);
  return CPF.test(v) ? "cpf" : CNPJ.test(v) ? "cnpj" : null;
}

export function isValidTaxId(value: string): boolean {
  const kind = taxIdKind(value);
  return kind === "cpf" ? isValidCpf(value) : kind === "cnpj" ? isValidCnpj(value) : false;
}

/** Máscara progressiva: até 11 dígitos como CPF; depois (ou com letra) como CNPJ. */
export function formatTaxId(value: string): string {
  const v = normalizeTaxId(value);
  if (v.length <= 11 && /^\d*$/.test(v)) {
    return v
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
  }
  // CNPJ: os 2 últimos são sempre dígitos (verificadores)
  const head = v.slice(0, 12);
  const tail = onlyDigits(v.slice(12)).slice(0, 2);
  const parts = [head.slice(0, 2), head.slice(2, 5), head.slice(5, 8)].filter(Boolean).join(".");
  const branch = head.slice(8, 12);
  return parts + (branch ? `/${branch}` : "") + (tail ? `-${tail}` : "");
}

/** Para exibir sem expor o documento inteiro: "***.982.247-**". */
export function maskTaxId(value: string | null | undefined): string | null {
  if (!value) return null;
  const formatted = formatTaxId(value);
  return taxIdKind(value) === "cpf" ? `***${formatted.slice(3, 11)}-**` : formatted;
}
