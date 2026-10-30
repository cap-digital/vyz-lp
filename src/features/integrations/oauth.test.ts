import { describe, expect, it } from "vitest";
import { isCodeVerifier, isStateToken, pkceChallenge, randomToken, sha256Hex } from "./oauth";

describe("state do OAuth", () => {
  it("32 bytes em base64url: 43 caracteres, sem padding, sempre diferente", () => {
    const a = randomToken();
    const b = randomToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
    expect(isStateToken(a)).toBe(true);
  });

  it("recusa state fora do formato", () => {
    expect(isStateToken("")).toBe(false);
    expect(isStateToken("a".repeat(42))).toBe(false);
    expect(isStateToken(`${"a".repeat(42)}=`)).toBe(false);
    expect(isStateToken(`${"a".repeat(42)}/`)).toBe(false);
    expect(isStateToken(null)).toBe(false);
  });

  it("o banco guarda o sha256 em hexadecimal (64 caracteres)", async () => {
    expect(await sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(await sha256Hex(randomToken())).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("PKCE (S256)", () => {
  it("bate com o exemplo da RFC 7636", async () => {
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    expect(await pkceChallenge(verifier)).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });

  it("verifier gerado tem o tamanho e os caracteres permitidos", () => {
    expect(isCodeVerifier(randomToken())).toBe(true);
    expect(isCodeVerifier("curto")).toBe(false);
    expect(isCodeVerifier(`${"a".repeat(43)}+`)).toBe(false);
  });
});
