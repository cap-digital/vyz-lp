"use client";

import { Check, FileText, Link2, MousePointer2 } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Icon } from "@/components/brand/Icon";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Painel que se transforma conforme o passo ativo do "Como funciona". */
export function StoryPanel({ step }: { step: number }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  // a cena só monta quando o painel aparece; os loops pausam fora da tela
  const seen = useInView(ref, { once: true, margin: "0px 0px -15% 0px" });
  const visible = useInView(ref);
  const active = seen && visible;
  return (
    <div
      ref={ref}
      role="img"
      aria-label={
        [
          "Ilustração: Meta Ads, Google Ads, GA4 e outras plataformas se conectando ao painel.",
          "Ilustração: o layout do dashboard muda entre o template de e-commerce e o de imobiliário.",
          "Ilustração: o dashboard vira um link compartilhável e um PDF.",
        ][step]
      }
      className="relative h-full min-h-[340px] overflow-hidden rounded-card border border-line bg-bg"
    >
      <span className="absolute top-3 left-4 z-10 text-[11px] font-medium tracking-[0.08em] text-fg-2 uppercase">
        Passo 0{step + 1}
      </span>
      <AnimatePresence mode="wait" initial={false}>
        {seen && (
        <motion.div
          key={step}
          className="absolute inset-0"
          initial={reduce ? { opacity: 0 } : { clipPath: "inset(50% 0 50% 0)" }}
          animate={reduce ? { opacity: 1 } : { clipPath: "inset(0% 0 0% 0)" }}
          exit={reduce ? { opacity: 0 } : { clipPath: "inset(50% 0 50% 0)", transition: { duration: 0.25 } }}
          transition={{ duration: reduce ? 0.15 : 0.5, ease: EASE }}
        >
          {step === 0 && <ConnectScene active={active} />}
          {step === 1 && <TemplateScene active={active} />}
          {step === 2 && <SendScene active={active} />}
        </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const CHIPS = [
  { label: "Meta Ads", x: 5, y: 22, side: -1 },
  { label: "Google Ads", x: 5, y: 46, side: -1 },
  { label: "GA4", x: 5, y: 70, side: -1 },
  { label: "TikTok Ads", x: 73, y: 16, side: 1, pro: true },
  { label: "LinkedIn Ads", x: 73, y: 36, side: 1, pro: true },
  { label: "Mercado Ads", x: 73, y: 56, side: 1, pro: true },
  { label: "HubSpot", x: 73, y: 76, side: 1, pro: true },
];

function ConnectScene({ active }: { active: boolean }) {
  const reduce = useReducedMotion();
  const play = active && !reduce;
  return (
    <div className="absolute inset-0">
      {/* linhas de dados até o painel */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        {CHIPS.map((c, i) => {
          const fromX = c.side < 0 ? 27 : 73;
          const toX = c.side < 0 ? 38 : 62;
          const y = c.y + 3;
          return (
            <motion.path
              key={c.label}
              d={`M${fromX},${y} C${(fromX + toX) / 2},${y} ${(fromX + toX) / 2},50 ${toX},50`}
              fill="none"
              stroke={c.pro ? "var(--muted)" : "var(--accent)"}
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
              initial={play ? { pathLength: 0 } : false}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.55 + i * 0.07, duration: 0.6, ease: EASE }}
            />
          );
        })}
      </svg>
      {/* painel */}
      <div className="absolute top-[24%] left-[38%] h-[52%] w-[24%] rounded-[10px] border border-line bg-card p-[4%]">
        <div className="mx-auto w-1/3">
          <Icon className="text-accent" />
        </div>
        <div className="mt-[10%] space-y-[8%]">
          {[80, 56, 68].map((w, i) => (
            <motion.div
              key={w}
              className="h-1.5 origin-left rounded-full bg-accent"
              style={{ width: `${w}%`, opacity: 1 - i * 0.25 }}
              initial={play ? { scaleX: 0 } : false}
              animate={{ scaleX: 1 }}
              transition={{ delay: 1.1 + i * 0.12, duration: 0.6, ease: EASE }}
            />
          ))}
        </div>
      </div>
      {CHIPS.map((c, i) => (
        <motion.span
          key={c.label}
          className={`absolute inline-flex items-center gap-1 rounded-chip border px-2.5 py-1 text-[11px] font-medium whitespace-nowrap sm:text-[12px] ${
            c.pro ? "border-line bg-card text-fg-2" : "border-transparent bg-accent text-on-accent"
          }`}
          style={{ left: `${c.x}%`, top: `${c.y}%` }}
          initial={play ? { x: c.side * 220, y: (i % 2 ? -1 : 1) * 40, rotate: c.side * 12, opacity: 0 } : false}
          animate={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 140, damping: 16, delay: i * 0.06 }}
        >
          {c.label}
          {c.pro && <span className="rounded-chip bg-accent-soft px-1 text-[9px] text-fg">Pro</span>}
        </motion.span>
      ))}
    </div>
  );
}

type Rect = { l: number; t: number; w: number; h: number };
const TILES: { id: string; label: string; kind: "kpi" | "line" | "funnel" | "scatter" }[] = [
  { id: "k1", label: "CPA", kind: "kpi" },
  { id: "k2", label: "Vendas", kind: "kpi" },
  { id: "k3", label: "ROAS", kind: "kpi" },
  { id: "main", label: "Custo por venda", kind: "line" },
  { id: "side", label: "Funil", kind: "funnel" },
];
const LAYOUTS: Record<"ecom" | "imob", Record<string, Rect>> = {
  ecom: {
    k1: { l: 6, t: 20, w: 28, h: 18 },
    k2: { l: 36, t: 20, w: 28, h: 18 },
    k3: { l: 66, t: 20, w: 28, h: 18 },
    main: { l: 6, t: 42, w: 56, h: 50 },
    side: { l: 64, t: 42, w: 30, h: 50 },
  },
  imob: {
    main: { l: 6, t: 20, w: 58, h: 46 },
    k1: { l: 66, t: 20, w: 28, h: 14 },
    k2: { l: 66, t: 36, w: 28, h: 14 },
    k3: { l: 66, t: 52, w: 28, h: 14 },
    side: { l: 6, t: 70, w: 88, h: 22 },
  },
};

function TemplateScene({ active }: { active: boolean }) {
  const reduce = useReducedMotion();
  const [layout, setLayout] = useState<"ecom" | "imob">("ecom");
  useEffect(() => {
    if (!active || reduce) return;
    const iv = window.setInterval(() => setLayout((l) => (l === "ecom" ? "imob" : "ecom")), 2300);
    return () => window.clearInterval(iv);
  }, [active, reduce]);

  return (
    <div className="absolute inset-0">
      <div className="absolute top-3 right-4 z-10 flex gap-1.5 text-[11px]">
        {(["ecom", "imob"] as const).map((k) => (
          <span key={k} className={`rounded-chip px-2.5 py-0.5 transition-colors duration-300 ${layout === k ? "bg-accent text-on-accent" : "border border-line text-fg-2"}`}>
            {k === "ecom" ? "E-commerce" : "Imobiliário"}
          </span>
        ))}
      </div>
      <LayoutGroup>
        {TILES.map((t) => {
          const r = LAYOUTS[layout][t.id];
          const kind = t.id === "main" ? (layout === "ecom" ? "line" : "scatter") : t.kind;
          return (
            <motion.div
              key={t.id}
              layout
              transition={{ type: "spring", stiffness: 170, damping: 22 }}
              className="absolute overflow-hidden rounded-[10px] border border-line bg-card p-2.5"
              style={{ left: `${r.l}%`, top: `${r.t}%`, width: `${r.w}%`, height: `${r.h}%` }}
            >
              <motion.p layout="position" className="text-[10px] font-medium tracking-[0.06em] text-fg-2 uppercase">
                {t.id === "main" ? (layout === "ecom" ? "Custo por venda" : "Investimento × CPL") : t.id === "k1" && layout === "imob" ? "CPL" : t.label}
              </motion.p>
              {kind === "kpi" && <div className="mt-1.5 h-2.5 w-3/5 rounded-full bg-fg/80" />}
              {kind === "line" && (
                <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="mt-2 h-[70%] w-full" aria-hidden>
                  <path d="M0,30 L15,24 L30,27 L45,18 L60,20 L75,12 L100,9" fill="none" stroke="var(--accent)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                  <line x1="0" x2="100" y1="20" y2="20" stroke="var(--fg-2)" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
                </svg>
              )}
              {kind === "scatter" && (
                <svg viewBox="0 0 100 50" className="mt-1 h-[75%] w-full" aria-hidden>
                  {[
                    [12, 40],
                    [28, 30],
                    [40, 36],
                    [55, 26],
                    [66, 32],
                  ].map(([x, y]) => (
                    <circle key={x} cx={x} cy={y} r="3.4" fill="var(--accent)" />
                  ))}
                  <circle cx="86" cy="10" r="4.2" fill="#C9442E" />
                </svg>
              )}
              {kind === "funnel" && (
                <div className="mt-2 space-y-1.5">
                  {[100, 62, 34, 20].map((w, i) => (
                    <div key={w} className="h-1.5 rounded-full" style={{ width: `${w}%`, background: ["var(--seq-a)", "var(--seq-b)", "var(--seq-c)", "var(--seq-d)"][i] }} />
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}
      </LayoutGroup>
    </div>
  );
}

function SendScene({ active }: { active: boolean }) {
  const reduce = useReducedMotion();
  const [cycle, setCycle] = useState(0);
  useEffect(() => {
    if (!active || reduce) return;
    const iv = window.setInterval(() => setCycle((c) => c + 1), 4200);
    return () => window.clearInterval(iv);
  }, [active, reduce]);
  const play = !reduce;

  return (
    <div key={cycle} className="absolute inset-0 flex items-center justify-center">
      {/* folha de PDF que desliza para fora */}
      <motion.div
        className="absolute flex h-[52%] w-[34%] flex-col rounded-[8px] border border-line bg-card p-3"
        style={{ left: "38%", top: "26%" }}
        initial={play ? { x: 0, y: 0, rotate: 0, opacity: 0 } : false}
        animate={{ x: "62%", y: "14%", rotate: 6, opacity: 1 }}
        transition={{ delay: 1.6, duration: 0.8, ease: EASE }}
      >
        <span className="inline-flex w-fit items-center gap-1 rounded-[4px] bg-error px-1.5 py-0.5 text-[9px] font-bold text-white">
          <FileText size={10} aria-hidden /> PDF
        </span>
        <div className="mt-3 h-2 w-3/4 rounded-full bg-fg/70" />
        <div className="mt-2 h-1.5 w-1/2 rounded-full bg-muted" />
        <svg viewBox="0 0 100 40" className="mt-auto w-full" aria-hidden>
          <path d="M0,32 L20,26 L40,28 L60,18 L80,16 L100,8" fill="none" stroke="var(--accent)" strokeWidth="2.5" />
        </svg>
      </motion.div>

      {/* o painel encolhe e vira um card de link */}
      <motion.div
        className="relative w-[64%] rounded-[12px] border border-line bg-card p-4"
        initial={play ? { scale: 1.35, opacity: 0.6 } : false}
        animate={{ scale: 1, opacity: 1, x: "-14%" }}
        transition={{ duration: 0.7, ease: EASE }}
      >
        <p className="text-[11px] font-medium tracking-[0.06em] text-fg-2 uppercase">Relatório · Loja Verde</p>
        <p className="mt-1 text-[22px] font-bold tracking-[-0.02em] tnum">R$ 61,20</p>
        <p className="text-[11px] text-accent">▼ 8,2% custo por venda</p>
        <div className="mt-3 flex items-center gap-2 rounded-[8px] border border-line bg-bg px-2.5 py-2 text-[11px] text-fg-2">
          <Link2 size={13} aria-hidden className="shrink-0" />
          <span className="truncate tnum">vyz.app/r/loja-verde</span>
        </div>
        <motion.div
          className="relative mt-2 inline-flex h-8 items-center gap-1.5 overflow-hidden rounded-[8px] bg-accent px-3 text-[12px] font-semibold text-on-accent"
          initial={false}
          animate={play ? { scale: [1, 1, 0.92, 1] } : undefined}
          transition={{ delay: 1.05, duration: 0.35, times: [0, 0.01, 0.4, 1] }}
        >
          <motion.span initial={play ? { opacity: 1 } : { opacity: 0 }} animate={{ opacity: 0 }} transition={{ delay: 1.2, duration: 0.15 }}>
            Copiar link
          </motion.span>
          <motion.span
            className="absolute inset-0 inline-flex items-center justify-center gap-1"
            initial={play ? { opacity: 0, y: 8 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.25, duration: 0.25 }}
          >
            <Check size={13} aria-hidden /> Copiado
          </motion.span>
        </motion.div>
        {play && (
          <motion.span
            className="pointer-events-none absolute text-fg"
            style={{ left: "70%", top: "110%" } as CSSProperties}
            initial={{ x: 0, y: 0, opacity: 0 }}
            animate={{ x: "-180%", y: "-260%", opacity: [0, 1, 1, 0] }}
            transition={{ duration: 1.3, ease: EASE, times: [0, 0.2, 0.85, 1] }}
            aria-hidden
          >
            <MousePointer2 size={18} fill="currentColor" />
          </motion.span>
        )}
      </motion.div>
    </div>
  );
}
