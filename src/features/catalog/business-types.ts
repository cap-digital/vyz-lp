// Tipos de negócio do onboarding (passo 1). Fonte do catálogo no banco
// (npm run db:catalog). available = false aparece como "em breve".

import type { Profile } from "@/features/metrics/definitions";

export type BusinessTypeId = "ecommerce" | "leads" | "imobiliario" | "local" | "infoproduto" | "saude" | "educacao" | "agencia";

export type BusinessType = {
  id: BusinessTypeId;
  name: string;
  description: string;
  /** Perfil de métricas (vocabulário de conversão, metas). */
  profile: Profile;
  /** Ícone do lucide-react. */
  icon: "ShoppingBag" | "Target" | "Building2" | "Store" | "Rocket" | "Stethoscope" | "GraduationCap" | "Briefcase";
  available: boolean;
};

export const BUSINESS_TYPES: BusinessType[] = [
  { id: "ecommerce", name: "E-commerce", description: "Loja virtual: vendas, receita e ROAS.", profile: "ecommerce", icon: "ShoppingBag", available: true },
  { id: "leads", name: "Geração de leads", description: "Formulários e cadastros: custo por lead e qualificação.", profile: "leads", icon: "Target", available: false },
  { id: "imobiliario", name: "Imobiliário", description: "Empreendimentos: lead qualificado, visita e proposta.", profile: "imob", icon: "Building2", available: false },
  { id: "local", name: "Negócio local", description: "Conversas no WhatsApp e ligações.", profile: "local", icon: "Store", available: false },
  { id: "infoproduto", name: "Infoproduto", description: "Lançamentos e perpétuo: do lead à venda.", profile: "infoproduto", icon: "Rocket", available: false },
  { id: "saude", name: "Clínicas e saúde", description: "Agendamentos e consultas.", profile: "saude", icon: "Stethoscope", available: false },
  { id: "educacao", name: "Educação", description: "Matrículas e custo por aluno.", profile: "educacao", icon: "GraduationCap", available: false },
  { id: "agencia", name: "Agência", description: "Vários clientes no mesmo painel.", profile: "agencia", icon: "Briefcase", available: false },
];

export function businessType(id: string | null | undefined): BusinessType | undefined {
  return BUSINESS_TYPES.find((b) => b.id === id);
}
