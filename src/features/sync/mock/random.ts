// Aleatório do gerador: cada número sai de uma sequência própria, identificada
// pela conta, pela entidade e pela data. Assim o mesmo dia gera sempre os
// mesmos números, qualquer que seja o período pedido.

import { hash, rng, type Rng } from "@/lib/random";

/** Mistura final do murmur3: chaves parecidas ("…|2026-10-01", "…|2026-10-02") viram seeds bem diferentes. */
function mix(h: number): number {
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

export function stream(...parts: (string | number)[]): Rng {
  return rng(mix(hash(parts.join("|"))));
}

export const between = (r: Rng, [min, max]: readonly [number, number]) => r.range(min, max);

/** Fator perto de 1, entre 1 − spread e 1 + spread, mais provável no centro. */
export function jitter(r: Rng, spread: number): number {
  return 1 + spread * ((r.next() + r.next() + r.next()) / 1.5 - 1);
}

/** Arredonda sorteando a fração (2,3 vira 3 com 30% de chance): as somas não ficam enviesadas. */
export function roundRandom(r: Rng, value: number): number {
  if (!(value > 0)) return 0;
  const base = Math.floor(value);
  return base + (r.next() < value - base ? 1 : 0);
}

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Id numérico estável no formato da plataforma (ex.: 18 dígitos no Meta). */
export function numericId(prefix: string, length: number, ...parts: (string | number)[]): string {
  const r = stream("id", ...parts);
  let id = prefix;
  while (id.length < length) id += r.int(0, 9);
  return id;
}
