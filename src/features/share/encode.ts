// JSON compacto para URL: comprimido (deflate-raw) e em base64url. Usado na
// prévia pública das LPs (#<código>, que não sai do navegador). Os links de
// dashboard não usam mais isto: são tokens conferidos no servidor (/r/<token>).

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

/** Qualquer JSON → código compacto. "z." = comprimido; "j." = só base64url (sem CompressionStream). */
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
