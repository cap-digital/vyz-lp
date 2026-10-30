// Login simulado (INTEGRATIONS_MODE=mock): perfil fictício e as contas que ele
// "enxerga". Fixo e determinístico: o mesmo login devolve sempre as mesmas
// contas, e o gerador de dados (área sync) parte do id externo de cada uma.
// IDs no formato do cadastro manual (Meta: act_<dígitos>; Google: 123-456-7890).

import type { ProviderId } from "./providers";

export type MockProfile = { id: string; name: string; email: string };

export type MockAccount = {
  externalId: string;
  name: string;
  currency: string;
  timezone: string;
  /** Meta: Business Manager dono da conta. */
  business?: { id: string; name: string };
  /** Google Ads: conta de administrador (MCC) que dá acesso. */
  manager?: { id: string; name: string };
};

/** O que falta para a conexão real (texto do selo "Modo de teste"). */
export const MOCK_NOTICE: Record<ProviderId, string> = {
  meta: "Login e contas simulados. A conexão real com o Meta precisa do app aprovado (ads_read e business_management), da configuração do Login for Business e das credenciais no servidor.",
  google:
    "Login e contas simulados. A conexão real com o Google precisa do cliente OAuth com a tela de consentimento verificada para o Google Ads, do developer token e das credenciais no servidor.",
};

export const MOCK_PROFILES: Record<ProviderId, MockProfile> = {
  meta: { id: "mock-meta-1029384756", name: "Ana Gestora (perfil fictício)", email: "ana.gestora@exemplo.com.br" },
  google: { id: "mock-google-2093847561", name: "Ana Gestora (perfil fictício)", email: "ana.gestora@exemplo.com.br" },
};

const LOJA_BM = { id: "184736291045832", name: "Loja Exemplo" };
const MARCA_BM = { id: "297364810563927", name: "Marca Dois" };
const MCC = { id: "987-654-3210", name: "Agência Exemplo · MCC" };

export const MOCK_ACCOUNTS: Record<ProviderId, MockAccount[]> = {
  meta: [
    { externalId: "act_1029384756", name: "Loja Exemplo · Vendas", currency: "BRL", timezone: "America/Sao_Paulo", business: LOJA_BM },
    { externalId: "act_5647382910", name: "Loja Exemplo · Remarketing", currency: "BRL", timezone: "America/Sao_Paulo", business: LOJA_BM },
    { externalId: "act_8473629105", name: "Marca Dois · Brasil", currency: "BRL", timezone: "America/Sao_Paulo", business: MARCA_BM },
  ],
  google: [
    { externalId: "123-456-7890", name: "Loja Exemplo · Brasil", currency: "BRL", timezone: "America/Sao_Paulo", manager: MCC },
    { externalId: "234-567-8901", name: "Loja Exemplo · Shopping", currency: "BRL", timezone: "America/Sao_Paulo", manager: MCC },
  ],
};

export type MockAccountGroup = { id: string; name: string; accounts: MockAccount[] };

/** Contas agrupadas como o provedor mostra (BM no Meta, MCC no Google). */
export function mockAccountGroups(provider: ProviderId): MockAccountGroup[] {
  const groups = new Map<string, MockAccountGroup>();
  for (const a of MOCK_ACCOUNTS[provider]) {
    const owner = a.business ?? a.manager ?? { id: a.externalId, name: a.name };
    const group = groups.get(owner.id) ?? { id: owner.id, name: owner.name, accounts: [] };
    group.accounts.push(a);
    groups.set(owner.id, group);
  }
  return [...groups.values()];
}
