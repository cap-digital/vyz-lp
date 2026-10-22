// Posicionamento simples de rótulos sem colisão: tenta cada posição candidata
// em ordem e fica com a primeira que cabe na área e não encosta em nada.

export type Rect = { x: number; y: number; w: number; h: number };

export function intersects(a: Rect, b: Rect, gap = 2): boolean {
  return a.x < b.x + b.w + gap && a.x + a.w + gap > b.x && a.y < b.y + b.h + gap && a.y + a.h + gap > b.y;
}

export function inside(r: Rect, box: Rect): boolean {
  return r.x >= box.x && r.y >= box.y && r.x + r.w <= box.x + box.w && r.y + r.h <= box.y + box.h;
}

/** Largura aproximada de um texto (Inter, peso 500–700). */
export function textWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.58;
}

/**
 * Primeira posição livre entre as candidatas. Se nenhuma couber, devolve a que
 * menos sobrepõe (nunca fora da área).
 */
export function placeLabel(candidates: Rect[], obstacles: Rect[], box: Rect): Rect {
  const clamp = (r: Rect): Rect => ({
    ...r,
    x: Math.min(Math.max(r.x, box.x), box.x + box.w - r.w),
    y: Math.min(Math.max(r.y, box.y), box.y + box.h - r.h),
  });
  for (const c of candidates) {
    if (inside(c, box) && !obstacles.some((o) => intersects(c, o))) return c;
  }
  // fallback: a candidata (já dentro da área) com menos colisões
  const scored = candidates.map(clamp).map((c) => ({ c, hits: obstacles.filter((o) => intersects(c, o)).length }));
  scored.sort((a, b) => a.hits - b.hits);
  return scored[0].c;
}

/**
 * Candidatas ao redor de um ponto, em ordem de preferência: direita, esquerda,
 * acima e abaixo; depois as diagonais; depois um segundo anel mais afastado.
 */
export function aroundPoint(cx: number, cy: number, r: number, w: number, h: number, pad = 6): Rect[] {
  const ring = (d: number): Rect[] => [
    { x: cx + r + d, y: cy - h / 2, w, h },
    { x: cx - r - d - w, y: cy - h / 2, w, h },
    { x: cx - w / 2, y: cy - r - d - h, w, h },
    { x: cx - w / 2, y: cy + r + d, w, h },
    { x: cx + r + d * 0.5, y: cy - r - d - h, w, h },
    { x: cx - r - d * 0.5 - w, y: cy - r - d - h, w, h },
    { x: cx + r + d * 0.5, y: cy + r + d, w, h },
    { x: cx - r - d * 0.5 - w, y: cy + r + d, w, h },
  ];
  return [...ring(pad), ...ring(pad * 3)];
}

/**
 * Candidatas nos cantos de uma região (rótulo de quadrante): primeiro os
 * cantos por dentro; se a região for pequena, encostado nos cantos por fora.
 */
export function cornersOf(region: Rect, w: number, h: number, pad = 6): Rect[] {
  const r = region;
  return [
    { x: r.x + r.w - w - pad, y: r.y + pad, w, h },
    { x: r.x + pad, y: r.y + pad, w, h },
    { x: r.x + r.w - w - pad, y: r.y + r.h - h - pad, w, h },
    { x: r.x + pad, y: r.y + r.h - h - pad, w, h },
    // por fora: abaixo da região (direita e esquerda) e à esquerda do topo
    { x: r.x + r.w - w, y: r.y + r.h + pad, w, h },
    { x: r.x, y: r.y + r.h + pad, w, h },
    { x: r.x - w - pad, y: r.y + pad, w, h },
    { x: r.x - w - pad, y: r.y + r.h - h, w, h },
  ];
}
