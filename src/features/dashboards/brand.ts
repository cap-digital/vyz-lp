// Cor da marca própria (Personalizado) aplicada aos tokens do dashboard, igual
// nos dois modos. Pura: serve ao painel, ao link público e ao PDF.

import type { CSSProperties } from "react";

/** Texto legível sobre a cor (contraste pela luminância relativa). */
export function onColor(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "#ffffff";
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? "#1e1e1e" : "#ffffff";
}

/** Variáveis de cor da marca; sem cor, nada muda. */
export function brandVars(color?: string | null): CSSProperties | undefined {
  if (!color || !/^#[0-9a-f]{6}$/i.test(color)) return undefined;
  return { "--accent": color, "--on-accent": onColor(color) } as CSSProperties;
}
