// Renderiza uma landing page a partir do template + conteúdo. É o mesmo
// componente no mock da LP, nas miniaturas, no editor e na página publicada.
// A página tem paleta própria (é do cliente), independente do tema do painel.

import type { CSSProperties, ReactNode } from "react";
import { Icon } from "@/components/brand/Icon";
import type { LandingContent, LandingTemplate } from "@/features/templates/landing-pages";

/** Texto legível sobre a cor principal. */
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

function Block({ d, children, className = "" }: { d: number; children: ReactNode; className?: string }) {
  return (
    <div className={`lp-block ${className}`} style={{ "--d": `${d}ms` } as CSSProperties}>
      <div className="lp-fill">{children}</div>
      <div className="lp-wire" aria-hidden />
    </div>
  );
}

type LandingRendererProps = {
  template: LandingTemplate;
  content: LandingContent;
  /** Esconde o selo "Feito com VYZ" (marca própria). */
  hideBadge?: boolean;
};

/** A página em si. Responde à largura do contêiner (@container), não da tela. */
export function LandingRenderer({ template, content, hideBadge }: LandingRendererProps) {
  const color = /^#[0-9a-f]{6}$/i.test(content.color) ? content.color : "#4B5320";
  const ink = onColor(color);
  const on = (s: keyof LandingContent["sections"]) => !!content.sections[s];
  const c = template.copy;
  const style = { "--lp": color, "--lp-ink": ink } as CSSProperties;
  // ordem de montagem dos blocos (wireframe que se preenche)
  const at = (i: number) => 260 + i * 120;

  const cta = (
    <span className="inline-flex h-9 items-center rounded-[7px] bg-[var(--lp)] px-4 text-[12px] font-semibold text-[var(--lp-ink)] @[700px]:h-11 @[700px]:text-[14px]">
      {content.cta || "Saiba mais"}
    </span>
  );

  return (
    <div className="@container bg-[#f7f8f3] text-[#1e1e1e]" style={style}>
      <div className="space-y-5 p-4 @[700px]:space-y-8 @[700px]:p-8">
        <Block d={at(0)} className="flex items-center justify-between gap-3">
          {content.logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- dataURL local, sem otimização
            <img src={content.logo} alt={content.brand} className="h-7 w-auto max-w-[140px] object-contain" />
          ) : (
            <p className="text-[14px] font-extrabold tracking-[-0.02em] @[700px]:text-[17px]" style={{ color }}>
              {content.brand || "Sua marca"}
            </p>
          )}
          <p className="hidden gap-4 text-[11px] text-[#6f726a] @[520px]:flex">
            <span>Sobre</span>
            <span>Como funciona</span>
            <span>Contato</span>
          </p>
        </Block>

        <div className={`grid gap-4 ${template.hero === "form" ? "@[520px]:grid-cols-[1.25fr_1fr] @[520px]:items-center" : ""}`}>
          <div className="space-y-3">
            {on("contagem") && c.countdown && (
              <Block d={at(1)} className="inline-block">
                <span className="inline-block rounded-full bg-[#1e1e1e] px-3 py-1 text-[10.5px] font-semibold text-white tabular-nums">Termina em {c.countdown}</span>
              </Block>
            )}
            <Block d={at(2)}>
              <h1 className="text-[22px] leading-[1.04] font-extrabold tracking-[-0.03em] @[520px]:text-[26px] @[700px]:text-[38px]">{content.headline || "Sua headline aqui"}</h1>
            </Block>
            <Block d={at(3)}>
              <p className="text-[12px] leading-snug text-[#5f625a] @[700px]:text-[15px]">{content.sub}</p>
            </Block>
            <Block d={at(4)} className="inline-block">
              {cta}
            </Block>
          </div>
          {template.hero === "form" && (
            <Block d={at(5)}>
              <div className="space-y-2 rounded-[10px] border border-[#cfd3c6] bg-white p-3 @[700px]:p-5">
                {content.fields.slice(0, 4).map((f, i) => (
                  <div key={`${f}-${i}`}>
                    <p className="text-[10px] font-medium text-[#6f726a] @[700px]:text-[12px]">{f}</p>
                    <div className="mt-0.5 h-7 rounded-[5px] border border-[#cfd3c6] bg-[#fbfcf8] @[700px]:h-9" />
                  </div>
                ))}
                <div className="mt-1 flex h-8 items-center justify-center rounded-[6px] bg-[var(--lp)] text-[11px] font-semibold text-[var(--lp-ink)] @[700px]:h-10 @[700px]:text-[13px]">
                  {content.cta || "Enviar"}
                </div>
              </div>
            </Block>
          )}
        </div>

        {on("galeria") && (
          <Block d={at(6)} className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="relative aspect-[4/3] overflow-hidden rounded-[8px]" style={{ background: ["#c8b9a0", "#a3a69c", "#d7dcc3"][i] }} aria-hidden>
                <span className="absolute inset-x-[20%] bottom-0 h-[55%] rounded-t-[4px] bg-white/45" />
                <span className="absolute top-[18%] right-[18%] size-[16%] rounded-full bg-white/60" />
              </div>
            ))}
          </Block>
        )}

        {on("oferta") && c.offer && (
          <Block d={at(7)}>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] p-4 @[700px]:p-6" style={{ background: color, color: ink }}>
              <div>
                <p className="text-[11px] font-medium opacity-85 @[700px]:text-[13px]">{c.offer.title}</p>
                <p className="text-[24px] font-extrabold tracking-[-0.02em] tabular-nums @[700px]:text-[32px]">{c.offer.price}</p>
                <p className="text-[11px] opacity-85">{c.offer.note}</p>
              </div>
              <span className="inline-flex h-9 items-center rounded-[7px] bg-white px-4 text-[12px] font-semibold text-[#1e1e1e]">{content.cta || "Comprar"}</span>
            </div>
          </Block>
        )}

        {on("beneficios") && (
          <Block d={at(8)} className="grid gap-2 @[520px]:grid-cols-3">
            {c.benefits.map(([title, text]) => (
              <div key={title} className="rounded-[10px] border border-[#cfd3c6] bg-white p-3">
                <span className="mb-2 block size-5 rounded-[5px]" style={{ background: color }} aria-hidden />
                <p className="text-[12px] font-bold @[700px]:text-[14px]">{title}</p>
                <p className="text-[11px] text-[#6f726a] @[700px]:text-[12.5px]">{text}</p>
              </div>
            ))}
          </Block>
        )}

        {on("agenda") && c.agenda && (
          <Block d={at(9)}>
            <p className="mb-2 text-[12px] font-bold @[700px]:text-[15px]">Programação</p>
            <ul className="divide-y divide-[#cfd3c6] rounded-[10px] border border-[#cfd3c6] bg-white">
              {c.agenda.map(([h, t]) => (
                <li key={h} className="flex gap-3 px-3 py-2 text-[11px] @[700px]:text-[13px]">
                  <span className="font-bold tabular-nums" style={{ color }}>
                    {h}
                  </span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </Block>
        )}

        {on("prova") && c.stats && (
          <Block d={at(10)} className="grid gap-3 @[520px]:grid-cols-[1.4fr_1fr]">
            <blockquote className="rounded-[10px] border border-[#cfd3c6] bg-white p-3 text-[12px] @[700px]:text-[14px]">
              “{c.quote?.[0]}”<footer className="mt-1 text-[11px] text-[#6f726a]">{c.quote?.[1]}</footer>
            </blockquote>
            <div className="grid grid-cols-3 gap-2">
              {c.stats.map(([n, l]) => (
                <div key={l} className="rounded-[10px] bg-white p-2 text-center">
                  <p className="text-[15px] font-extrabold tabular-nums @[700px]:text-[20px]">{n}</p>
                  <p className="text-[9.5px] text-[#6f726a]">{l}</p>
                </div>
              ))}
            </div>
          </Block>
        )}

        {on("local") && c.address && (
          <Block d={at(11)} className="grid items-center gap-3 @[520px]:grid-cols-[1fr_1.2fr]">
            <div className="text-[11.5px] @[700px]:text-[13.5px]">
              <p className="font-bold">{c.address[0]}</p>
              <p className="text-[#6f726a]">{c.address[1]}</p>
            </div>
            <div className="relative h-20 overflow-hidden rounded-[10px] bg-[#e4e8dc]" aria-hidden>
              <span className="absolute inset-y-0 left-[30%] w-2 bg-white" />
              <span className="absolute inset-x-0 top-[55%] h-2 bg-white" />
              <span className="absolute top-[38%] left-[52%] size-3 rounded-full" style={{ background: color }} />
            </div>
          </Block>
        )}

        {on("faq") && (
          <Block d={at(12)}>
            <p className="mb-2 text-[12px] font-bold @[700px]:text-[15px]">Perguntas frequentes</p>
            <ul className="space-y-1.5">
              {c.faq.map(([q, a]) => (
                <li key={q} className="rounded-[8px] bg-white px-3 py-2 text-[11px] @[700px]:text-[13px]">
                  <p className="font-semibold">{q}</p>
                  <p className="text-[#6f726a]">{a}</p>
                </li>
              ))}
            </ul>
          </Block>
        )}

        <Block d={at(13)} className="flex items-center justify-between border-t border-[#cfd3c6] pt-3">
          <p className="text-[10px] text-[#6f726a]">© {content.brand || "Sua marca"}</p>
          <div className="flex items-center gap-2">
            {on("whatsapp") && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#1f2612] px-2.5 py-1 text-[10px] font-semibold text-white">WhatsApp</span>
            )}
            {!hideBadge && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#cfd3c6] py-0.5 pr-2 pl-0.5 text-[9.5px] font-medium text-[#4b5320]">
                <span className="size-4">
                  <Icon className="text-[#e8ece1]" background="#4b5320" radius={50} />
                </span>
                Feito com VYZ
              </span>
            )}
          </div>
        </Block>
      </div>
    </div>
  );
}
