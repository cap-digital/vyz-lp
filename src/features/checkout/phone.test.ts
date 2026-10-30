import { describe, expect, it } from "vitest";
import { formatPhone, normalizePhone } from "./phone";

describe("WhatsApp", () => {
  it("normaliza celular e fixo com DDD para E.164", () => {
    expect(normalizePhone("(71) 99957-5898")).toBe("+5571999575898");
    expect(normalizePhone("71999575898")).toBe("+5571999575898");
    expect(normalizePhone("+55 71 99957-5898")).toBe("+5571999575898");
    expect(normalizePhone("071 99957-5898")).toBe("+5571999575898");
    expect(normalizePhone("(11) 3456-7890")).toBe("+551134567890");
  });

  it("recusa número sem DDD, curto, longo ou celular sem o 9", () => {
    expect(normalizePhone("99957-5898")).toBeNull();
    expect(normalizePhone("71 9995")).toBeNull();
    expect(normalizePhone("719995758980000")).toBeNull();
    expect(normalizePhone("(71) 89957-5898")).toBeNull();
    expect(normalizePhone("(01) 99957-5898")).toBeNull();
    expect(normalizePhone("")).toBeNull();
  });

  it("máscara de digitação", () => {
    expect(formatPhone("")).toBe("");
    expect(formatPhone("7")).toBe("(7");
    expect(formatPhone("719")).toBe("(71) 9");
    expect(formatPhone("71999575")).toBe("(71) 9995-75");
    expect(formatPhone("71999575898")).toBe("(71) 99957-5898");
    expect(formatPhone("1134567890")).toBe("(11) 3456-7890");
    expect(formatPhone("+5571999575898")).toBe("(71) 99957-5898");
  });
});
