// WhatsApp do Brasil: DDD + número (celular com 9 na frente ou fixo). Guarda
// em E.164 (+55DDNNNNNNNNN), o formato que o banco aceita.

import { onlyDigits } from "./tax-id";

/** Número nacional (DDD + número) sem o 55, ou null. */
function national(raw: string): string | null {
  let d = onlyDigits(raw);
  // "0 71 99957-5898": o 0 de longa distância antes do DDD do celular
  if (d.length === 12 && d.startsWith("0")) d = d.slice(1);
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) d = d.slice(2);
  if (d.length !== 10 && d.length !== 11) return null;
  if (!/^[1-9]{2}/.test(d)) return null;
  if (d.length === 11 && d[2] !== "9") return null;
  return d;
}

/** "+5571999575898" ou null se não for um WhatsApp válido. */
export function normalizePhone(raw: string): string | null {
  const n = national(raw);
  return n ? `+55${n}` : null;
}

/** Máscara de digitação: "(71) 99957-5898". */
export function formatPhone(raw: string): string {
  let d = onlyDigits(raw);
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
  d = d.slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  const ddd = d.slice(0, 2);
  const rest = d.slice(2);
  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  const split = rest.length === 9 ? 5 : 4;
  return `(${ddd}) ${rest.slice(0, split)}-${rest.slice(split)}`;
}
