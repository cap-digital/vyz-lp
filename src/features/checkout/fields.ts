// Regras dos dados do checkout, sem zod: a tela confere enquanto a pessoa
// preenche e o servidor (schema.ts) aplica as mesmas regras com zod. A senha
// segue as regras do acesso (src/features/auth/password-rules.ts).

import { passwordProblem } from "@/features/auth/password-rules";
import { normalizePhone } from "./phone";
import { isValidTaxId, normalizeTaxId } from "./tax-id";

export type CheckoutValues = {
  fullName: string;
  email: string;
  password: string;
  company: string;
  phone: string;
  taxId: string;
  acceptTerms: boolean;
  marketing: boolean;
};

export type CheckoutField = keyof CheckoutValues;

export const CHECKOUT_MESSAGES = {
  fullName: "Informe seu nome completo.",
  fullNameLong: "Use até 120 caracteres no nome.",
  email: "Digite um e-mail válido.",
  company: "Informe o nome da empresa ou da agência.",
  companyLong: "Use até 80 caracteres no nome da empresa.",
  phone: "Informe o WhatsApp com DDD.",
  taxId: "CPF ou CNPJ inválido. Confira o que foi digitado.",
  terms: "Aceite os Termos de Uso e a Política de Privacidade para continuar.",
  emailExists: "Já existe uma conta com este e-mail. Entre para continuar.",
} as const;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Primeiro problema de cada campo. `newAccount` = sem sessão: pede e-mail e
 * senha (quem já entrou assina com a conta aberta).
 */
export function checkDetails(v: CheckoutValues, { newAccount }: { newAccount: boolean }): Partial<Record<CheckoutField, string>> {
  const errors: Partial<Record<CheckoutField, string>> = {};
  const name = v.fullName.trim();
  if (name.length < 2) errors.fullName = CHECKOUT_MESSAGES.fullName;
  else if (name.length > 120) errors.fullName = CHECKOUT_MESSAGES.fullNameLong;

  if (newAccount) {
    const email = v.email.trim();
    if (!EMAIL.test(email) || email.length > 254) errors.email = CHECKOUT_MESSAGES.email;
    const password = passwordProblem(v.password);
    if (password) errors.password = password;
  }

  const company = v.company.trim();
  if (!company) errors.company = CHECKOUT_MESSAGES.company;
  else if (company.length > 80) errors.company = CHECKOUT_MESSAGES.companyLong;

  if (!normalizePhone(v.phone)) errors.phone = CHECKOUT_MESSAGES.phone;
  if (normalizeTaxId(v.taxId) && !isValidTaxId(v.taxId)) errors.taxId = CHECKOUT_MESSAGES.taxId;
  if (!v.acceptTerms) errors.acceptTerms = CHECKOUT_MESSAGES.terms;
  return errors;
}
