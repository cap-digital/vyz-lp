// Ids e slugs gerados no navegador.

/** Id curto e legível (base36). */
export function newId(prefix = ""): string {
  const rand =
    typeof crypto !== "undefined" && "getRandomValues" in crypto
      ? Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => (b % 36).toString(36)).join("")
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}${Date.now().toString(36).slice(-4)}${rand}`;
}

/** "Loja Verde Ltda." → "lojaverdeltda"; com separador "-" → "loja-verde-ltda". */
export function slugify(name: string, sep = ""): string {
  const words = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  return words.join(sep).slice(0, 32) || "suamarca";
}
