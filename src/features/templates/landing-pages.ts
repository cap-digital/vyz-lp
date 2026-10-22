// Os 10 templates de landing page: textos padrão, seções disponíveis e campos.

export type LandingSection = "beneficios" | "prova" | "oferta" | "agenda" | "local" | "galeria" | "contagem" | "faq" | "whatsapp";

export const SECTION_LABEL: Record<LandingSection, string> = {
  beneficios: "Benefícios",
  prova: "Prova social",
  oferta: "Oferta",
  agenda: "Programação",
  local: "Endereço e horário",
  galeria: "Galeria",
  contagem: "Contagem regressiva",
  faq: "Perguntas frequentes",
  whatsapp: "Botão de WhatsApp",
};

export type LandingContent = {
  brand: string;
  /** dataURL (upload em memória). */
  logo?: string;
  color: string;
  headline: string;
  sub: string;
  cta: string;
  sections: Partial<Record<LandingSection, boolean>>;
  fields: string[];
  whatsapp: string;
};

export type LandingTemplate = {
  id: string;
  name: string;
  tier: "base" | "pro" | "avancado";
  category: string;
  description: string;
  /** "form": formulário no topo; "cta": botão para o WhatsApp no topo. */
  hero: "form" | "cta";
  defaults: Omit<LandingContent, "brand" | "logo" | "whatsapp">;
  /** Textos fixos das seções (amostra). */
  copy: {
    benefits: [string, string][];
    stats?: [string, string][];
    quote?: [string, string];
    offer?: { title: string; price: string; note: string };
    agenda?: [string, string][];
    address?: [string, string];
    faq: [string, string][];
    countdown?: string;
  };
};

const COMMON_FAQ: [string, string][] = [
  ["Como funciona o atendimento?", "Você preenche o formulário e a equipe responde no mesmo dia útil."],
  ["Posso falar pelo WhatsApp?", "Pode. O botão no fim da página abre a conversa direto com a equipe."],
  ["Meus dados ficam seguros?", "Usamos seus dados só para responder ao seu contato."],
];

