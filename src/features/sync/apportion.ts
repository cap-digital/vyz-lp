// Divide um total inteiro (centavos, impressões, cliques) em partes
// proporcionais que somam exatamente o total, pelo método dos maiores restos.
// É o que garante que anúncios somem a campanha, campanhas somem a conta e
// cada quebra some o dia, sem sobrar nem faltar uma unidade.

const positive = (x: number) => (Number.isFinite(x) && x > 0 ? x : 0);

/**
 * Reparte `total` (inteiro ≥ 0) pelos pesos. Peso 0 recebe 0; se todos forem
 * 0, divide por igual. Empate de resto vai para o maior peso e, depois, para
 * a primeira parte (resultado estável).
 */
export function apportion(total: number, weights: readonly number[]): number[] {
  const n = weights.length;
  const out = new Array<number>(n).fill(0);
  if (n === 0 || !(total > 0)) return out;
  let w = weights.map(positive);
  let sum = w.reduce((a, b) => a + b, 0);
  if (sum === 0) {
    w = w.map(() => 1);
    sum = n;
  }
  let given = 0;
  const rest: { i: number; frac: number }[] = [];
  for (let i = 0; i < n; i++) {
    if (w[i] === 0) continue;
    const exact = (total * w[i]) / sum;
    const base = Math.floor(exact);
    out[i] = base;
    given += base;
    rest.push({ i, frac: exact - base });
  }
  rest.sort((a, b) => b.frac - a.frac || w[b.i] - w[a.i] || a.i - b.i);
  for (let k = 0; given < total; k = (k + 1) % rest.length) {
    out[rest[k].i] += 1;
    given += 1;
  }
  return out;
}

/**
 * Como `apportion`, mas nenhuma parte passa do seu teto (ex.: cliques ≤
 * impressões da parte). O que estoura um teto vai para as outras, na
 * proporção dos pesos. Se os tetos somarem menos que o total, cada parte
 * fica no teto (quem chama garante que cabe).
 */
export function apportionCapped(total: number, weights: readonly number[], caps: readonly number[]): number[] {
  const n = weights.length;
  const out = new Array<number>(n).fill(0);
  const cap = caps.map((c) => Math.floor(positive(c)));
  let left = Math.min(Math.floor(positive(total)), cap.reduce((a, b) => a + b, 0));
  let open = cap.flatMap((c, i) => (c > 0 ? [i] : []));
  while (left > 0 && open.length > 0) {
    let w = open.map((i) => positive(weights[i]));
    if (w.every((x) => x === 0)) w = open.map((i) => cap[i] - out[i]);
    const share = apportion(left, w);
    const still: number[] = [];
    open.forEach((i, k) => {
      const take = Math.min(share[k], cap[i] - out[i]);
      out[i] += take;
      left -= take;
      if (out[i] < cap[i]) still.push(i);
    });
    open = still;
  }
  return out;
}
