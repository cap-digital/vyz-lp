"use client";

// Formulário da LP no ar. Usa a paleta da página (é do cliente), não a do
// painel. Envia por Server Action pública; o campo "website" é a armadilha para robôs.

import { useActionState, useEffect, useId, type FormEvent } from "react";
import type { LeadFormState } from "@/server/landing-pages/actions";
import { submitLandingForm } from "@/server/landing-pages/actions";
import { FIELD_PREFIX, HONEYPOT_FIELD } from "./model";

type Props = { slug: string; fields: string[]; cta: string; /** Prévia do rascunho: não envia. */ preview?: boolean };

declare global {
  interface Window {
    dataLayer?: unknown[];
    fbq?: (...args: unknown[]) => void;
  }
}

const inputType = (label: string) => (/e-?mail/i.test(label) ? "email" : /whats|telefone|celular|fone/i.test(label) ? "tel" : "text");
const autoComplete = (label: string) => (/e-?mail/i.test(label) ? "email" : /whats|telefone|celular|fone/i.test(label) ? "tel" : /nome/i.test(label) ? "name" : "off");

export function LeadForm({ slug, fields, cta, preview = false }: Props) {
  const id = useId();
  const [state, action, pending] = useActionState<LeadFormState, FormData>(submitLandingForm.bind(null, slug), { status: "idle" });
  // Conversão para as tags da página (GTM e Pixel), quando existirem.
  useEffect(() => {
    if (state.status !== "sent") return;
    window.dataLayer?.push({ event: "generate_lead", lp: slug });
    window.fbq?.("track", "Lead");
  }, [state, slug]);

  // Origem da visita (UTMs e quem trouxe), lida na hora do envio.
  const stamp = (e: FormEvent<HTMLFormElement>) => {
    const f = e.currentTarget.elements;
    (f.namedItem("pagina") as HTMLInputElement).value = window.location.search;
    (f.namedItem("origem") as HTMLInputElement).value = document.referrer;
  };

  if (state.status === "sent") {
    return (
      <div role="status" className="rounded-[10px] border border-[#cfd3c6] bg-white p-5 text-center">
        <p className="text-[15px] font-bold">Enviado!</p>
        <p className="mt-1 text-[13px] text-[#5f625a]">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} onSubmit={stamp} noValidate className="space-y-2.5 rounded-[10px] border border-[#cfd3c6] bg-white p-4 @[700px]:p-5" aria-describedby={state.message ? `${id}-msg` : undefined}>
      {fields.map((label, i) => {
        const name = `${FIELD_PREFIX}${i}`;
        const err = state.fields?.[name];
        return (
          <div key={`${label}-${i}`}>
            <label htmlFor={`${id}-${i}`} className="text-[12px] font-medium text-[#4f5249]">
              {label}
            </label>
            <input
              id={`${id}-${i}`}
              name={name}
              type={inputType(label)}
              autoComplete={autoComplete(label)}
              maxLength={500}
              disabled={preview}
              aria-invalid={!!err}
              aria-describedby={err ? `${id}-${i}-e` : undefined}
              className={`mt-0.5 h-10 w-full rounded-[6px] border bg-[#fbfcf8] px-3 text-[14px] text-[#1e1e1e] outline-none focus:border-[var(--lp)] focus:ring-2 focus:ring-[var(--lp)]/30 ${err ? "border-[#b42318]" : "border-[#cfd3c6]"}`}
            />
            {err && (
              <p id={`${id}-${i}-e`} className="mt-0.5 text-[12px] text-[#b42318]">
                {err}
              </p>
            )}
          </div>
        );
      })}
      {/* Armadilha: fora da tela e fora do teclado. Gente não vê; robô preenche. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={`${id}-hp`}>Site</label>
        <input id={`${id}-hp`} name={HONEYPOT_FIELD} type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>
      <input type="hidden" name="pagina" defaultValue="" />
      <input type="hidden" name="origem" defaultValue="" />
      <button
        type="submit"
        disabled={pending || preview}
        className="mt-1 flex h-11 w-full items-center justify-center rounded-[7px] bg-[var(--lp)] px-4 text-[14px] font-semibold text-[var(--lp-ink)] transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lp)] disabled:opacity-60"
      >
        {pending ? "Enviando…" : cta || "Enviar"}
      </button>
      {preview && <p className="text-center text-[11.5px] text-[#6f726a]">Na prévia o formulário não envia.</p>}
      {state.status === "error" && state.message && (
        <p id={`${id}-msg`} role="alert" className="text-center text-[12.5px] text-[#b42318]">
          {state.message}
        </p>
      )}
      <p className="text-center text-[10.5px] text-[#6f726a]">Seus dados vão só para a equipe desta página.</p>
    </form>
  );
}
