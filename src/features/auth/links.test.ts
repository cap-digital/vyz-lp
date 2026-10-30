import { describe, expect, it } from "vitest";
import { failurePath, isEmailLinkType, isRecoveryReturn, isTokenHash, returnFailure, setsPassword } from "./links";

describe("volta do Google e do link de e-mail", () => {
  it("falha no link de senha leva a pedir outro", () => {
    expect(returnFailure({ recovery: true })).toBe("link_invalido");
    expect(returnFailure({ recovery: true, errorCode: "pkce_code_verifier_not_found" })).toBe("outro_navegador");
    expect(failurePath("link_invalido", { recovery: true, next: "/redefinir-senha" })).toBe("/recuperar-senha?erro=link_invalido");
  });

  it("falha no Google volta para entrar, mantendo o destino", () => {
    expect(returnFailure({ recovery: false, providerError: "access_denied" })).toBe("google_cancelado");
    expect(returnFailure({ recovery: false, errorCode: "bad_code_verifier" })).toBe("google");
    expect(failurePath("google", { recovery: false, next: "/assinar?plano=pro" })).toBe("/entrar?erro=google&next=%2Fassinar%3Fplano%3Dpro");
    expect(failurePath("google", { recovery: false, next: "/painel" })).toBe("/entrar?erro=google");
  });

  it("reconhece a volta do link de senha pelo destino", () => {
    expect(isRecoveryReturn("/redefinir-senha")).toBe(true);
    expect(isRecoveryReturn("/painel")).toBe(false);
  });
});

describe("/auth/confirm", () => {
  it("só tipos conhecidos e token com formato de token", () => {
    expect(isEmailLinkType("recovery")).toBe(true);
    expect(isEmailLinkType("sms")).toBe(false);
    expect(isEmailLinkType(null)).toBe(false);
    expect(isTokenHash("pkce_0a1b2c3d4e5f")).toBe(true);
    expect(isTokenHash("abc")).toBe(false);
    expect(isTokenHash("a".repeat(513))).toBe(false);
    expect(isTokenHash("abc def ghi")).toBe(false);
  });

  it("recuperação e convite terminam criando a senha", () => {
    expect(setsPassword("recovery")).toBe(true);
    expect(setsPassword("invite")).toBe(true);
    expect(setsPassword("email_change")).toBe(false);
  });
});
