// Dados fictícios e determinísticos dos mocks: o mesmo nome + tipo + modo
// gera sempre o mesmo painel. Valores em centavos quando são dinheiro.

export type MockMode = "dashboard" | "landing";
export type MockTipo = "ecommerce" | "imobiliario";

/** FNV-1a 32 bits. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: rápido, pequeno e estável entre servidor e navegador. */
export function rng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (min: number, max: number) => min + next() * (max - min),
    int: (min: number, max: number) => Math.floor(min + next() * (max - min + 1)),
  };
}

export function seedFor(name: string, tipo: string, mode: MockMode): number {
  return hash(`${name.trim().toLowerCase()}|${tipo}|${mode}`);
}

const round = (n: number, step = 1) => Math.round(n / step) * step;

export type FunnelStep = { label: string; pct: number };

/** Índice da etapa que recebe a maior queda relativa. */
export function biggestDrop(steps: FunnelStep[]): number {
  let idx = 1;
  let worst = -1;
  for (let i = 1; i < steps.length; i++) {
    const loss = 1 - steps[i].pct / steps[i - 1].pct;
    if (loss > worst) {
      worst = loss;
      idx = i;
    }
  }
  return idx;
}

function movingAverage(values: number[], window = 7): number[] {
  return values.map((_, i) => {
    const from = Math.max(0, i - window + 1);
    const slice = values.slice(from, i + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

export type EcommerceData = {
  kind: "ecommerce";
  cpv: number; // custo por venda
  cpvDelta: number; // variação vs semana anterior (negativo = caiu)
  sales: number;
  salesMeta: number;
  salesGoogle: number;
  revenue: number;
  revenueDelta: number; // vs 4 semanas
  roas: number;
  breakEven: number;
  daily: number[]; // custo por venda diário (28 dias)
  avg: number[]; // média móvel de 7 dias
  goal: number;
  maturingDays: number;
  funnel: FunnelStep[];
};

export type ImobData = {
  kind: "imobiliario";
  cpl: number; // custo por lead qualificado
  cplDelta: number; // em centavos, vs mês anterior
  qualified: number;
  leads: number;
  visits: number;
  visitsDelta: number;
  invest: number;
  budgetShare: number;
  projects: { name: string; invest: number; cpl: number; bad?: boolean }[];
  funnel: FunnelStep[];
};

export function ecommerceData(seed: number): EcommerceData {
  const r = rng(seed);
  const cpv = round(r.range(3800, 8800));
  const sales = r.int(320, 1400);
  // Meta e Google atribuem a mesma venda: a soma passa das confirmadas
  const salesMeta = Math.round(sales * r.range(0.7, 0.86));
  const salesGoogle = Math.round(sales * r.range(0.5, 0.66));
  const roas = round(r.range(2.3, 4.4), 0.1);
  const ticket = cpv * roas;
  const revenue = round(sales * ticket, 100);
  const breakEven = round(r.range(2.0, 2.7), 0.1);

  const days = 28;
  const trend = r.range(-0.12, 0.06);
  const daily = Array.from({ length: days }, (_, i) => {
    const base = cpv * (1 - trend * (1 - i / (days - 1)));
    return base * (1 + r.range(-0.16, 0.16));
  });
  const goal = round(cpv * r.range(0.86, 0.98), 500);

  const carrinho = r.int(34, 48);
  const checkout = Math.min(carrinho - 6, r.int(21, 31));
  const compra = Math.min(checkout - 3, r.int(13, 22));

  return {
    kind: "ecommerce",
    cpv,
    cpvDelta: round(r.range(-0.12, -0.03), 0.001),
    sales,
    salesMeta,
    salesGoogle,
    revenue,
    revenueDelta: round(r.range(-0.14, 0.12), 0.001),
    roas,
    breakEven,
    daily,
    avg: movingAverage(daily),
    goal,
    maturingDays: 3,
    funnel: [
      { label: "Produto", pct: 100 },
      { label: "Carrinho", pct: carrinho },
      { label: "Checkout", pct: checkout },
      { label: "Compra", pct: compra },
    ],
  };
}

export function imobData(seed: number): ImobData {
  const r = rng(seed);
  const cpl = round(r.range(4200, 11800));
  const qualified = r.int(480, 1600);
  const leads = Math.round(qualified / r.range(0.52, 0.7));
  const invest = round(cpl * qualified, 10000);

  const count = r.int(6, 7);
  const letters = "ABCDEFG";
  const badIndex = r.int(0, count - 1);
  const projects = Array.from({ length: count }, (_, i) => {
    if (i === badIndex) {
      return { name: `Empr. ${letters[i]}`, invest: r.range(0.78, 0.95), cpl: r.range(0.78, 0.92), bad: true };
    }
    return { name: `Empr. ${letters[i]}`, invest: r.range(0.08, 0.66), cpl: r.range(0.12, 0.48) };
  });

  const contato = r.int(55, 70);
  const visita = r.int(20, 30);
  const proposta = Math.min(visita - 6, r.int(9, 15));

  return {
    kind: "imobiliario",
    cpl,
    cplDelta: -round(r.range(200, 1400), 10),
    qualified,
    leads,
    visits: r.int(140, 420),
    visitsDelta: round(r.range(0.04, 0.18), 0.01),
    invest,
    budgetShare: round(r.range(0.6, 0.9), 0.01),
    projects,
    funnel: [
      { label: "Lead", pct: 100 },
      { label: "Contato", pct: contato },
      { label: "Visita", pct: visita },
      { label: "Proposta", pct: proposta },
    ],
  };
}

/** Pequena variação determinística para o painel "ao vivo". */
export function liveJitter(seed: number, tick: number): { kpi: number; factor: number } {
  const r = rng(seed ^ Math.imul(tick + 1, 0x9e3779b1));
  return { kpi: r.int(0, 2), factor: 1 + r.range(-0.018, 0.018) };
}

export const LANDING_COPY: Record<MockTipo, { h1: string; sub: string; cta: string; fields: string[]; path: string }> = {
  ecommerce: {
    h1: "A coleção nova chegou. Entrega em 48 h.",
    sub: "Escolha, pague no Pix e receba em casa. Troca fácil em até 30 dias.",
    cta: "Quero 10% na primeira compra",
    fields: ["Nome", "E-mail", "WhatsApp"],
    path: "colecao",
  },
  imobiliario: {
    h1: "2 e 3 quartos a 5 minutos do metrô.",
    sub: "Agende uma visita ao decorado com um corretor e conheça as condições de lançamento.",
    cta: "Agendar visita",
    fields: ["Nome", "WhatsApp", "Quantos quartos?"],
    path: "lancamento",
  },
};

export function slugify(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 22) || "suamarca"
  );
}
