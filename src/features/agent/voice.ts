"use client";

// Web Speech API, só no navegador e só quando o usuário liga: reconhecimento
// em pt-BR (microfone) e leitura em voz alta. Sem suporte, as funções avisam
// e o painel esconde o microfone.

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const canListen = () => recognitionCtor() !== null;
export const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window;

/** Mensagem curta para cada erro do reconhecimento (o fluxo segue por texto). */
export function micErrorMessage(code: string): string {
  if (code === "not-allowed" || code === "service-not-allowed") return "Permissão do microfone negada. Libere nas configurações do navegador ou digite a pergunta.";
  if (code === "no-speech") return "Não ouvi nada. Toque no microfone e fale de novo.";
  if (code === "audio-capture") return "Nenhum microfone encontrado. Pode digitar a pergunta.";
  if (code === "network") return "O reconhecimento de voz precisa de internet. Pode digitar a pergunta.";
  return "O reconhecimento de voz falhou. Pode digitar a pergunta.";
}

/** "Olá, Vyz" / "Oi, Vyz" no começo da frase. */
const WAKE = /^\s*(ol[aá]|oi|ei)[,!\s]+(vyz|viz|vis|vys|vaiz|vise)\b[,!.\s]*/i;
export function stripWakeWord(text: string): { woke: boolean; rest: string } {
  const m = text.match(WAKE);
  return m ? { woke: true, rest: text.slice(m[0].length).trim() } : { woke: false, rest: text.trim() };
}

/**
 * Escuta enquanto o microfone estiver ligado (só com o drawer aberto). Cada
 * frase final vira pergunta; "Olá, Vyz" no começo é opcional e sai do texto.
 */
export function listen(handlers: { onInterim(text: string): void; onFinal(text: string): void; onError(message: string): void; onEnd(): void }) {
  const Ctor = recognitionCtor();
  if (!Ctor) {
    handlers.onError("Este navegador não reconhece voz. Pode digitar a pergunta.");
    handlers.onEnd();
    return () => {};
  }
  const r = new Ctor();
  r.lang = "pt-BR";
  r.continuous = false;
  r.interimResults = true;
  r.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i];
      if (res.isFinal) handlers.onFinal(res[0].transcript);
      else interim += res[0].transcript;
    }
    if (interim) handlers.onInterim(interim);
  };
  r.onerror = (e) => {
    if (e.error !== "aborted") handlers.onError(micErrorMessage(e.error));
  };
  r.onend = () => handlers.onEnd();
  try {
    r.start();
  } catch {
    handlers.onError(micErrorMessage("start"));
    handlers.onEnd();
  }
  return () => {
    try {
      r.abort();
    } catch {}
  };
}

/** Lê o texto em pt-BR. Devolve como cancelar. */
export function speak(text: string, on: { start(): void; end(): void }) {
  if (!canSpeak()) return () => {};
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "pt-BR";
  const voice = synth.getVoices().find((v) => v.lang?.toLowerCase().startsWith("pt-br")) ?? synth.getVoices().find((v) => v.lang?.toLowerCase().startsWith("pt"));
  if (voice) u.voice = voice;
  u.rate = 1.03;
  u.onstart = on.start;
  u.onend = on.end;
  u.onerror = on.end;
  synth.speak(u);
  return () => synth.cancel();
}
