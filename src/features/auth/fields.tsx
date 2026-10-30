"use client";

// Campos das telas de acesso: rótulo, erro ligado ao campo (aria-describedby),
// senha com mostrar/esconder e a lista de regras ao vivo. O tamanho padrão é
// o do /entrar (campo alto, raio 10); `compact` segue os campos do painel.

import { Check, Eye, EyeOff } from "lucide-react";
import { useEffect, useId, useRef, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { passwordChecklist } from "./password-rules";

const SIZE = {
  regular: { field: "h-12 rounded-[10px] px-4 text-[15px]", toggle: "w-12 rounded-r-[10px]", pad: "pr-12" },
  compact: { field: "h-10 rounded-control px-3 text-[14px]", toggle: "w-10 rounded-r-control", pad: "pr-10" },
};

const FIELD =
  "w-full border bg-field text-fg outline-none transition-colors placeholder:text-fg-2/70 focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50";

type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "className" | "size"> & {
  label: string;
  /** Rótulo só para leitor de tela (o /entrar segue o visual da pág. 17). */
  hideLabel?: boolean;
  error?: string;
  /** Ajuda embaixo do campo (dá lugar ao erro). */
  hint?: ReactNode;
  /** Outros ids que descrevem o campo (ex.: a lista de regras da senha). */
  describedBy?: string;
  compact?: boolean;
};

function Field({ id, label, hideLabel, error, hint, compact, children }: Pick<FieldProps, "label" | "hideLabel" | "error" | "hint" | "compact"> & { id: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className={hideLabel ? "sr-only" : `mb-1.5 block font-medium text-fg ${compact ? "text-[13px]" : "text-[13.5px]"}`}>
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-e`} className="mt-1.5 text-[12.5px] leading-snug text-error-fg">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-h`} className="mt-1.5 text-[12.5px] leading-snug text-fg-2">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const describe = (id: string, error?: string, hint?: ReactNode, extra?: string) =>
  [error ? `${id}-e` : hint ? `${id}-h` : null, extra].filter(Boolean).join(" ") || undefined;

export function AuthInput({ label, hideLabel, error, hint, describedBy, compact, ...input }: FieldProps) {
  const id = useId();
  const size = SIZE[compact ? "compact" : "regular"];
  return (
    <Field id={id} label={label} hideLabel={hideLabel} error={error} hint={hint} compact={compact}>
      <input
        id={id}
        {...input}
        aria-invalid={error ? true : undefined}
        aria-describedby={describe(id, error, hint, describedBy)}
        className={`${FIELD} ${size.field} ${error ? "border-error" : "border-line"}`}
      />
    </Field>
  );
}

export function PasswordInput({ label, hideLabel, error, hint, describedBy, compact, ...input }: Omit<FieldProps, "type">) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const size = SIZE[compact ? "compact" : "regular"];
  return (
    <Field id={id} label={label} hideLabel={hideLabel} error={error} hint={hint} compact={compact}>
      <div className="relative">
        <input
          id={id}
          {...input}
          type={visible ? "text" : "password"}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={describe(id, error, hint, describedBy)}
          className={`${FIELD} ${size.field} ${size.pad} ${error ? "border-error" : "border-line"}`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label="Mostrar senha"
          aria-pressed={visible}
          aria-controls={id}
          className={`absolute inset-y-0 right-0 inline-flex items-center justify-center text-fg-2 transition-colors hover:text-fg focus-visible:outline-offset-[-2px] ${size.toggle}`}
        >
          {visible ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
        </button>
      </div>
    </Field>
  );
}

/** "A senha precisa ter": marca o que já foi cumprido enquanto a pessoa digita. */
export function PasswordChecklist({ id, value }: { id: string; value: string }) {
  return (
    <ul id={id} aria-label="A senha precisa ter" className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px]">
      {passwordChecklist(value).map((rule) => (
        <li key={rule.id} className={`inline-flex items-center gap-1.5 transition-colors ${rule.ok ? "text-fg" : "text-fg-2"}`}>
          <Check size={13} aria-hidden className={rule.ok ? "text-accent" : "opacity-30"} />
          {rule.label}
          <span className="sr-only">{rule.ok ? "(cumprido)" : "(falta)"}</span>
        </li>
      ))}
    </ul>
  );
}

const ALERT = {
  error: "border-error/40 bg-error-soft text-error-fg",
  info: "border-line bg-accent-soft text-fg",
};

/** Mensagem do formulário: erro (anunciado na hora) ou aviso. */
export function FormAlert({ tone = "error", children }: { tone?: keyof typeof ALERT; children: ReactNode }) {
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`rounded-[10px] border px-3.5 py-2.5 text-[13.5px] leading-snug ${ALERT[tone]}`}>
      {children}
    </p>
  );
}

/** Depois de uma resposta com erro de campo, leva o foco ao primeiro campo inválido. */
export function useFocusFirstInvalid(state: unknown) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state) ref.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
  }, [state]);
  return ref;
}
