# VYZ · Arquitetura (fase 1: só front-end)

Um repositório Next.js 16 (App Router, `src/`, Tailwind v4, Cache Components) com três áreas isoladas: a landing page de vendas, o painel (SaaS) e as páginas públicas. Nesta fase não existe backend: tudo que depende de servidor funciona localmente, no navegador, e aparece marcado com um aviso discreto (`<PendingChip>`). A lista do que falta está em `docs/PENDENCIAS.md`.

## Princípios

1. **Áreas isoladas.** A LP e o painel não compartilham layout, estado nem motion. O motion pesado (Lenis, intro, tilt, cursor magnético, revelações) só existe em `(marketing)`. O ESLint (`no-restricted-imports`) impede que outra área importe `features/marketing` ou `components/motion`.
2. **Uma fonte de verdade por assunto.**
   - `features/pricing`: preços (em centavos) **e** limites por plano (`entitlements.ts`). A LP e o painel chamam as mesmas funções.
   - `features/templates`: cadastro dos 20 templates de dashboard, da biblioteca de páginas e dos 10 templates de LP.
   - `features/metrics`: definições de métrica (rótulo, formato, se "maior é melhor") e as regras de cálculo (venda deduplicada, CTR ponderado, dias em maturação), mais a `DataSource`.
   - `components/charts`: gráficos em SVG feitos à mão, sem biblioteca.
3. **O mock é o produto.** O gerador do hero, o passo 2 de "Como funciona", a galeria, o painel e o link público renderizam os mesmos widgets (`features/dashboards/widgets`). Só muda a fonte de dados.
4. **Persistência atrás de uma interface.** `lib/store` define `Store`. Hoje existe só `LocalStore` (localStorage, prefixo `vyz:v1:`, tudo em try/catch); depois entra um `SupabaseStore` com a mesma interface. Nenhum componente acessa `localStorage` direto (a única exceção é a preferência de tema, em `components/ui/ThemeToggle`, e a sessão da intro e o estado da sidebar do painel, que são do navegador e não do produto).
5. **Dados de anúncio vêm de uma `DataSource`.** Hoje `MockSource` (determinística, com seed por dashboard); depois `DbSource`, alimentada pelas conexões OAuth.

## Rotas

```
src/app/
  layout.tsx                          raiz mínima: Inter, tokens, script de tema
  (marketing)/layout.tsx + page.tsx   LP em /, com Lenis, intro e motion
  (auth)/entrar/page.tsx              entrar (pág. 17 do brand book); sem backend, só avisa
  (painel)/painel/layout.tsx          app shell: sidebar em aba (recolhível com "["), conteúdo num painel
    page.tsx                          Início
    dashboards/page.tsx               meus dashboards
    dashboards/novo/page.tsx          galeria + fluxo guiado (5 passos)
    dashboards/[id]/page.tsx          visualização
    landing-pages/page.tsx
    landing-pages/novo/page.tsx       galeria + fluxo guiado (4 passos)
    landing-pages/[id]/page.tsx       editor com preview
    contas/page.tsx
    compartilhar/page.tsx
    plano/page.tsx
    configuracoes/page.tsx
  (publico)/r/[id]/page.tsx           dashboard compartilhado, só leitura
  (publico)/p/[id]/page.tsx           LP publicada (preview)
```

As rotas com `[id]` não têm `generateStaticParams` (os ids nascem no navegador). Com Cache Components, o acesso a `params` fica dentro de `<Suspense>` e o conteúdo é um componente cliente que lê o `Store`. O resto do painel é pré-renderizado como casca estática.

## Pastas

```
src/
  components/
    brand/      Wordmark, Icon, geometria do logo
    ui/         botões, Segmented, Stepper, Toast, ThemeToggle, Odometer, PendingChip, Modal, campos e
                controles próprios (nada nativo): Select, Menu, Tooltip (Radix), Checkbox/Radio/Switch,
                NumberStepper, PeriodPicker, FileInput, ColorField. Dentro de Modal, os popovers montam
                no próprio <dialog> (portal.ts)
    charts/     LineChart, Funnel, Scatter, BarList, Bars, ProgressBar
    motion/     só para (marketing): CutReveal, Reveal, Magnetic, SmoothScroll, ScrollProgress, SectionWipe, MotionRoot
  features/
    pricing/        pricing.ts (preços), entitlements.ts (limites)
    metrics/        definitions.ts, compute.ts, source.ts (DataSource + MockSource)
    templates/      dashboards.ts (20), pages.ts (biblioteca de páginas), landing-pages.ts (10)
    dashboards/     widgets/, DashboardView, fluxo "Novo dashboard", miniaturas
    landing-pages/  LandingRenderer, fluxo e editor
    accounts/       plataformas, validação de IDs, tela de contas
    share/          codificação do link (base64url + deflate), PDF, relatórios
    workspace/      plano simulado, marca própria, app shell
    marketing/      seções da LP, gerador do hero, intro
  lib/
    store/      Store, LocalStore, hooks (useCollection, useDoc)
    format.ts   moeda e números pt-BR
    whatsapp.ts links e mensagens
    ids.ts      geração de ids
```

## Limites por plano (`features/pricing/entitlements.ts`)

| | Base | Pro | Avançado | Personalizado |
|---|---|---|---|---|
| Templates de dashboard | 5 | 10 | 20 | 20 + sob medida |
| Templates de LP | 3 | 6 | 10 | 10 |
| Plataformas | Meta, Google Ads, GA4 | todas | todas | todas |
| Páginas do dashboard | essenciais | + Pro | todas | todas |
| Marca própria (white-label) | não | não | não | sim |
| Análise por áudio | não | não | em breve | em breve |

Os limites de quantidade (dashboards e LPs criadas) e as contas contratadas também vivem nesse arquivo. As contas contratadas vêm do plano simulado (padrão: 2, como na LP).

## Dados e métricas

- **Venda confirmada (deduplicada):** o topo usa a venda confirmada no GA4 (ou no CRM). O que Meta e Google atribuem aparece ao lado, e a soma das plataformas passa das confirmadas.
- **CTR do período:** cliques ÷ impressões somados no período inteiro, nunca média de médias.
- **Dias em maturação:** os últimos 3 dias do período ficam marcados nas séries diárias.
- **ROAS de equilíbrio:** 1 ÷ margem, configurada no dashboard.
- `MockSource.load(spec)` gera um `Dataset` completo (dias, campanhas, criativos, funis, públicos, empreendimentos, produtos, etapas do CRM, pacing) a partir de uma seed (`hash(dashboard + cliente + template)`), do perfil do template e do período. O mesmo input gera sempre os mesmos números.

## Compartilhamento sem backend

- **Link:** `/r/[id]#<payload>`. O payload é a configuração do dashboard em JSON compacto, comprimida com `CompressionStream("deflate-raw")` e codificada em base64url. Vai no fragmento (`#`), que não sai do navegador. A página pública decodifica, confere a expiração e renderiza com `MockSource`, só leitura, com a marca do cliente no Personalizado.
- **PDF:** folha de impressão (`@media print`) + `window.print()`. A4 paisagem, capa, uma página do dashboard por folha e cores forçadas para o modo claro.
- **Relatórios agendados:** salvos no `Store`. O envio depende de backend.

## Motion

- LP: como na fase anterior (corte, odômetro, Lenis, intro).
- Painel: só transições de 150 a 250 ms e a varredura do scanner (CSS) ao gerar um dashboard. Sem Lenis, intro, tilt ou cursor magnético.
- `prefers-reduced-motion` desliga tudo nos dois lados.
