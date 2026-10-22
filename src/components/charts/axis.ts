// Eixos em px reais: valores "redondos" no Y e rótulos do X espaçados pela
// largura medida (mais rótulos no largo, menos no estreito, sem encavalar).

import { textWidth } from "./labels";

/** Passo "redondo" (1, 2, 2,5, 5 × 10ⁿ) para cobrir o intervalo em até `count` faixas. */
export function niceStep(span: number, count: number): number {
  const raw = span / Math.max(1, count);
  const mag = 10 ** Math.floor(Math.log10(raw || 1));
  const n = raw / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
}

/** Ticks do Y dentro de [min, max], com a quantidade que cabe na altura. */
export function yTicks(min: number, max: number, plotH: number, minGap = 36): { lo: number; hi: number; ticks: number[] } {
  const count = Math.max(2, Math.min(5, Math.floor(plotH / minGap)));
  const step = niceStep(max - min, count);
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Number(v.toFixed(6)));
  return { lo, hi, ticks };
}

const DAY_STEPS = [1, 2, 3, 4, 5, 7, 10, 14, 15, 21, 30];

/**
 * Índices que recebem rótulo no X. O último ponto sempre leva rótulo; os
 * outros vêm de trás para a frente no passo que cabe na largura.
 */
export function xTickIndices(n: number, plotW: number, labelW: number, gap = 14): number[] {
  if (n <= 0) return [];
  const slot = n > 1 ? plotW / (n - 1) : plotW;
  const step = DAY_STEPS.find((s) => s * slot >= labelW + gap) ?? Math.ceil((labelW + gap) / slot);
  const out: number[] = [];
  for (let i = n - 1; i >= 0; i -= step) out.unshift(i);
  // o último rótulo encosta à direita (âncora no fim): o vizinho precisa de meia largura a mais
  if (out.length > 1 && (out.at(-1)! - out.at(-2)!) * slot < labelW * 1.5 + gap) out.splice(-2, 1);
  // o primeiro rótulo não pode vazar pela esquerda (fica centralizado no tick)
  if (out.length > 1 && out[0] * slot < labelW / 2) out.shift();
  return out;
}

/** Largura estimada do rótulo mais largo. */
export const widest = (labels: string[], fontSize: number) => Math.max(0, ...labels.map((l) => textWidth(l, fontSize)));
