import { describe, expect, it } from "vitest";
import { formatTaxId, isValidCnpj, isValidCpf, isValidTaxId, maskTaxId, normalizeTaxId, onlyDigits, taxIdKind } from "./tax-id";

describe("CPF", () => {
  it("aceita CPFs válidos, com ou sem máscara", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("52998224725")).toBe(true);
    expect(isValidCpf("111.444.777-35")).toBe(true);
  });

  it("recusa dígito verificador errado", () => {
    expect(isValidCpf("529.982.247-24")).toBe(false);
    expect(isValidCpf("529.982.247-15")).toBe(false);
  });

  it("recusa sequências repetidas e tamanho errado", () => {
    expect(isValidCpf("000.000.000-00")).toBe(false);
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCpf("5299822472")).toBe(false);
    expect(isValidCpf("529982247250")).toBe(false);
  });

  it("dígito 0 quando o resto é menor que 2", () => {
    // 100.000.001-08: o primeiro dígito sai do resto 1 (vira 0)
    expect(isValidCpf("10000000108")).toBe(true);
  });
});

describe("CNPJ", () => {
  it("aceita CNPJs válidos, com ou sem máscara", () => {
    expect(isValidCnpj("11.222.333/0001-81")).toBe(true);
    expect(isValidCnpj("11222333000181")).toBe(true);
    expect(isValidCnpj("45.997.418/0001-53")).toBe(true);
  });

  it("recusa dígito verificador errado e sequências", () => {
    expect(isValidCnpj("11.222.333/0001-80")).toBe(false);
    expect(isValidCnpj("11.222.333/0001-91")).toBe(false);
    expect(isValidCnpj("00.000.000/0000-00")).toBe(false);
    expect(isValidCnpj("1122233300018")).toBe(false);
  });
});

describe("CNPJ alfanumérico (desde jul/2026)", () => {
  it("aceita o exemplo da Receita Federal, em qualquer caixa", () => {
    expect(isValidCnpj("12.ABC.345/01DE-35")).toBe(true);
    expect(isValidCnpj("12ABC34501DE35")).toBe(true);
    expect(isValidCnpj("12.abc.345/01de-35")).toBe(true);
    expect(isValidTaxId("12ABC34501DE35")).toBe(true);
  });

  it("recusa verificador errado, letra nos verificadores e letra no CPF", () => {
    expect(isValidCnpj("12.ABC.345/01DE-34")).toBe(false);
    expect(isValidCnpj("12ABC34501DE3A")).toBe(false);
    expect(isValidCnpj("AAAAAAAAAAAAAA")).toBe(false);
    expect(isValidCpf("529.982.247-2A")).toBe(false);
    expect(taxIdKind("5299822472A")).toBeNull();
  });

  it("normaliza para maiúsculas sem pontuação (o formato do banco)", () => {
    expect(normalizeTaxId(" 12.abc.345/01de-35 ")).toBe("12ABC34501DE35");
    expect(normalizeTaxId("529.982.247-25")).toBe("52998224725");
    expect(normalizeTaxId("12ABC34501DE35")).toMatch(/^([0-9]{11}|[0-9A-Z]{12}[0-9]{2})$/);
  });

  it("formata com letras e mantém só dígitos nos verificadores", () => {
    expect(formatTaxId("12a")).toBe("12.A");
    expect(formatTaxId("12abc34501")).toBe("12.ABC.345/01");
    expect(formatTaxId("12abc34501de35")).toBe("12.ABC.345/01DE-35");
    expect(formatTaxId("12abc34501deX3")).toBe("12.ABC.345/01DE-3");
    expect(maskTaxId("12ABC34501DE35")).toBe("12.ABC.345/01DE-35");
  });
});

describe("CPF ou CNPJ", () => {
  it("decide pelo tamanho", () => {
    expect(taxIdKind("529.982.247-25")).toBe("cpf");
    expect(taxIdKind("11.222.333/0001-81")).toBe("cnpj");
    expect(taxIdKind("12.ABC.345/01DE-35")).toBe("cnpj");
    expect(taxIdKind("123")).toBeNull();
    expect(isValidTaxId("52998224725")).toBe(true);
    expect(isValidTaxId("11222333000181")).toBe(true);
    expect(isValidTaxId("")).toBe(false);
  });

  it("só dígitos", () => {
    expect(onlyDigits(" 529.982.247-25 ")).toBe("52998224725");
  });
});

describe("máscara", () => {
  it("formata o CPF enquanto digita", () => {
    expect(formatTaxId("529")).toBe("529");
    expect(formatTaxId("5299")).toBe("529.9");
    expect(formatTaxId("5299822")).toBe("529.982.2");
    expect(formatTaxId("5299822472")).toBe("529.982.247-2");
    expect(formatTaxId("52998224725")).toBe("529.982.247-25");
  });

  it("passa para CNPJ depois de 11 dígitos", () => {
    expect(formatTaxId("112223330001")).toBe("11.222.333/0001");
    expect(formatTaxId("1122233300018")).toBe("11.222.333/0001-8");
    expect(formatTaxId("11222333000181")).toBe("11.222.333/0001-81");
    expect(formatTaxId("11.222.333/0001-8199")).toBe("11.222.333/0001-81");
  });

  it("esconde o CPF para exibir", () => {
    expect(maskTaxId("52998224725")).toBe("***.982.247-**");
    expect(maskTaxId("11222333000181")).toBe("11.222.333/0001-81");
    expect(maskTaxId(null)).toBeNull();
  });
});
