"use client";

// Área de soltar arquivo (clique, teclado ou arrastar). O <input type="file">
// fica escondido; nada com cara de controle nativo.

import { ImageUp } from "lucide-react";
import { useId, useRef, useState, type ReactNode } from "react";

type Props = { label: string; hint?: ReactNode; accept: string; onFile: (f: File) => void; error?: string | null; compact?: boolean };

export function FileInput({ label, hint, accept, onFile, error, compact = false }: Props) {
  const id = useId();
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [name, setName] = useState<string | null>(null);
  const pick = (f?: File | null) => {
    if (!f) return;
    setName(f.name);
    onFile(f);
  };
  return (
    <div className="space-y-1">
      <p id={`${id}-l`} className="text-[13px] font-medium text-fg">
        {label}
      </p>
      <div
        role="button"
        tabIndex={0}
        aria-labelledby={`${id}-l`}
        aria-describedby={`${id}-d`}
        onClick={() => ref.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            ref.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          pick(e.dataTransfer.files?.[0]);
        }}
        className={`flex cursor-pointer items-center gap-3 rounded-card border border-dashed text-[13.5px] transition-colors duration-150 outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/40 ${compact ? "p-3" : "p-4"} ${over ? "border-accent bg-accent-soft/50" : error ? "border-error" : "border-line bg-field hover:border-fg-2/60"}`}
      >
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent">
          <ImageUp size={17} aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block truncate font-medium text-fg">{name ?? "Escolher arquivo ou arrastar aqui"}</span>
          <span id={`${id}-d`} className="block text-[12px] text-fg-2">
            {hint}
          </span>
        </span>
        <input
          ref={ref}
          type="file"
          accept={accept}
          tabIndex={-1}
          aria-hidden
          className="hidden"
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      {error && <p className="text-[12px] text-error-fg">{error}</p>}
    </div>
  );
}

/** Lê uma imagem pequena como dataURL, com limite de tamanho. */
export function readImage(f: File, maxBytes: number, onOk: (dataUrl: string) => void, onError: (msg: string) => void) {
  if (f.size > maxBytes) return onError(`Use uma imagem de até ${Math.round(maxBytes / 1000)} KB.`);
  const r = new FileReader();
  r.onload = () => onOk(String(r.result));
  r.onerror = () => onError("Não deu para ler o arquivo.");
  r.readAsDataURL(f);
}
