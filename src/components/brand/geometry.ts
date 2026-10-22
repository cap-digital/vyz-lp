// Construção do wordmark (Brand Showcase, pág. 8): malha de 10 unidades de
// altura, letras de 10 × 10 com 2 unidades de vão. Corte horizontal entre 4,2
// e 5,3 nas duas pernas do V e só na diagonal do Z. O Y fica inteiro.

const CUT_TOP = 4.2;
const CUT_BOTTOM = 5.3;

// V: bordas externas (0,0)→(3,2;10) e (10,0)→(6,8;10); internas partem de
// (3,8;0) e (6,2;0) e se encontram em (5;5,2), dentro do corte.
const vOuter = (y: number) => 0.32 * y;
const vInner = (y: number) => 3.8 + (1.2 / 5.2) * y;

export const V_POLYS: string[] = [
  // perna esquerda
  `0,0 3.8,0 ${vInner(CUT_TOP)},${CUT_TOP} ${vOuter(CUT_TOP)},${CUT_TOP}`,
  // perna direita
  `10,0 6.2,0 ${10 - vInner(CUT_TOP)},${CUT_TOP} ${10 - vOuter(CUT_TOP)},${CUT_TOP}`,
  // base
  `${vOuter(CUT_BOTTOM)},${CUT_BOTTOM} ${10 - vOuter(CUT_BOTTOM)},${CUT_BOTTOM} 6.8,10 3.2,10`,
];

export const Y_POLYS: string[] = [
  "0,0 3.8,0 5,3.4 6.2,0 10,0 6.8,5.6 6.8,10 3.2,10 3.2,5.6",
];

// Z: barras de 0–3,4 e 6,6–10; diagonal com inclinação de −1,5 (dx/dy).
const zLeft = (y: number) => 4.8 - 1.5 * (y - 3.4);
const zRight = (y: number) => 10 - 1.5 * (y - 3.4);

export const Z_POLYS: string[] = [
  `0,0 10,0 10,3.4 ${zRight(CUT_TOP)},${CUT_TOP} ${zLeft(CUT_TOP)},${CUT_TOP} 4.8,3.4 0,3.4`,
  `${zLeft(CUT_BOTTOM)},${CUT_BOTTOM} ${zRight(CUT_BOTTOM)},${CUT_BOTTOM} 5.2,6.6 10,6.6 10,10 0,10 0,6.6`,
];

export const WORDMARK_WIDTH = 34;
export const LETTER_STEP = 12;
