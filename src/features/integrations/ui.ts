// Variações pequenas dos botões do painel (mesma base de components/ui/styles).
// Classes trocadas aqui, não somadas: no Tailwind, a ordem na string não decide
// qual cor vence.

import { btn } from "@/components/ui/styles";

/** Botão pequeno de contorno. */
export const btnSmallOutline = btn.secondary.replace("h-12 px-6", "h-9 px-4 text-sm");

/** Botão pequeno de ação destrutiva (desconectar, remover). */
export const btnSmallDanger = btn.small.replace("bg-accent text-on-accent", "bg-error text-white");
