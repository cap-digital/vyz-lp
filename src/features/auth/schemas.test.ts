import { describe, expect, it } from "vitest";
import { fieldErrors, formText, queryValue } from "./form";
import { PASSWORD_MESSAGES } from "./password";
import { changePasswordSchema, emailSchema, FIELD_MESSAGES, newPasswordSchema, resetRequestSchema, signInSchema } from "./schemas";

const errorsOf = (r: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) => (r.success ? {} : fieldErrors(r.error!.issues));

describe("e-mail", () => {
  it("normaliza: sem espaços e em minúsculas", () => {
    expect(emailSchema.parse("  Ana.Souza@Loja.COM.br ")).toBe("ana.souza@loja.com.br");
  });

  it("vazio, inválido ou ausente viram mensagem do campo", () => {
    expect(errorsOf(resetRequestSchema.safeParse({ email: "" }))).toEqual({ email: FIELD_MESSAGES.emailRequired });
    expect(errorsOf(resetRequestSchema.safeParse({ email: "   " }))).toEqual({ email: FIELD_MESSAGES.emailRequired });
    expect(errorsOf(resetRequestSchema.safeParse({ email: "ana@" }))).toEqual({ email: FIELD_MESSAGES.emailInvalid });
    expect(errorsOf(resetRequestSchema.safeParse({}))).toEqual({ email: FIELD_MESSAGES.emailRequired });
    expect(errorsOf(resetRequestSchema.safeParse({ email: `${"a".repeat(250)}@x.com` }))).toEqual({ email: FIELD_MESSAGES.emailInvalid });
  });
});

describe("login", () => {
  it("só exige que a senha exista (contas antigas podem ter outra regra)", () => {
    expect(signInSchema.safeParse({ email: "a@b.co", password: "x" }).success).toBe(true);
    expect(errorsOf(signInSchema.safeParse({ email: "", password: "" }))).toEqual({
      email: FIELD_MESSAGES.emailRequired,
      password: FIELD_MESSAGES.passwordRequired,
    });
  });
});

describe("nova senha", () => {
  it("aplica as regras e confere a confirmação", () => {
    expect(newPasswordSchema.safeParse({ password: "nova12345", confirm: "nova12345" }).success).toBe(true);
    expect(errorsOf(newPasswordSchema.safeParse({ password: "curta1", confirm: "curta1" }))).toEqual({ password: PASSWORD_MESSAGES.min });
    expect(errorsOf(newPasswordSchema.safeParse({ password: "nova12345", confirm: "nova1234" }))).toEqual({ confirm: PASSWORD_MESSAGES.mismatch });
    expect(errorsOf(newPasswordSchema.safeParse({ password: "nova12345", confirm: "" }))).toEqual({ confirm: FIELD_MESSAGES.confirmRequired });
  });

  it("troca: pede a atual, não aceita repetir a mesma e confere a confirmação", () => {
    const ok = { current: "Teste12345", password: "Outra12345", confirm: "Outra12345" };
    expect(changePasswordSchema.safeParse(ok).success).toBe(true);
    expect(errorsOf(changePasswordSchema.safeParse({ ...ok, current: "" }))).toEqual({ current: FIELD_MESSAGES.currentRequired });
    expect(errorsOf(changePasswordSchema.safeParse({ ...ok, password: "Teste12345", confirm: "Teste12345" }))).toEqual({ password: PASSWORD_MESSAGES.same });
    expect(errorsOf(changePasswordSchema.safeParse({ ...ok, confirm: "Outra1234" }))).toEqual({ confirm: PASSWORD_MESSAGES.mismatch });
  });
});

describe("formulário", () => {
  it("lê texto do FormData e ignora arquivo", () => {
    const fd = new FormData();
    fd.set("email", "a@b.co");
    fd.set("arquivo", new Blob(["x"]), "x.txt");
    expect(formText(fd, "email")).toBe("a@b.co");
    expect(formText(fd, "arquivo")).toBe("");
    expect(formText(fd, "falta")).toBe("");
  });

  it("fica com a primeira mensagem de cada campo", () => {
    expect(
      fieldErrors([
        { path: ["password"], message: "a" },
        { path: ["password"], message: "b" },
        { path: [], message: "geral" },
      ]),
    ).toEqual({ password: "a", form: "geral" });
  });

  it("parâmetro repetido na URL vale o primeiro", () => {
    expect(queryValue(["/painel", "//evil.com"])).toBe("/painel");
    expect(queryValue(undefined)).toBeUndefined();
  });
});
