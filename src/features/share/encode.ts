// Link compartilhável sem backend: a configuração do dashboard vai no
// fragmento da URL (/r/[id]#<payload>), comprimida (deflate-raw) e em base64url.
// O fragmento não sai do navegador. Funções puras, testadas.

import type { Brand } from "@/features/workspace/workspace";
import type { Dashboard, DashboardSettings } from "@/features/workspace/types";
import type { PageId } from "@/features/templates/types";

export type SharePayload = {
  templateId: string;
  name: string;
  client: string;
  pages: PageId[];
  settings: DashboardSettings;
  brand?: Brand;
  /** Epoch em ms; ausente = nunca expira. */
  expiresAt?: number;
  hideSpend?: boolean;
};

// chaves curtas para o JSON ficar compacto
type Compact = { v: 1; t: string; n: string; c: string; p: PageId[]; s: [number, number, number, string, number, string]; b?: [string, number, string?]; e?: number; h?: 1 };

function toCompact(p: SharePayload): Compact {
  const s = p.settings;
  const out: Compact = { v: 1, t: p.templateId, n: p.name, c: p.client, p: p.pages, s: [s.goal, s.margin, s.budget, s.period, s.customDays, s.attribution] };
  if (p.brand) out.b = p.brand.logo ? [p.brand.color, p.brand.hideVyz ? 1 : 0, p.brand.logo] : [p.brand.color, p.brand.hideVyz ? 1 : 0];
  if (p.expiresAt) out.e = p.expiresAt;
  if (p.hideSpend) out.h = 1;
  return out;
}

function fromCompact(c: Compact): SharePayload {
  if (c.v !== 1 || typeof c.t !== "string" || !Array.isArray(c.p) || !Array.isArray(c.s)) throw new Error("payload inválido");
  return {
    templateId: c.t,
    name: String(c.n ?? ""),
    client: String(c.c ?? ""),
    pages: c.p,
    settings: { goal: Number(c.s[0]) || 0, margin: Number(c.s[1]) || 0.4, budget: Number(c.s[2]) || 0, period: c.s[3] as DashboardSettings["period"], customDays: Number(c.s[4]) || 14, attribution: String(c.s[5]), currency: "BRL" },
    brand: c.b ? { color: c.b[0], hideVyz: c.b[1] === 1, logo: c.b[2] } : undefined,
    expiresAt: c.e,
    hideSpend: c.h === 1,
  };
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

/** "z." = comprimido; "j." = só base64url (sem CompressionStream). */
export async function encodeShare(p: SharePayload): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(toCompact(p)));
  if (typeof CompressionStream !== "undefined") {
    return `z.${bytesToBase64Url(await pipe(json, new CompressionStream("deflate-raw")))}`;
  }
  return `j.${bytesToBase64Url(json)}`;
}

export async function decodeShare(raw: string): Promise<SharePayload> {
  const s = raw.replace(/^#/, "");
  const [kind, body] = [s.slice(0, 2), s.slice(2)];
  let bytes = base64UrlToBytes(body);
  if (kind === "z.") bytes = await pipe(bytes, new DecompressionStream("deflate-raw"));
  else if (kind !== "j.") throw new Error("formato desconhecido");
  return fromCompact(JSON.parse(new TextDecoder().decode(bytes)) as Compact);
}

export function isExpired(p: Pick<SharePayload, "expiresAt">, now = Date.now()): boolean {
  return !!p.expiresAt && p.expiresAt < now;
}

export function payloadFrom(d: Dashboard, opts: { expiresInDays: number | null; hideSpend: boolean }, now = Date.now()): SharePayload {
  return {
    templateId: d.templateId,
    name: d.name,
    client: d.client,
    pages: d.pages,
    settings: d.settings,
    brand: d.brand,
    expiresAt: opts.expiresInDays ? now + opts.expiresInDays * 86_400_000 : undefined,
    hideSpend: opts.hideSpend,
  };
}

/** Qualquer JSON → código compacto (usado na prévia pública das LPs). */
export async function encodeData(value: unknown): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(value));
  if (typeof CompressionStream !== "undefined") return `z.${bytesToBase64Url(await pipe(json, new CompressionStream("deflate-raw")))}`;
  return `j.${bytesToBase64Url(json)}`;
}

export async function decodeData<T>(raw: string): Promise<T> {
  const s = raw.replace(/^#/, "");
  const [kind, body] = [s.slice(0, 2), s.slice(2)];
  let bytes = base64UrlToBytes(body);
  if (kind === "z.") bytes = await pipe(bytes, new DecompressionStream("deflate-raw"));
  else if (kind !== "j.") throw new Error("formato desconhecido");
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}
