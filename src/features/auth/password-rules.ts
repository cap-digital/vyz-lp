// Regras de senha sem dependências: a lista que a tela mostra enquanto a
// pessoa digita e a base do passwordSchema (password.ts), que valida no
// servidor. O teto de 72 vem do bcrypt do Supabase Auth, que conta bytes
// (letra com acento conta dois).

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72;

export const PASSWORD_MESSAGES = {
  required: "Digite uma senha.",
  min: `Use pelo menos ${PASSWORD_MIN} caracteres.`,
  max: `Use no máximo ${PASSWORD_MAX} caracteres.`,
  letter: "Inclua pelo menos uma letra.",
  number: "Inclua pelo menos um número.",
  mismatch: "As senhas não são iguais.",
  same: "A nova senha precisa ser diferente da atual.",
  weak: `Senha fraca. Use de ${PASSWORD_MIN} a ${PASSWORD_MAX} caracteres, com letras e números.`,
  pwned: "Essa senha aparece em vazamentos conhecidos. Escolha outra.",
} as const;

/** Ajuda curta para o campo de senha. */
export const PASSWORD_HINT = `De ${PASSWORD_MIN} a ${PASSWORD_MAX} caracteres, com letras e números.`;

const LETTER = /[A-Za-zÀ-ÖØ-öø-ÿ]/;
const DIGIT = /[0-9]/;
const byteLength = (value: string) => new TextEncoder().encode(value).length;

export type PasswordRuleId = "min" | "letter" | "number" | "max";

type PasswordRule = {
  id: PasswordRuleId;
  /** Item da lista "a senha precisa ter" (sem rótulo: só aparece como erro). */
  label?: string;
  message: string;
  test: (value: string) => boolean;
};

/** Na ordem em que os erros aparecem. */
export const PASSWORD_RULES: readonly PasswordRule[] = [
  { id: "min", label: `${PASSWORD_MIN} caracteres ou mais`, message: PASSWORD_MESSAGES.min, test: (v) => v.length >= PASSWORD_MIN },
  { id: "letter", label: "Uma letra", message: PASSWORD_MESSAGES.letter, test: (v) => LETTER.test(v) },
  { id: "number", label: "Um número", message: PASSWORD_MESSAGES.number, test: (v) => DIGIT.test(v) },
  { id: "max", message: PASSWORD_MESSAGES.max, test: (v) => byteLength(v) <= PASSWORD_MAX },
];

/** Primeiro problema da senha, ou null quando ela vale. */
export function passwordProblem(value: string): string | null {
  if (!value) return PASSWORD_MESSAGES.required;
  return PASSWORD_RULES.find((rule) => !rule.test(value))?.message ?? null;
}

/** Lista para mostrar embaixo do campo, com o que já foi cumprido. */
export function passwordChecklist(value: string): { id: PasswordRuleId; label: string; ok: boolean }[] {
  return PASSWORD_RULES.flatMap((rule) => (rule.label ? [{ id: rule.id, label: rule.label, ok: rule.test(value) }] : []));
}
