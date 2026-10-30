"use client";

import { Check, CloudOff, ExternalLink, History, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { PendingChip, Tabs } from "@/components/ui/kit";
import { btn } from "@/components/ui/styles";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { TIER_LABEL } from "@/features/pricing/entitlements";
import { landingTemplate, type LandingContent } from "@/features/templates/landing-pages";
import type { Tracking } from "@/features/workspace/types";
import { useWorkspace } from "@/features/workspace/workspace";
import { msgUpgrade, waLink } from "@/lib/whatsapp";
import { checkLandingSlug, removeLandingLogo, restoreLandingVersion, saveLandingPage, setLandingPublished, uploadLandingLogo } from "@/server/landing-pages/actions";
import { ContentFields, LandingPreview, SlugField, TrackingFields, trackingValid } from "./editor";
import { LANDING_STATUS_LABEL, slugIssue, type LandingPageDTO, type LandingVersionDTO } from "./model";

const SAVE_DELAY = 800;

type Patch = { content?: LandingContent; tracking?: Tracking; slug?: string };
type SaveState = "saved" | "pending" | "saving" | "error";

const dateTime = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

function SaveStatus({ state, error, canEdit }: { state: SaveState; error: string | null; canEdit: boolean }) {
  if (!canEdit) return <span className="text-fg-2">Somente leitura</span>;
  if (state === "error")
    return (
      <span className="inline-flex items-center gap-1.5 text-error-fg">
        <CloudOff size={14} aria-hidden /> {error ?? "Não foi possível salvar."}
      </span>
    );
  if (state === "saved")
    return (
      <span className="inline-flex items-center gap-1.5 text-fg-2">
        <Check size={14} aria-hidden /> Salvo
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 text-fg-2">
      <LoaderCircle size={14} aria-hidden className="animate-spin motion-reduce:animate-none" /> Salvando…
    </span>
  );
}

type Props = {
  initial: LandingPageDTO;
  versions: LandingVersionDTO[];
  canEdit: boolean;
  /** LPs publicadas que o plano permite e quantas já estão no ar (no workspace). */
  limit: number;
  publishedCount: number;
  hideBadge: boolean;
  /** Aviso vindo da criação (ex.: publicação recusada pelo plano). */
  notice?: string | null;
};

/** Formulário à esquerda, prévia ao vivo à direita. Salva no servidor logo depois de cada mudança. */
export function LandingEditor({ initial, versions, canEdit, limit, publishedCount, hideBadge, notice }: Props) {
  const { ws } = useWorkspace();
  const t = landingTemplate(initial.templateId)!;
  const [lp, setLp] = useState(initial);
  const [slug, setSlug] = useState(initial.slug);
  const [slugMsg, setSlugMsg] = useState<{ error?: string; suggestion?: string | null } | null>(null);
  const [tab, setTab] = useState<"conteudo" | "rastreamento" | "publicar">("conteudo");
  const [save, setSave] = useState<{ state: SaveState; error: string | null }>({ state: "saved", error: null });
  const [publishMsg, setPublishMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [publishing, startPublish] = useTransition();

  // Mudanças juntadas no intervalo e gravadas uma de cada vez (fila), na ordem.
  const pending = useRef<Patch>({});
  const timer = useRef<number | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const enqueue = useCallback(<T,>(task: () => Promise<T>): Promise<T> => {
    const next = queue.current.then(task, task);
    queue.current = next.catch(() => undefined);
    return next;
  }, []);

  const flush = useCallback((): Promise<boolean> => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    const patch = pending.current;
    pending.current = {};
    if (!Object.keys(patch).length) return enqueue(async () => true);
    setSave({ state: "saving", error: null });
    return enqueue(async () => {
      const r = await saveLandingPage(initial.id, patch);
      if (!r.ok) {
        if (r.error.code === "landing:slug_taken" || r.error.fields?.slug !== undefined) {
          setSlugMsg({ error: r.error.message, suggestion: r.error.code === "landing:slug_taken" ? r.error.fields?.slug || null : null });
          // O resto do lote vai de novo sem o endereço.
          const rest: Patch = { ...patch };
          delete rest.slug;
          if (Object.keys(rest).length) {
            const again = await saveLandingPage(initial.id, rest);
            if (again.ok) {
              setLp((cur) => ({ ...cur, updatedAt: again.data.updatedAt, hasUnpublishedChanges: again.data.hasUnpublishedChanges }));
              setSave({ state: "saved", error: null });
              return false;
            }
          }
          setSave({ state: "error", error: "O endereço não foi salvo." });
          return false;
        }
        setSave({ state: "error", error: r.error.message });
        return false;
      }
      setLp((cur) => ({ ...cur, slug: r.data.slug, updatedAt: r.data.updatedAt, hasUnpublishedChanges: r.data.hasUnpublishedChanges }));
      setSave((cur) => (cur.state === "saving" && !timer.current ? { state: "saved", error: null } : cur));
      return true;
    });
  }, [enqueue, initial.id]);

  const schedule = useCallback(
    (patch: Patch) => {
      pending.current = { ...pending.current, ...patch };
      setSave({ state: "pending", error: null });
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void flush(), SAVE_DELAY);
    },
    [flush],
  );

  // Sair da página com mudança na fila: grava antes (e avisa o navegador).
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (timer.current || Object.keys(pending.current).length) {
        void flush();
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
      if (timer.current) void flush();
    };
  }, [flush]);

  const setContent = (content: LandingContent) => {
    setLp((cur) => ({ ...cur, content }));
    if (canEdit) schedule({ content });
  };
  const setTracking = (tracking: Tracking) => {
    setLp((cur) => ({ ...cur, tracking }));
    // ID incompleto fica só na tela até ficar válido (o campo mostra o erro).
    if (canEdit && trackingValid(tracking)) schedule({ tracking });
  };
  const changeSlug = (value: string) => {
    setSlug(value);
    const issue = slugIssue(value);
    setSlugMsg(issue ? { error: issue } : null);
    if (!issue && canEdit) schedule({ slug: value });
  };

  // Disponibilidade do endereço enquanto digita (só o formato não basta: é único entre todos).
  useEffect(() => {
    if (!canEdit || slugIssue(slug) || slug === lp.slug) return;
    const id = window.setTimeout(async () => {
      const r = await checkLandingSlug(slug, initial.id);
      if (r.ok && r.data.slug === slug && !r.data.available) setSlugMsg({ error: r.data.issue ?? "Esse endereço já está em uso.", suggestion: r.data.suggestion });
    }, 400);
    return () => window.clearTimeout(id);
  }, [slug, lp.slug, canEdit, initial.id]);

  const logo = {
    onFile: (f: File) =>
      flush().then(() =>
        enqueue(async () => {
          const fd = new FormData();
          fd.set("file", f);
          const r = await uploadLandingLogo(initial.id, fd);
          if (!r.ok) return r.error.message;
          setLp((cur) => ({ ...cur, content: { ...cur.content, logo: r.data.logoUrl }, hasUnpublishedChanges: cur.status === "published" }));
          return null;
        }),
      ),
    onRemove: () =>
      flush().then(() =>
        enqueue(async () => {
          const r = await removeLandingLogo(initial.id);
          if (!r.ok) return r.error.message;
          setLp((cur) => ({ ...cur, content: { ...cur.content, logo: undefined }, hasUnpublishedChanges: cur.status === "published" }));
          return null;
        }),
      ),
  };

  const isLive = lp.status === "published";
  const atLimit = !isLive && publishedCount >= limit;
  const trackingOk = trackingValid(lp.tracking);

  const publish = (on: boolean) =>
    startPublish(async () => {
      setPublishMsg(null);
      if (!(await flush()) && on) {
        setPublishMsg({ kind: "error", text: "Resolva o que não foi salvo antes de publicar." });
        return;
      }
      const r = await setLandingPublished(initial.id, on);
      if (!r.ok) {
        setPublishMsg({ kind: "error", text: r.error.message });
        return;
      }
      setLp((cur) => ({ ...cur, status: r.data.status, publishedAt: r.data.publishedAt, hasUnpublishedChanges: r.data.hasUnpublishedChanges, updatedAt: r.data.updatedAt }));
      setPublishMsg({ kind: "ok", text: on ? (isLive ? "Alterações publicadas." : "Página publicada.") : "A página saiu do ar. Ela continua salva como rascunho." });
    });

  const restore = (version: number) =>
    startPublish(async () => {
      setPublishMsg(null);
      await flush();
      const r = await restoreLandingVersion(initial.id, version);
      if (!r.ok) {
        setPublishMsg({ kind: "error", text: r.error.message });
        return;
      }
      setLp((cur) => ({ ...cur, content: r.data.content, tracking: r.data.tracking, updatedAt: r.data.updatedAt, hasUnpublishedChanges: r.data.hasUnpublishedChanges }));
      setPublishMsg({ kind: "ok", text: `Versão ${version} trazida para o editor. Publique para colocá-la no ar.` });
    });

  const statusText = isLive ? (lp.hasUnpublishedChanges ? "Publicada · alterações não publicadas" : "Publicada") : LANDING_STATUS_LABEL[lp.status];

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="label-caps text-fg-2">Landing page · {t.name}</p>
          <h1 className="display mt-1 truncate text-[clamp(1.6rem,3vw,2.2rem)]">{lp.content.brand || "Sem nome"}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[13px]" aria-live="polite">
            <span className={isLive ? "font-semibold text-fg" : "text-fg-2"}>{statusText}</span>
            <span className="text-fg-2" aria-hidden>
              ·
            </span>
            <SaveStatus state={save.state} error={save.error} canEdit={canEdit} />
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/p/${lp.slug}?previa=1`} target="_blank" rel="noopener noreferrer" className={`${btn.ghost} h-9`}>
            <ExternalLink size={15} aria-hidden /> Prévia
          </a>
          {isLive && (
            <a href={`/p/${lp.slug}`} target="_blank" rel="noopener noreferrer" className={btn.small}>
              <ExternalLink size={15} aria-hidden /> Abrir página
            </a>
          )}
        </div>
      </header>
      {notice && (
        <p role="status" className="rounded-control border border-warning/60 bg-warning/10 px-4 py-3 text-[14px]">
          {notice}
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="min-w-0 rounded-card border border-line bg-card p-5">
          <Tabs
            label="Editor"
            value={tab}
            onChange={setTab}
            items={[
              { value: "conteudo", label: "Conteúdo" },
              { value: "rastreamento", label: "Rastreamento" },
              { value: "publicar", label: "Publicar" },
            ]}
          />
          <fieldset disabled={!canEdit} className="min-w-0 pt-5">
            {tab === "conteudo" && <ContentFields t={t} value={lp.content} onChange={setContent} logo={logo} />}
            {tab === "rastreamento" && <TrackingFields value={lp.tracking} onChange={setTracking} />}
            {tab === "publicar" && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <SlugField value={slug} onChange={changeSlug} error={slugMsg?.error} hint={isLive ? "Trocar o endereço tira a página do endereço antigo na hora." : undefined} />
                  {slugMsg?.suggestion && (
                    <button type="button" className={`${btn.ghost} h-8 px-2 text-[13px]`} onClick={() => changeSlug(slugMsg.suggestion!)}>
                      Usar {slugMsg.suggestion}
                    </button>
                  )}
                  <PendingChip label="Subdomínio em breve" detail={`Hoje a página fica em /p/${lp.slug}. Com a hospedagem, ela vai para ${lp.slug}.vyz.app.`} />
                </div>

                <div className="space-y-3 rounded-control border border-line p-4">
                  <p className="text-[13px] text-fg-2 tnum">
                    {publishedCount} de {limit} {limit === 1 ? "landing page publicada" : "landing pages publicadas"} no plano
                    {isLive && lp.publishedAt ? ` · no ar desde ${dateTime(lp.publishedAt)}` : ""}
                  </p>
                  {atLimit && (
                    <div className="space-y-2 rounded-control border border-warning/60 bg-warning/10 p-3 text-[14px]">
                      <p>
                        O {TIER_LABEL[ws.tier]} permite {limit} {limit === 1 ? "landing page publicada" : "landing pages publicadas"}. Despublique outra ou troque de plano.
                      </p>
                      <a href={waLink(msgUpgrade(TIER_LABEL[ws.tier], "um plano maior", "Preciso publicar mais landing pages."))} target="_blank" rel="noopener noreferrer" className={btn.small}>
                        <WhatsAppIcon size={16} /> Fazer upgrade
                      </a>
                    </div>
                  )}
                  {!trackingOk && <p className="text-[12.5px] text-error-fg">Corrija os IDs de rastreamento antes de publicar.</p>}
                  <div className="flex flex-wrap gap-2">
                    {(!isLive || lp.hasUnpublishedChanges) && (
                      <button type="button" disabled={publishing || !trackingOk || !!slugMsg?.error} onClick={() => publish(true)} className={btn.small}>
                        {publishing ? "Aguarde…" : isLive ? "Publicar alterações" : "Publicar"}
                      </button>
                    )}
                    {isLive && (
                      <button type="button" disabled={publishing} onClick={() => publish(false)} className={`${btn.ghost} h-9`}>
                        Despublicar
                      </button>
                    )}
                  </div>
                  {publishMsg && (
                    <p role={publishMsg.kind === "error" ? "alert" : "status"} className={`text-[13px] ${publishMsg.kind === "error" ? "text-error-fg" : "text-fg"}`}>
                      {publishMsg.text}
                    </p>
                  )}
                </div>

                <section aria-labelledby="lp-versions" className="space-y-2">
                  <h2 id="lp-versions" className="flex items-center gap-1.5 text-[13px] font-semibold text-fg-2">
                    <History size={14} aria-hidden /> Versões publicadas
                  </h2>
                  {versions.length === 0 ? (
                    <p className="text-[13px] text-fg-2">Cada publicação vira uma versão. Ainda não há nenhuma.</p>
                  ) : (
                    <ul className="divide-y divide-line rounded-control border border-line">
                      {versions.map((v) => (
                        <li key={v.version} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-[13px]">
                          <span className="min-w-0">
                            <strong className="tnum">v{v.version}</strong> <span className="text-fg-2 tnum">· {dateTime(v.publishedAt)}</span>
                            {v.publishedBy && <span className="text-fg-2"> · {v.publishedBy}</span>}
                          </span>
                          <button type="button" disabled={publishing} onClick={() => restore(v.version)} className={`${btn.ghost} h-8 px-2 text-[13px]`}>
                            Trazer para o editor
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            )}
          </fieldset>
        </div>
        <div className="min-w-0 lg:sticky lg:top-20 lg:self-start">
          <LandingPreview t={t} content={lp.content} hideBadge={hideBadge} />
        </div>
      </div>
    </div>
  );
}
