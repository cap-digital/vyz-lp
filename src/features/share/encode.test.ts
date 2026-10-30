import { describe, expect, it } from "vitest";
import { decodeData, encodeData } from "./encode";

const content = { titulo: "Loja Verde · Promoção de inverno", itens: Array.from({ length: 12 }, (_, i) => ({ nome: `Produto ${i}`, preço: 9990 + i })) };

describe("código compacto (prévia de LP)", () => {
  it("ida e volta preserva o JSON (com acento)", async () => {
    const code = await encodeData(content);
    expect(code).toMatch(/^[zj]\.[A-Za-z0-9_-]+$/);
    expect(await decodeData(`#${code}`)).toEqual(content);
  });

  it("comprime: o código fica menor que o JSON em base64", async () => {
    const code = await encodeData(content);
    expect(code.length).toBeLessThan(Buffer.from(JSON.stringify(content)).toString("base64url").length);
  });

  it("recusa lixo", async () => {
    await expect(decodeData("x.abc")).rejects.toThrow();
    await expect(decodeData("j.bm90LWpzb24")).rejects.toThrow();
  });
});
