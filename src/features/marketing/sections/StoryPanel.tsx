"use client";

import { Check, FileText, Link2, MousePointer2 } from "lucide-react";
import { AnimatePresence, m, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Icon } from "@/components/brand/Icon";
import { PageView } from "@/features/dashboards/widgets/PageView";
import { makeContext } from "@/features/dashboards/widgets/Widgets";
import { MockSource } from "@/features/metrics/source";
import { dashboardTemplate } from "@/features/templates/dashboards";
import { PAGES } from "@/features/templates/pages";

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
      <span className="absolute bottom-3 left-4 z-10 rounded-chip border border-line bg-bg px-2.5 py-0.5 text-[11px] text-fg-2">
        Amostra · dados fictícios
      </span>
      <AnimatePresence mode="wait" initial={false}>
        {seen && (
        <m.div
          key={step}
          className="absolute inset-0"
          initial={reduce ? { opacity: 0 } : { clipPath: "inset(50% 0 50% 0)" }}
          animate={reduce ? { opacity: 1 } : { clipPath: "inset(0% 0 0% 0)" }}
          exit={reduce ? { opacity: 0 } : { clipPath: "inset(50% 0 50% 0)", transition: { duration: 0.25 } }}
          transition={{ duration: reduce ? 0.15 : 0.5, ease: EASE }}
        >
          {step === 0 && <ConnectScene active={active} />}
          {step === 1 && (
            <TemplateScene active={active} />
          )}
          {step === 2 && <SendScene active={active} />}
        </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// x é a distância da borda do próprio lado (esquerda ou direita), em %
const CHIPS = [
  { label: "Meta Ads", x: 4, y: 22, side: -1 },
  { label: "Google Ads", x: 4, y: 46, side: -1 },
  { label: "GA4", x: 4, y: 70, side: -1 },
  { label: "TikTok Ads", x: 3, y: 16, side: 1, pro: true },
  { label: "LinkedIn Ads", x: 3, y: 36, side: 1, pro: true },
  { label: "Mercado Ads", x: 3, y: 56, side: 1, pro: true },
  { label: "HubSpot", x: 3, y: 76, side: 1, pro: true },
];

function ConnectScene({ active }: { active: boolean }) {
  const reduce = useReducedMotion();
  const play = active && !reduce;
  return (
    <div className="absolute inset-0">
      {/* linhas de dados até o painel */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        {CHIPS.map((c, i) => {
          const fromX = c.side < 0 ? 18 : 82;
          const toX = c.side < 0 ? 38 : 62;
          const y = c.y + 3;
          return (
            <m.path
              key={c.label}
              d={`M${fromX},${y} C${(fromX + toX) / 2},${y} ${(fromX + toX) / 2},50 ${toX},50`}
              fill="none"
              stroke={c.pro ? "var(--muted)" : "var(--accent)"}
              // sem non-scaling-stroke: com pathLength ele quebra o traço em tracejado
              strokeWidth="0.32"
              initial={play ? { pathLength: 0 } : false}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.55 + i * 0.07, duration: 0.6, ease: EASE }}
            />
          );
        })}
      </svg>
      {/* painel */}
      <div className="absolute top-[26%] left-[39%] h-[48%] w-[22%] rounded-[10px] border border-line bg-card p-[3%]">
        <div className="mx-auto w-1/3">
          <Icon className="text-accent" />
        </div>
        <div className="mt-[10%] space-y-[8%]">
          {[80, 56, 68].map((w, i) => (
            <m.div
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
        <m.span
          key={c.label}
          className={`absolute inline-flex items-center gap-1 rounded-chip border px-2 py-1 text-[10px] font-medium whitespace-nowrap sm:px-2.5 sm:text-[12px] ${
            c.pro ? "border-line bg-card text-fg-2" : "border-transparent bg-accent text-on-accent"
          }`}
          style={c.side < 0 ? { left: `${c.x}%`, top: `${c.y}%` } : { right: `${c.x}%`, top: `${c.y}%` }}
          initial={play ? { x: c.side * 220, y: (i % 2 ? -1 : 1) * 40, rotate: c.side * 12, opacity: 0 } : false}
          animate={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 140, damping: 16, delay: i * 0.06 }}
        >
          {c.label}
          {c.pro && <span className="rounded-chip bg-accent-soft px-1 text-[9px] text-fg">Pro</span>}
        </m.span>
      ))}
    </div>
  );
}

const SCENES = {
  ecommerce: { template: "ecommerce-visao-geral", label: "E-commerce", client: "Loja Verde" },
  imob: { template: "imobiliario-leads", label: "Imobiliário", client: "Incorporadora Sul" },
} as const;
type SceneKey = keyof typeof SCENES;

/**
 * Os widgets reais de cada template (mesmo cadastro do painel), com números de
 * amostra. Alterna sozinho a cada ~3,5 s até alguém clicar num chip.
 */
