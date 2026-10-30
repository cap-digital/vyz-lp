import { describe, expect, it } from "vitest";
import { PASSWORD_HINT, PASSWORD_MESSAGES, passwordChecklist, passwordProblem, passwordSchema } from "./password";

const firstError = (value: unknown) => {
  const r = passwordSchema.safeParse(value);
  return r.success ? null : r.error.issues[0]?.message;
};

describe("senha", () => {
  it("aceita de 8 a 72 caracteres com letra e número", () => {
    expect(passwordSchema.safeParse("Teste12345").success).toBe(true);
    expect(passwordSchema.safeParse("a1234567").success).toBe(true);
    expect(passwordSchema.safeParse("ação2026").success).toBe(true);
    expect(passwordSchema.safeParse(`a${"1".repeat(71)}`).success).toBe(true);
  });

  it("mostra o primeiro problema, na ordem: vazia, curta, letra, número, longa", () => {
    expect(firstError("")).toBe(PASSWORD_MESSAGES.required);
    expect(firstError(undefined)).toBe(PASSWORD_MESSAGES.required);
    expect(firstError(12345678)).toBe(PASSWORD_MESSAGES.required);
    expect(firstError("abc1")).toBe(PASSWORD_MESSAGES.min);
    expect(firstError("12345678")).toBe(PASSWORD_MESSAGES.letter);
    expect(firstError("abcdefgh")).toBe(PASSWORD_MESSAGES.number);
    expect(firstError(`a${"1".repeat(72)}`)).toBe(PASSWORD_MESSAGES.max);
  });

  it("o teto conta bytes, como o bcrypt do Supabase", () => {
    // 36 letras com acento = 72 bytes; uma a mais passa do limite
    expect(firstError(`${"é".repeat(35)}1`)).toBeNull();
    expect(firstError(`${"é".repeat(36)}1`)).toBe(PASSWORD_MESSAGES.max);
  });

  it("schema e função pura dizem a mesma coisa", () => {
    for (const v of ["", "abc", "abcdefgh", "12345678", "senha123", `a${"1".repeat(80)}`, "ÁÉÍÓÚ1234"]) {
      expect(passwordProblem(v)).toBe(firstError(v));
    }
  });

  it("lista ao vivo: três itens, sem o teto", () => {
    expect(passwordChecklist("")).toEqual([
      { id: "min", label: "8 caracteres ou mais", ok: false },
      { id: "letter", label: "Uma letra", ok: false },
      { id: "number", label: "Um número", ok: false },
    ]);
    expect(passwordChecklist("abc12345").every((i) => i.ok)).toBe(true);
    expect(PASSWORD_HINT).toContain("8 a 72");
  });
});
