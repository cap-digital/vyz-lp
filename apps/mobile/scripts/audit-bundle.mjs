// Auditoria antes de subir para a loja: procura no bundle compilado (e nos
// textos do app) termos que a revisão da Apple recusa (outras lojas, meios
// de pagamento externos, preço fora da loja).
//
//   node scripts/audit-bundle.mjs ios      (gera o bundle de produção e audita)
//   node scripts/audit-bundle.mjs <arquivo.jsbundle>

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const TERMS = ["Android", "Google Play", "Play Store", "Pix", "cartão", "cartao", "boleto", "assinar no site", "/assinar", "R$"];
const arg = process.argv[2] ?? "ios";
let file = arg;
if (arg === "ios") {
  file = "dist-audit/main.jsbundle";
  execFileSync("npx", ["expo", "export:embed", "--platform", "ios", "--dev", "false", "--bundle-output", file, "--assets-dest", "dist-audit"], { stdio: "inherit" });
}
if (!existsSync(file)) throw new Error(`Bundle não encontrado: ${file}`);
const text = readFileSync(file, "utf8");
let found = 0;
for (const term of TERMS) {
  const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&"), "g");
  const all = [...text.matchAll(re)];
  // parte de um identificador de código (ex.: disableClippingAndroid, getPixelSize): não aparece na tela
  const ident = /[A-Za-z0-9_$]/;
  const hits = all.filter((h) => !ident.test(text[h.index - 1] ?? "") && !ident.test(text[h.index + term.length] ?? ""));
  console.log(`${hits.length ? "✗" : "✓"} "${term}": ${hits.length} possível(is) texto(s)${all.length - hits.length ? ` · ${all.length - hits.length} em identificadores de código` : ""}`);
  for (const h of hits.slice(0, 5)) console.log(`    …${text.slice(Math.max(0, h.index - 60), h.index + 60).replace(/\s+/g, " ")}…`);
  found += hits.length;
}
console.log(found ? `\n${found} ocorrência(s). Veja se cada uma aparece na tela antes de subir.` : "\nNenhum termo proibido no bundle.");
process.exit(found ? 1 : 0);
