"use client";

// Drawer do VYZ (Radix Dialog: foco preso, Esc fecha). À direita no desktop,
// sem cobrir o painel inteiro; tela cheia no celular.

import { Lock, Mic, MicOff, RotateCcw, Send, Volume2, VolumeX, X } from "lucide-react";
import Link from "next/link";
import { Dialog } from "radix-ui";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Tooltip } from "@/components/ui/Tooltip";
import { useAgent, type Message } from "./AgentProvider";
import { AnswerCard, RichText } from "./AnswerCard";
import { SUGGESTIONS } from "./engine/local";
import { Mascot } from "./Mascot";
import { canListen } from "./voice";

const noop = () => () => {};
const useCanListen = () => useSyncExternalStore(noop, canListen, () => false);

const iconBtn = "inline-flex size-9 items-center justify-center rounded-control text-fg-2 outline-none transition-colors hover:bg-accent-soft hover:text-fg focus-visible:ring-2 focus-visible:ring-accent";

function Bubble({ m }: { m: Message }) {
  const { ask, showOnPanel, busy } = useAgent();
  if (m.role === "user")
    return (
      <li className="flex justify-end">
        <p className="max-w-[85%] rounded-[14px] rounded-br-[4px] bg-accent px-3.5 py-2 text-[14px] text-on-accent">{m.text}</p>
      </li>
    );
  const done = m.shown >= m.text.length;
  const a = m.answer;
  return (
    <li className="max-w-[94%]">
      <p className="text-[14px] leading-relaxed text-fg-2">
        <RichText text={m.text.slice(0, m.shown)} />
        {!done && <span className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse bg-accent" aria-hidden />}
      </p>
      {done && a && (
        <>
          <AnswerCard answer={a} onShow={showOnPanel} />
          {a.suggestions && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {a.suggestions.map((s) => (
                <button key={s} type="button" disabled={busy} onClick={() => ask(s)} className="rounded-chip border border-line px-3 py-1 text-[12.5px] text-fg outline-none hover:border-accent focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50">
                  {s}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </li>
  );
}

function Empty() {
  const { ask } = useAgent();
  return (
    <div className="flex flex-col items-start gap-4 pt-4">
      <Mascot size={56} />
      <div>
        <p className="text-[17px] font-semibold text-fg">Olá! Sou o VYZ.</p>
        <p className="mt-1 text-[14px] leading-relaxed text-fg-2">Pergunte sobre os números dos seus dashboards, os limites do plano ou peça para eu abrir uma seção do painel.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button key={s} type="button" onClick={() => ask(s)} className="rounded-chip border border-line bg-bg px-3 py-1.5 text-[13px] text-fg outline-none hover:border-accent focus-visible:ring-2 focus-visible:ring-accent">
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function Composer() {
  const { ask, busy, voiceAllowed, listening, toggleMic, interim, micError } = useAgent();
  const supported = useCanListen();
  const [text, setText] = useState("");
  return (
    <div className="border-t border-line p-3">
      {micError && (
        <p role="alert" className="mb-2 rounded-control bg-error-soft px-3 py-1.5 text-[12.5px] text-error-fg">
          {micError}
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(text);
          setText("");
        }}
        className="flex items-center gap-2"
      >
        {supported &&
          (voiceAllowed ? (
            <Tooltip content={listening ? "Parar de ouvir" : "Falar (diga a pergunta, com ou sem “Olá, Vyz”)"} side="top">
              <button type="button" onClick={toggleMic} aria-pressed={listening} aria-label={listening ? "Parar de ouvir" : "Falar com o VYZ"} className={`${iconBtn} size-10 shrink-0 border border-line ${listening ? "border-accent bg-accent text-on-accent hover:bg-accent hover:text-on-accent" : ""}`}>
                {listening ? <MicOff size={17} aria-hidden /> : <Mic size={17} aria-hidden />}
              </button>
            </Tooltip>
          ) : (
            <Tooltip content="Voz no Avançado e no Personalizado" side="top">
              <Link href="/painel/plano" aria-label="Voz disponível no Avançado: ver planos" className={`${iconBtn} relative size-10 shrink-0 border border-line`}>
                <Mic size={17} aria-hidden className="opacity-50" />
                <Lock size={11} aria-hidden className="absolute right-1 bottom-1" />
              </Link>
            </Tooltip>
          ))}
        <label htmlFor="vyz-input" className="sr-only">
          Pergunte ao VYZ
        </label>
        <input
          id="vyz-input"
          value={listening && interim ? interim : text}
          onChange={(e) => setText(e.target.value)}
          placeholder={listening ? "Ouvindo…" : "Pergunte ao VYZ…"}
          autoComplete="off"
          readOnly={listening}
          className="h-10 min-w-0 flex-1 rounded-control border border-line bg-field px-3 text-[14px] text-fg outline-none placeholder:text-fg-2/70 focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent"
        />
        <button type="submit" disabled={busy || !text.trim()} aria-label="Enviar" className="inline-flex size-10 shrink-0 items-center justify-center rounded-control bg-accent text-on-accent outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-40">
          <Send size={16} aria-hidden />
        </button>
      </form>
      <p className="mt-2 text-center text-[11.5px] text-fg-2">Respostas calculadas neste navegador. Nenhum dado sai daqui.</p>
    </div>
  );
}

export function AgentDrawer() {
  const { open, setOpen, messages, clear, mascot, engineLabel, voiceAllowed, speakerOn, setSpeakerOn } = useAgent();
  const end = useRef<HTMLDivElement>(null);
  const last = messages.at(-1);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages.length, last?.shown]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/30 sm:bg-black/15" />
        <Dialog.Content
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            document.getElementById("vyz-input")?.focus();
          }}
          className="vyz-drawer fixed inset-0 z-[110] flex flex-col bg-card text-fg outline-none sm:inset-y-3 sm:right-3 sm:left-auto sm:w-[420px] sm:rounded-[20px] sm:border sm:border-line"
        >
          <header className="flex items-center gap-3 border-b border-line px-4 py-3">
            <Mascot state={mascot} size={34} />
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-[15px] font-semibold">VYZ</Dialog.Title>
              <Dialog.Description className="truncate text-[12px] text-fg-2">{engineLabel}</Dialog.Description>
            </div>
            {voiceAllowed ? (
              <Tooltip content={speakerOn ? "Desligar leitura em voz alta" : "Ler respostas em voz alta"} side="bottom">
                <button type="button" onClick={() => setSpeakerOn(!speakerOn)} aria-pressed={speakerOn} aria-label="Ler respostas em voz alta" className={iconBtn}>
                  {speakerOn ? <Volume2 size={17} aria-hidden /> : <VolumeX size={17} aria-hidden />}
                </button>
              </Tooltip>
            ) : (
              <Tooltip content="Voz no Avançado e no Personalizado" side="bottom">
                <Link href="/painel/plano" aria-label="Leitura em voz alta disponível no Avançado: ver planos" className={`${iconBtn} relative`}>
                  <VolumeX size={17} aria-hidden className="opacity-50" />
                  <Lock size={10} aria-hidden className="absolute right-1 bottom-1" />
                </Link>
              </Tooltip>
            )}
            <Tooltip content="Limpar conversa" side="bottom">
              <button type="button" onClick={clear} aria-label="Limpar conversa" className={iconBtn} disabled={!messages.length}>
                <RotateCcw size={16} aria-hidden />
              </button>
            </Tooltip>
            <Dialog.Close aria-label="Fechar" className={iconBtn}>
              <X size={18} aria-hidden />
            </Dialog.Close>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {messages.length === 0 ? (
              <Empty />
            ) : (
              <ol role="log" aria-live="polite" aria-label="Conversa com o VYZ" className="space-y-4">
                {messages.map((m) => (
                  <Bubble key={m.id} m={m} />
                ))}
              </ol>
            )}
            <div ref={end} />
          </div>

          <Composer />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
