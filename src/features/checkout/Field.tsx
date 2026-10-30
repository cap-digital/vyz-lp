"use client";

// Campo de texto do checkout: rótulo, dica ou erro ligados ao input
// (aria-describedby) e um espaço à direita (bandeira do cartão, mostrar senha).

import { useId, type InputHTMLAttributes, type ReactNode } from "react";

type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "className"> & {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: ReactNode;
  error?: string | null;
  trailing?: ReactNode;
  className?: string;
};

export function Field({ label, value, onChange, hint, error, trailing, className = "", id: idProp, ...input }: FieldProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const describedBy = error ? `${id}-erro` : hint ? `${id}-dica` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-[13.5px] font-medium text-fg">
        {label}
      </label>
      <div
        className={`mt-1.5 flex h-12 items-center rounded-[10px] border bg-field transition-colors duration-150 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/40 ${
          error ? "border-error" : "border-line"
        } ${input.readOnly ? "bg-card" : ""}`}
      >
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="h-full min-w-0 flex-1 rounded-[10px] bg-transparent px-4 text-[15px] text-fg outline-none placeholder:text-fg-2/70 read-only:text-fg-2"
          {...input}
        />
        {trailing && <div className="flex shrink-0 items-center pr-2">{trailing}</div>}
      </div>
      {error ? (
        <p id={`${id}-erro`} className="mt-1.5 text-[12.5px] text-error-fg">
          {error}
        </p>
      ) : hint ? (
        <div id={`${id}-dica`} className="mt-1.5 text-[12.5px] text-fg-2">
          {hint}
        </div>
      ) : null}
    </div>
  );
}