function TemplateScene({ active }: { active: boolean }) {
  const reduce = useReducedMotion();
  const [which, setWhich] = useState<SceneKey>("ecommerce");
  const [manual, setManual] = useState(false);
  const [switches, setSwitches] = useState(0);
  useEffect(() => {
    if (!active || reduce || manual) return;
    const iv = window.setInterval(() => {
      setWhich((w) => (w === "ecommerce" ? "imob" : "ecommerce"));
      setSwitches((n) => n + 1);
    }, 3500);
    return () => window.clearInterval(iv);
  }, [active, reduce, manual]);

  return (
    <div className="absolute inset-0 flex flex-col px-3 pt-9 pb-10">
      <div className="absolute top-2 right-3 z-10 flex gap-1.5 text-[11px]" role="radiogroup" aria-label="Template">
        {(Object.keys(SCENES) as SceneKey[]).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={which === k}
            onClick={() => {
              setManual(true);
              if (k !== which) {
                setWhich(k);
                setSwitches((n) => n + 1);
              }
            }}
            className={`rounded-chip px-2.5 py-0.5 transition-colors duration-200 ${which === k ? "bg-accent text-on-accent" : "border border-line text-fg-2 hover:text-fg"}`}
          >
            {SCENES[k].label}
          </button>
        ))}
      </div>
      <div className="relative min-h-0 flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={which}
            className="absolute inset-0"
            exit={reduce ? { opacity: 0 } : { clipPath: "inset(50% 0 50% 0)", transition: { duration: 0.32, ease: EASE } }}
          >
            <FitToBox>
              <TemplatePreview scene={which} assemble={switches > 0} />
            </FitToBox>
          </m.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function TemplatePreview({ scene, assemble }: { scene: SceneKey; assemble: boolean }) {
  const reduce = useReducedMotion();
  const t = dashboardTemplate(SCENES[scene].template)!;
  const ds = MockSource.load({ seed: SCENES[scene].client, profile: t.profile, sources: t.sources, days: 28 });
  const layout = PAGES["visao-geral"].build({ profile: t.profile, sources: t.sources });
  return (
    <div className="relative" data-anim={assemble && !reduce ? "on" : "off"}>
      <div className="scanner" aria-hidden />
      <div className="m-unveil">
        <p className="mb-2 text-[13px] font-bold tracking-[-0.02em] text-fg">
          {SCENES[scene].client} · {t.profile === "imob" ? "Leads" : "Visão geral"}
        </p>
        <PageView layout={layout} ctx={makeContext(ds)} />
      </div>
    </div>
  );
}

/** Escala o conteúdo (só transform) para caber na altura disponível. */
function FitToBox({ children }: { children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const measure = () => {
      if (!box.current || !inner.current) return;
      const avail = box.current.clientHeight;
      const natural = inner.current.scrollHeight;
      setScale(natural > avail ? avail / natural : 1);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (box.current) ro.observe(box.current);
    if (inner.current) ro.observe(inner.current);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={box} className="h-full overflow-hidden">
      <div ref={inner} className="origin-top-left" style={{ transform: `scale(${scale})`, width: `${100 / scale}%` }}>
        {children}
      </div>
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
      <m.div
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
      </m.div>

      {/* o painel encolhe e vira um card de link */}
      <m.div
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
        <m.div
          className="relative mt-2 inline-flex h-8 items-center gap-1.5 overflow-hidden rounded-[8px] bg-accent px-3 text-[12px] font-semibold text-on-accent"
          initial={false}
          animate={play ? { scale: [1, 1, 0.92, 1] } : undefined}
          transition={{ delay: 1.05, duration: 0.35, times: [0, 0.01, 0.4, 1] }}
        >
          <m.span initial={play ? { opacity: 1 } : { opacity: 0 }} animate={{ opacity: 0 }} transition={{ delay: 1.2, duration: 0.15 }}>
            Copiar link
          </m.span>
          <m.span
            className="absolute inset-0 inline-flex items-center justify-center gap-1"
            initial={play ? { opacity: 0, y: 8 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.25, duration: 0.25 }}
          >
            <Check size={13} aria-hidden /> Copiado
          </m.span>
        </m.div>
        {play && (
          <m.span
            className="pointer-events-none absolute text-fg"
            style={{ left: "70%", top: "110%" } as CSSProperties}
            initial={{ x: 0, y: 0, opacity: 0 }}
            animate={{ x: "-180%", y: "-260%", opacity: [0, 1, 1, 0] }}
            transition={{ duration: 1.3, ease: EASE, times: [0, 0.2, 0.85, 1] }}
            aria-hidden
          >
            <MousePointer2 size={18} fill="currentColor" />
          </m.span>
        )}
      </m.div>
    </div>
  );
}
