import { describe, expect, it } from "vitest";
import { LOGO_MAX_BYTES, logoProblem, sniffLogo } from "./logo";

const bytes = (...b: number[]) => new Uint8Array(b);
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

describe("sniffLogo", () => {
  it("reconhece PNG, JPEG e WebP pelos primeiros bytes", () => {
    expect(sniffLogo(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0))?.ext).toBe("png");
    expect(sniffLogo(bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0x10))?.mime).toBe("image/jpeg");
    expect(sniffLogo(bytes(...ascii("RIFF"), 1, 2, 3, 4, ...ascii("WEBPVP8 ")))?.ext).toBe("webp");
  });

  it("recusa SVG, GIF, HTML, RIFF que não é WebP e arquivo curto", () => {
    expect(sniffLogo(bytes(...ascii("<svg xmlns='http://www.w3.org/2000/svg'>")))).toBeNull();
    expect(sniffLogo(bytes(...ascii("GIF89a")))).toBeNull();
    expect(sniffLogo(bytes(...ascii("<!doctype html>")))).toBeNull();
    expect(sniffLogo(bytes(...ascii("RIFF"), 1, 2, 3, 4, ...ascii("WAVE")))).toBeNull();
    expect(sniffLogo(bytes(0x89, 0x50, 0x4e))).toBeNull();
    expect(sniffLogo(bytes())).toBeNull();
  });
});

describe("logoProblem", () => {
  it("confere tamanho e tipo declarado", () => {
    expect(logoProblem({ size: 1000, type: "image/png" })).toBeNull();
    expect(logoProblem({ size: 0, type: "image/png" })).toMatch(/vazio/);
    expect(logoProblem({ size: LOGO_MAX_BYTES + 1, type: "image/png" })).toMatch(/2 MB/);
    expect(logoProblem({ size: 10, type: "image/svg+xml" })).toMatch(/PNG, JPEG ou WebP/);
    // sem tipo declarado: o servidor decide pelos bytes
    expect(logoProblem({ size: 10, type: "" })).toBeNull();
  });
});
