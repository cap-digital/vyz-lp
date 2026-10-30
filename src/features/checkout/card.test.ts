import { describe, expect, it } from "vitest";
import { TEST_CARDS, detectBrand, formatCardNumber, formatExpiry, isExpired, luhnValid, parseExpiry, validateCard } from "./card";

const now = new Date(2026, 9, 29); // 29/10/2026

describe("Luhn", () => {
  it("aceita os cartões de teste", () => {
    expect(luhnValid(TEST_CARDS.approved)).toBe(true);
    expect(luhnValid(TEST_CARDS.declined)).toBe(true);
    expect(luhnValid(TEST_CARDS.insufficientFunds)).toBe(true);
    expect(luhnValid("5555 5555 5555 4444")).toBe(true);
    expect(luhnValid("378282246310005")).toBe(true);
    expect(luhnValid("6362970000457013")).toBe(true);
  });

  it("recusa um dígito trocado e números curtos", () => {
    expect(luhnValid("4242 4242 4242 4241")).toBe(false);
    expect(luhnValid("4242")).toBe(false);
  });
});

describe("bandeira", () => {
  it("reconhece as principais bandeiras", () => {
    expect(detectBrand("4242424242424242")).toBe("visa");
    expect(detectBrand("5555555555554444")).toBe("mastercard");
    expect(detectBrand("2223003122003222")).toBe("mastercard");
    expect(detectBrand("378282246310005")).toBe("amex");
    expect(detectBrand("6362970000457013")).toBe("elo");
    expect(detectBrand("5067000000000000")).toBe("elo");
    expect(detectBrand("6062825624254001")).toBe("hipercard");
    expect(detectBrand("3056930009020004")).toBe("diners");
    expect(detectBrand("6011111111111117")).toBe("discover");
    expect(detectBrand("3566002020360505")).toBe("jcb");
  });

  it("o Elo vem antes do Visa que divide o começo", () => {
    expect(detectBrand("4011780000000000")).toBe("elo");
    expect(detectBrand("4011770000000000")).toBe("visa");
  });

  it("sem dígitos ou começo desconhecido", () => {
    expect(detectBrand("")).toBeNull();
    expect(detectBrand("9999")).toBeNull();
  });
});

describe("máscaras", () => {
  it("número em grupos", () => {
    expect(formatCardNumber("4242424242424242")).toBe("4242 4242 4242 4242");
    expect(formatCardNumber("42424")).toBe("4242 4");
    expect(formatCardNumber("378282246310005")).toBe("3782 822463 10005");
    expect(formatCardNumber("4242 4242 4242 4242 4242")).toBe("4242 4242 4242 4242 424");
  });

  it("validade MM/AA", () => {
    expect(formatExpiry("1")).toBe("1");
    expect(formatExpiry("12")).toBe("12");
    expect(formatExpiry("123")).toBe("12/3");
    expect(formatExpiry("12/345")).toBe("12/34");
  });
});

describe("validade", () => {
  it("lê MM/AA", () => {
    expect(parseExpiry("12/34")).toEqual({ month: 12, year: 2034 });
    expect(parseExpiry("13/34")).toBeNull();
    expect(parseExpiry("00/34")).toBeNull();
    expect(parseExpiry("1234")).toBeNull();
  });

  it("vale até o fim do mês", () => {
    expect(isExpired({ month: 10, year: 2026 }, now)).toBe(false);
    expect(isExpired({ month: 9, year: 2026 }, now)).toBe(true);
    expect(isExpired({ month: 1, year: 2027 }, now)).toBe(false);
  });
});

describe("formulário do cartão", () => {
  const ok = { number: TEST_CARDS.approved, expiry: "12/30", cvc: "123", name: "Pessoa Teste" };

  it("devolve só bandeira, final e validade", () => {
    expect(validateCard(ok, now)).toEqual({ ok: true, card: { brand: "visa", last4: "4242", expMonth: 12, expYear: 2030 } });
  });

  it("aponta cada campo errado", () => {
    const r = validateCard({ number: "4242 4242 4242 4241", expiry: "09/26", cvc: "12", name: "" }, now);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.errors).sort()).toEqual(["cvc", "expiry", "name", "number"]);
    expect(r.errors.expiry).toBe("Este cartão está vencido.");
  });

  it("American Express pede 4 dígitos no código", () => {
    const amex = { ...ok, number: "378282246310005" };
    expect(validateCard({ ...amex, cvc: "123" }, now).ok).toBe(false);
    expect(validateCard({ ...amex, cvc: "1234" }, now)).toMatchObject({ ok: true, card: { brand: "amex", last4: "0005" } });
  });

  it("recusa validade longe demais e nome com números", () => {
    expect(validateCard({ ...ok, expiry: "12/99" }, now).ok).toBe(false);
    expect(validateCard({ ...ok, name: "R2D2" }, now).ok).toBe(false);
  });
});