export const LANDING_TEMPLATES: LandingTemplate[] = [
  // ---- Base (3)
  {
    id: "captura-leads",
    name: "Captura de leads",
    tier: "base",
    category: "Leads",
    description: "Formulário no topo, benefícios e prova social. Para campanhas de cadastro.",
    hero: "form",
    defaults: {
      color: "#4B5320",
      headline: "Fale com um especialista ainda hoje.",
      sub: "Deixe seu contato e receba uma proposta sob medida em até 24 horas.",
      cta: "Quero ser contatado",
      sections: { beneficios: true, prova: true, faq: true, whatsapp: true },
      fields: ["Nome", "E-mail", "WhatsApp"],
    },
    copy: {
      benefits: [
        ["Resposta rápida", "Retorno no mesmo dia útil."],
        ["Proposta sob medida", "Pensada para o seu caso."],
        ["Sem compromisso", "Você decide depois de conversar."],
      ],
      stats: [
        ["+1.200", "clientes atendidos"],
        ["4,8", "nota média"],
        ["24 h", "para a proposta"],
      ],
      quote: ["A proposta chegou no mesmo dia e era exatamente o que eu precisava.", "Marina, cliente"],
      faq: COMMON_FAQ,
    },
  },
  {
    id: "produto-oferta",
    name: "Produto ou oferta",
    tier: "base",
    category: "E-commerce",
    description: "Oferta em destaque, benefícios e chamada para comprar.",
    hero: "form",
    defaults: {
      color: "#4B5320",
      headline: "A coleção nova chegou. Entrega em 48 h.",
      sub: "Escolha, pague no Pix e receba em casa. Troca fácil em até 30 dias.",
      cta: "Quero 10% na primeira compra",
      sections: { oferta: true, beneficios: true, prova: true, faq: false, whatsapp: true },
      fields: ["Nome", "E-mail", "WhatsApp"],
    },
    copy: {
      benefits: [
        ["Entrega em 48 h", "Para capitais e regiões metropolitanas."],
        ["Troca fácil", "Até 30 dias para trocar."],
        ["Pix com desconto", "5% a menos no Pix."],
      ],
      stats: [
        ["+8 mil", "pedidos entregues"],
        ["4,9", "avaliação média"],
        ["48 h", "prazo de entrega"],
      ],
      quote: ["Chegou antes do prazo e o tecido é ótimo.", "Rafael, cliente"],
      offer: { title: "Kit coleção nova", price: "R$ 189,90", note: "ou R$ 180,40 no Pix" },
      faq: COMMON_FAQ,
    },
  },
  {
    id: "whatsapp",
    name: "Atendimento no WhatsApp",
    tier: "base",
    category: "Negócio local",
    description: "Um botão grande para a conversa, benefícios e endereço.",
    hero: "cta",
    defaults: {
      color: "#4B5320",
      headline: "Tire suas dúvidas agora pelo WhatsApp.",
      sub: "Atendimento de segunda a sábado, das 8h às 20h. Resposta em minutos.",
      cta: "Chamar no WhatsApp",
      sections: { beneficios: true, local: true, faq: true, whatsapp: true },
      fields: ["Nome", "WhatsApp"],
    },
    copy: {
      benefits: [
        ["Resposta em minutos", "Atendimento de gente, não de robô."],
        ["Orçamento na hora", "Mande foto e receba o valor."],
        ["Perto de você", "Atendemos a região toda."],
      ],
      address: ["Rua das Palmeiras, 120 · Centro", "Seg a sáb, 8h às 20h"],
      faq: COMMON_FAQ,
    },
  },
  // ---- Pro (+3)
  {
    id: "empreendimento",
    name: "Empreendimento imobiliário",
    tier: "pro",
    category: "Imobiliário",
    description: "Galeria, diferenciais do empreendimento e agendamento de visita.",
    hero: "form",
    defaults: {
      color: "#4B5320",
      headline: "2 e 3 quartos a 5 minutos do metrô.",
      sub: "Agende uma visita ao decorado com um corretor e conheça as condições de lançamento.",
      cta: "Agendar visita",
      sections: { galeria: true, beneficios: true, local: true, faq: true, whatsapp: true },
      fields: ["Nome", "WhatsApp", "Quantos quartos?"],
    },
    copy: {
      benefits: [
        ["Varanda gourmet", "Em todas as unidades."],
        ["Lazer completo", "Piscina, academia e coworking."],
        ["Entrega em 2027", "Obras no prazo."],
      ],
      address: ["Av. Central, 900 · Bairro Novo", "Decorado aberto todos os dias, 9h às 18h"],
      faq: [
        ["Tem financiamento?", "Sim, com os principais bancos. O corretor simula com você."],
        ["Aceita permuta?", "Avaliamos caso a caso."],
        ["Quando é a entrega?", "Previsão para dezembro de 2027."],
      ],
    },
  },
  {
    id: "evento",
    name: "Evento ou webinar",
    tier: "pro",
    category: "Leads",
    description: "Data em destaque, programação e inscrição.",
    hero: "form",
    defaults: {
      color: "#4B5320",
      headline: "Webinar: tráfego que vende, ao vivo, quinta às 20h.",
      sub: "Uma hora de aula prática com casos reais e perguntas ao vivo. Vagas limitadas.",
      cta: "Garantir minha vaga",
      sections: { contagem: true, agenda: true, prova: true, faq: true },
      fields: ["Nome", "E-mail", "WhatsApp"],
    },
    copy: {
      benefits: [
        ["Aula prática", "Casos reais, sem enrolação."],
        ["Perguntas ao vivo", "Tire suas dúvidas na hora."],
        ["Material de apoio", "Slides depois da aula."],
      ],
      agenda: [
        ["20h00", "Abertura e casos"],
        ["20h20", "Estrutura de campanha"],
        ["20h40", "Perguntas ao vivo"],
      ],
      stats: [
        ["+3 mil", "inscritos nas edições"],
        ["4,9", "nota dos participantes"],
        ["60 min", "de conteúdo"],
      ],
      quote: ["Saí com um plano pronto para a semana.", "Júlia, gestora de tráfego"],
      countdown: "02 dias · 14 h · 36 min",
      faq: COMMON_FAQ,
    },
  },
  {
    id: "servico-local",
    name: "Serviço local",
    tier: "pro",
    category: "Negócio local",
    description: "Serviço, área de atendimento e orçamento rápido.",
    hero: "form",
    defaults: {
      color: "#4B5320",
      headline: "Instalação de ar-condicionado no mesmo dia.",
      sub: "Técnicos certificados, garantia de 1 ano e orçamento pelo WhatsApp em minutos.",
      cta: "Pedir orçamento",
      sections: { beneficios: true, prova: true, local: true, whatsapp: true },
      fields: ["Nome", "WhatsApp", "Bairro"],
    },
    copy: {
      benefits: [
        ["No mesmo dia", "Para pedidos até as 12h."],
        ["Garantia de 1 ano", "Em peças e serviço."],
        ["Preço fechado", "Sem surpresa na hora."],
      ],
      stats: [
        ["+2 mil", "instalações"],
        ["4,8", "no Google"],
        ["1 ano", "de garantia"],
      ],
      quote: ["Chegaram no horário e deixaram tudo limpo.", "Carlos, cliente"],
      address: ["Atendemos a cidade toda", "Seg a sáb, 7h às 19h"],
      faq: COMMON_FAQ,
    },
  },
  // ---- Avançado (+4)
  {
    id: "lancamento",
    name: "Lançamento",
    tier: "avancado",
    category: "Infoproduto",
    description: "Contagem regressiva, oferta de lançamento e prova social.",
    hero: "form",
    defaults: {
      color: "#4B5320",
      headline: "As inscrições abrem segunda. Entre na lista de espera.",
      sub: "Quem está na lista recebe o acesso antes e a condição de lançamento.",
      cta: "Entrar na lista",
      sections: { contagem: true, oferta: true, prova: true, faq: true },
      fields: ["Nome", "E-mail", "WhatsApp"],
    },
    copy: {
      benefits: [
        ["Acesso antecipado", "Antes da abertura geral."],
        ["Condição de lançamento", "Só para a lista."],
        ["Comunidade", "Grupo exclusivo de alunos."],
      ],
      stats: [
        ["+5 mil", "alunos"],
        ["4,9", "satisfação"],
        ["12", "módulos"],
      ],
      quote: ["O curso mudou o jeito que eu trabalho.", "Ana, aluna"],
      offer: { title: "Condição de lançamento", price: "R$ 997", note: "ou em parcelas no cartão" },
      countdown: "04 dias · 09 h · 12 min",
      faq: COMMON_FAQ,
    },
  },
  {
    id: "clinica",
    name: "Clínica",
    tier: "avancado",
    category: "Saúde",
    description: "Especialidades, equipe, convênios e agendamento.",
    hero: "form",
    defaults: {
      color: "#4B5320",
      headline: "Agende sua consulta com quem entende do assunto.",
      sub: "Atendimento humanizado, convênios e particular. Horários de segunda a sábado.",
      cta: "Agendar consulta",
      sections: { beneficios: true, prova: true, local: true, faq: true, whatsapp: true },
      fields: ["Nome", "WhatsApp", "Especialidade"],
    },
    copy: {
      benefits: [
        ["Especialistas", "Equipe com registro e experiência."],
        ["Convênios", "Aceitamos os principais planos."],
        ["Horários flexíveis", "Inclusive aos sábados."],
      ],
      stats: [
        ["+15 mil", "pacientes"],
        ["4,9", "no Google"],
        ["12", "especialidades"],
      ],
      quote: ["Fui muito bem atendida do começo ao fim.", "Patrícia, paciente"],
      address: ["Rua da Saúde, 45 · Sala 302", "Seg a sex, 7h às 20h · sáb, 8h às 13h"],
      faq: COMMON_FAQ,
    },
  },
  {
    id: "educacao",
    name: "Educação · Matrícula",
    tier: "avancado",
    category: "Educação",
    description: "Cursos, diferenciais, visita e matrícula.",
    hero: "form",
    defaults: {
      color: "#4B5320",
      headline: "Matrículas abertas para 2027.",
      sub: "Agende uma visita, conheça a estrutura e garanta a vaga com condição especial.",
      cta: "Agendar visita",
      sections: { beneficios: true, galeria: true, prova: true, faq: true, whatsapp: true },
      fields: ["Nome do responsável", "WhatsApp", "Série do aluno"],
    },
    copy: {
      benefits: [
        ["Turmas reduzidas", "Atenção individual."],
        ["Período integral", "Com atividades extras."],
        ["Bilíngue", "Inglês todos os dias."],
      ],
      stats: [
        ["30 anos", "de história"],
        ["98%", "de aprovação"],
        ["20", "alunos por turma"],
      ],
      quote: ["Meu filho adora ir para a escola.", "Renata, mãe de aluno"],
      faq: COMMON_FAQ,
    },
  },
  {
    id: "sazonal",
    name: "Promoção sazonal",
    tier: "avancado",
    category: "E-commerce",
    description: "Contagem regressiva, oferta e chamada urgente.",
    hero: "cta",
    defaults: {
      color: "#4B5320",
      headline: "Semana do consumidor: até 40% off em toda a loja.",
      sub: "Só até domingo ou enquanto durar o estoque.",
      cta: "Ver as ofertas",
      sections: { contagem: true, oferta: true, beneficios: true, whatsapp: true },
      fields: ["Nome", "E-mail"],
    },
    copy: {
      benefits: [
        ["Até 40% off", "Em toda a loja."],
        ["Entrega rápida", "Em até 48 h."],
        ["Troca fácil", "Até 30 dias."],
      ],
      offer: { title: "Combo da semana", price: "R$ 129,90", note: "de R$ 199,90" },
      countdown: "01 dia · 22 h · 05 min",
      faq: COMMON_FAQ,
    },
  },
];

export function landingTemplate(id: string): LandingTemplate | undefined {
  return LANDING_TEMPLATES.find((t) => t.id === id);
}

/** Conteúdo inicial a partir do template. */
export function landingDefaults(t: LandingTemplate, brand = "Sua marca"): LandingContent {
  return { ...t.defaults, sections: { ...t.defaults.sections }, fields: [...t.defaults.fields], brand, whatsapp: "" };
}

export const LANDING_SECTIONS: LandingSection[] = ["beneficios", "prova", "oferta", "agenda", "local", "galeria", "contagem", "faq", "whatsapp"];
