# Handoff: OmniFy CRM — Redesign completo

> **Para o Claude Code / dev:** este pacote contém **design references em HTML**. Os arquivos são um protótipo navegacional de alta fidelidade mostrando o look, feel e comportamento pretendidos — **não código de produção pra copiar direto**. Sua tarefa é **recriar esse visual no codebase existente do cliente** (qualquer que seja a stack — React, Next, Vue, etc.) usando os padrões e bibliotecas já estabelecidos por lá. Se o projeto ainda não tiver uma stack definida, escolha a mais adequada e implemente por lá.

---

## Overview

**OmniFy CRM** é um CRM com IA nativa. Este redesign substitui o visual atual (genérico, azul Bootstrap) por uma direção **ousada** inspirada em produtos modernos de IA/comercial: tipografia serif como display, paleta preto + bege quente + verde neon como acento, e bastante respiração.

**Fluxo navegacional completo**: login → dashboard → 13 telas internas conectadas (inbox, contatos + detalhe, empresas, pipeline + detalhe do deal, leads + detalhe, atividades, relatórios, SDR autônomo, ads, segmentos, settings com 8 sub-abas).

## About the Design Files

Os arquivos em `OmniFy CRM.html` + `src/*.jsx` são **protótipos HTML de referência**, não código pra ir direto pra produção. Eles usam React via Babel Standalone (carregado no browser), sem build step, sem TypeScript, sem bibliotecas de componente.

**Sua tarefa:** recriar esse visual dentro do codebase real usando o que já existe lá — design system, lib de componentes, roteador, state manager, etc. Use os arquivos aqui como **spec viva**: abra o HTML no navegador pra ver/interagir, leia os `.jsx` pra tirar tokens, medidas e estruturas.

## Fidelity

**High-fidelity.** Cores, tipografia, espaçamento, estados e interações são finais. A intenção é que o produto implementado seja **pixel-perfect** em relação aos mocks, adaptado aos componentes primitivos já existentes no codebase.

---

## Design Tokens

### Cores (tema claro — padrão)

| Token          | Hex        | Uso                                                     |
|----------------|------------|---------------------------------------------------------|
| `bg`           | `#F7F7F5`  | Background base da app (bege off-white, quente)         |
| `bgSubtle`     | `#EFEEEA`  | Background de seções mais quietas                       |
| `surface`      | `#FFFFFF`  | Cards, painéis, modais                                  |
| `surfaceAlt`   | `#FAFAF8`  | Surface secundária (headers de tabela)                  |
| `border`       | `#E6E4DF`  | Bordas padrão                                           |
| `borderStrong` | `#D3D0C9`  | Bordas com mais ênfase (inputs em repouso)              |
| `text`         | `#14110F`  | Texto primário                                          |
| `textMuted`    | `#6B6660`  | Texto secundário, labels                                |
| `textSubtle`   | `#97928B`  | Texto terciário, placeholders                           |
| `primary`      | `#2D5BFF`  | Azul (usado no tema conservador — pouco na direção final) |
| `primarySoft`  | `#E7ECFF`  | Fundo de pills azuis                                    |
| `success`      | `#16A34A`  | Verde positivo (métricas subindo)                       |
| `successSoft`  | `#DCFCE7`  | Fundo de pills verdes                                   |
| `warn`         | `#D97706`  | Amarelo/laranja alerta                                  |
| `warnSoft`     | `#FEF3C7`  | Fundo de pills amarelas                                 |
| `danger`       | `#DC2626`  | Vermelho                                                |
| `dangerSoft`   | `#FEE2E2`  | Fundo de pills vermelhas                                |
| **`bold`**     | **`#141414`** | **Preto carvão — usado em sidebar, botões primários, hero bands (direção ousada)** |
| **`boldInk`**  | **`#DCFF00`** | **Verde neon — acento sobre o preto, CTAs secundários, destaques de IA** |

### Cores (tema escuro)

| Token          | Hex        |
|----------------|------------|
| `bg`           | `#16161A`  |
| `bgSubtle`     | `#1D1D22`  |
| `surface`      | `#202026`  |
| `surfaceAlt`   | `#26262C`  |
| `border`       | `#2E2E35`  |
| `borderStrong` | `#3F3F48`  |
| `text`         | `#F4F3EF`  |
| `textMuted`    | `#A8A5A0`  |
| `textSubtle`   | `#6E6B66`  |
| `bold`         | `#0A0A0C`  (preto mais escuro que o bg, pra manter hierarquia) |
| `boldInk`      | `#DCFF00`  (inalterado) |

Valores exatos em `src/tokens.jsx`.

### Tipografia

| Família                | Uso                                                    |
|------------------------|--------------------------------------------------------|
| **Inter Tight**        | Sans padrão para UI, texto corrido, tabelas. Pesos 400/500/600/700. |
| **Instrument Serif**   | Display — headings grandes, números de métricas hero. Pesos 400 regular + 400 italic. Tracking negativo (-0.8 a -2). |
| **JetBrains Mono**     | Mono — códigos de API, valores técnicos, timestamps em log. |

Google Fonts URL (já no `<head>` do HTML):
```
https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap
```

**Regras de uso:**
- Headings de tela (h1): **Instrument Serif**, 30–64px, weight 400–500, letter-spacing -0.8 a -2
- Subtítulos, body, UI: **Inter Tight**
- Métricas hero grandes (MRR, totais): **Instrument Serif**, 40–64px
- KPIs de card: **Instrument Serif**, 28–36px
- Labels eyebrow (uppercase): **Inter Tight** 600/700, 10.5–11px, letter-spacing 1–2, `textTransform: uppercase`

### Espaçamento

Escala livre (não-tokenizada), baseada em 4px. Valores comuns vistos no código:
`4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 56, 64`.

### Border radius

| Uso                       | Valor |
|---------------------------|-------|
| Pills / tags              | 999px (full round) |
| Botões, inputs            | 8–10px |
| Cards padrão              | 12–14px |
| Painéis maiores, modais   | 16–18px |
| Avatares                  | 50% |

### Sombras

```
shadow   = 0 1px 2px rgba(20,17,15,0.04), 0 1px 1px rgba(20,17,15,0.03)
shadowLg = 0 8px 24px rgba(20,17,15,0.06), 0 2px 6px rgba(20,17,15,0.04)
```

Uso discreto — a linguagem confia mais em borders e contraste de fundo do que em elevação por sombra.

---

## Sistema de componentes (primitives)

Em `src/primitives.jsx` — use como guia, mas **implemente no codebase usando as primitivas já existentes lá** (Button, Input, etc).

| Componente        | Props relevantes                                    | Notas                                                 |
|-------------------|-----------------------------------------------------|-------------------------------------------------------|
| `Button`          | `variant: 'primary' \| 'bold' \| 'secondary' \| 'ghost'`, `size: 'sm' \| 'md'`, `bold: boolean`, `leading/trailing: ReactNode` | `bold` + `variant="bold"` → preto com texto neon. Usado pros CTAs principais. |
| `Pill`            | `color: 'primary' \| 'success' \| 'warn' \| 'danger' \| 'neutral' \| 'bold'` | Tag arredondada pra status |
| `Icon`            | `d` (SVG path), `size`, `style`                     | Set de ícones outline em `Icons` object (`src/primitives.jsx`) |
| `Avatar`          | `name`, `size`                                      | Iniciais em círculo, cor derivada do hash do nome     |
| `TextField`       | `value`, `onChange`, `placeholder`                  | Inputs com border `borderStrong`                      |
| `Field`           | `label`, `hint`, `children`                         | Wrapper com label uppercase pequeno + hint em textMuted |
| `SectionHeading`  | `title`, `sub`, `right`                             | Cabeçalho de seção padrão                             |
| `SidebarBold`     | `active`, `onNav`                                   | Sidebar preta, 220px, 14 itens + footer do usuário    |

---

## Telas

Todas seguem o mesmo shell: **SidebarBold** fixa à esquerda (220px) + área principal com header próprio + conteúdo scrollável. Header de cada tela tem: eyebrow label (uppercase), h1 serif, botões de ação à direita + toggle claro/escuro.

### 1. Login (`src/login.jsx` · `LoginScreen`)

- **Layout:** split-screen, grid `1.1fr 1fr`
- **Lado esquerdo (preto `#0A0A0C`):**
  - Logo OmniFy (quadrado neon 34×34 com "O" em serif + wordmark serif 22px)
  - Grid decorativo diagonal (linhas neon a 4% opacity, 56px)
  - Glow blob radial neon no canto sup. direito
  - Headline hero em Instrument Serif, 64px, linha "O comercial *roda sozinho*. Você decide." (com itálico + neon no "roda sozinho")
  - Parágrafo de subcopy em 15px, `rgba(244,243,239,0.55)`
  - 3 stats no rodapé: "R$ 847K" · "2.3×" · "14h" em serif 28px
- **Lado direito (bege `#F4F3EF`):**
  - Eyebrow "BEM-VINDA DE VOLTA"
  - h2 "Entre na sua *conta*" (Instrument Serif, 42px, itálico no "conta")
  - 2 SSO buttons (Google, Apple) lado a lado
  - Divider "ou com e-mail"
  - Campo e-mail
  - Campo senha **com botão Mostrar/Ocultar** à direita
  - Link "Esqueci a senha"
  - Checkbox "Manter conectado"
  - Botão "Entrar" preto com texto neon + seta neon. Estado loading (disabled, "Entrando…")
  - Footer: "Ainda não tem conta? Começar teste grátis"
  - Rodapé legal absoluto: © · Privacidade · Termos · Suporte

### 2. Dashboard (`src/dashboard.jsx` · `DashboardBold`)

- Hero band do topo (fundo `bg` bege) com saudação + métrica MRR gigante em serif
- 4 cards KPI (Deals abertos, Reuniões marcadas, Taxa conversão, Ticket médio)
- Widget "IA recomenda" — card preto com acento neon, lista 3 ações priorizadas
- Gráfico de atividade (linha, 30d)
- Lista de atividades recentes (timeline)

### 3. Inbox (`src/screens.jsx` · `InboxScreen`)

- Layout 3 colunas: lista de conversas (esq) · thread ativa (centro) · contexto do contato (dir)
- Filtros por canal (WhatsApp, email, chat), prioridade, não-lidas
- Cada conversa: avatar, nome, preview última msg, timestamp, pill do canal

### 4. Contatos (`src/contacts.jsx` · `ContactsBold`)

- Tabela densa: avatar · nome · empresa · cargo · email · última interação · score · status
- Toolbar: busca, filtros (status, owner, segmento), toggle view (tabela/grid), export
- Checkbox multi-select com bulk actions
- Click na linha → `contact-detail`

### 5. Detalhe do contato (`src/contact-detail.jsx` · `ContactDetailBold`)

- Header com avatar grande, nome em serif 40px, pill de status, botões Editar/Nova atividade/Mais
- Layout 2 colunas:
  - **Esquerda (8col):** timeline de atividades (emails, calls, meetings, notas), tabs (Atividade / Deals / Notas / Arquivos)
  - **Direita (4col):** card IA (resumo acionável + próximo passo sugerido), detalhes (empresa, telefone, email, source), deals abertos

### 6. Empresas (`CompaniesScreen`)

- Grid de cards de empresa: logo quadrado, nome, tamanho, indústria, nº de contatos associados, MRR
- Mesmos padrões de filtro da tela de Contatos

### 7. Pipeline/Kanban (`src/pipeline.jsx` · `PipelineBold`)

- Kanban horizontal com 6 colunas (Lead · Qualificado · Demo · Proposta · Negociação · Fechado)
- Header de coluna: título + contador + soma R$
- Cards de deal: nome, empresa, valor (serif), owner (avatar), próxima atividade, pill de probabilidade
- Drag simulado (visual apenas no protótipo)
- Click → `deal-detail`

### 8. Detalhe do deal (`DealDetailScreen`)

- Painel lateral slide-in do lado direito (ocupa 560px)
- Header com nome do deal, valor em serif, barra de progresso por estágio
- Tabs: Overview · Atividades · Contatos · Arquivos · Notas
- Botões: Avançar estágio · Marcar como ganho · Perdido

### 9. Leads (`src/leads.jsx` · `LeadsScreen` + `LeadDetail`)

- Tabela de leads (ainda não qualificados): nome, source, score IA, última interação
- Click → `lead-detail` com insight IA sobre fit + sugestão de qualificar/descartar

### 10. Atividades (`ActivitiesScreen`)

- Lista unificada de todas as atividades agendadas: calls, emails, tarefas, reuniões
- Agrupamento por data: Hoje / Amanhã / Esta semana / Depois
- Cada item: ícone do tipo, título, contato/deal relacionado, hora, owner

### 11. Relatórios (`ReportsScreen`)

- Grid 2×2 de cards de relatório grandes:
  - Performance do time (leaderboard)
  - Funil de conversão (cascata)
  - Velocidade do pipeline
  - MRR growth
- Cada um com gráfico + resumo IA

### 12. SDR Autônomo (`SdrScreen`)

- **Tela marca a diferenciação de IA do produto.** Card preto grande no topo: "O SDR acordou hoje e fez: …" com lista de ações executadas (enviou X emails, marcou Y reuniões, qualificou Z leads)
- Configuração do agente: tom de voz, horário ativo, limites diários
- Toggle ativo/pausado bem visível

### 13. Ads (`AdsScreen`)

- Tabela de campanhas: nome, plataforma (Google/Meta/LinkedIn), gasto, leads, CPL, CAC, status
- Card "IA sugestão de realocação" preto + neon com recomendação acionável (botão Aplicar/Ver análise)
- Mini-gráfico de barra lateral indicando performance up/down/flat

### 14. Segmentos (`SegmentsScreen`)

- Grid 2 colunas de segmentos (listas inteligentes)
- Cada card: nome, contagem grande em serif, regra em texto pequeno, badge "Auto" (atualiza sozinho) ou "Manual"

### 15. Settings (`src/settings.jsx` · `SettingsScreen`)

- Layout: sidebar secundária à esquerda (220px, aninhada dentro da área principal) com 8 sub-abas + conteúdo à direita
- Sub-abas: **Perfil** · **Workspace** · **Time** · **Billing** · **Integrações** · **Pipelines** · **Automações** · **API & Webhooks**
- Cada sub-aba: `SectionHeading` + formulário 2 colunas com `Field + TextField`

---

## Interações & Comportamento

### Navegação
- **Roteamento:** client-side simples via state + localStorage key `omnify_route` (objeto `{page, contact?, lead?}`)
- Clicar num item da sidebar → troca de tela
- Clicar numa linha de contato/lead/deal → abre detalhe correspondente
- Botão X / breadcrumb no detalhe → volta pra lista de origem

### Tema claro/escuro
- Toggle no header de cada tela (ícone sol/lua + label "Claro"/"Escuro")
- Persiste em `localStorage.omnify_theme` = `"light" | "dark"`
- Todas as cores vêm do hook `useOmnifyTokens(theme)` que retorna o objeto de tokens correspondente

### Estados interativos
- **Hover em linhas de tabela:** background → `bgSubtle`, cursor pointer
- **Hover em botões primários:** scale leve via transform, ou background levemente mais claro
- **Focus em inputs:** border → `text` (preto), sem outline default
- **Disabled:** opacity 0.5, cursor not-allowed

### Login
- Submit do form → setState loading → 650ms → `onLogin()` → `dashboard`
- Nenhuma validação real (protótipo); no codebase real, validar formato de email + senha mínima

### Toggle mostrar/ocultar senha
- Botão "Mostrar"/"Ocultar" à direita do input alterna `type` entre `"password"` e `"text"`

### Transições
- Troca de tela: instantânea (não há animação no protótipo). No codebase real, considerar fade 150ms
- Modais/side panels: slide-in da direita, 220ms cubic-bezier

---

## State Management

O protótipo usa apenas `useState` local e `localStorage`. No codebase real, use o padrão já estabelecido (Redux, Zustand, Context, Server state via TanStack Query, etc.).

Principais peças de estado:
- **Auth:** `{user, token, isAuthenticated}` — redirecionar não-auth pra `/login`
- **Route:** current page + parâmetros (contactId, leadId, dealId)
- **Theme:** `"light" | "dark"` persisted
- **Filters por tela:** escopo local, não precisa global
- **Dados de negócio:** contatos, leads, deals, atividades, campanhas, segmentos — todos fetched do backend

---

## Assets

- **Ícones:** todos são SVG paths inline no objeto `Icons` em `src/primitives.jsx`. Style outline, stroke-width 2, linecap/linejoin round. No codebase real, substituir por Lucide, Phosphor, Heroicons, ou o pack já adotado.
- **Logotipo OmniFy:** placeholder — quadrado arredondado neon com "O" em serif. Substituir pelo logo oficial quando disponível.
- **Fontes:** Google Fonts (`Inter Tight`, `Instrument Serif`, `JetBrains Mono`). No codebase real, considerar self-host pra performance.
- **Imagens de produto:** nenhuma no protótipo — tudo data viz, tipografia e UI.

---

## Files

```
design_handoff_omnify_crm/
├── README.md                         ← você está aqui
├── OmniFy CRM.html                   ← entrada; abra no navegador pra ver o protótipo
└── src/
    ├── tokens.jsx                    ← design tokens (cores light/dark, fontes)
    ├── primitives.jsx                ← Button, Pill, Icon, Icons, Avatar, TextField, Field…
    ├── shell.jsx                     ← SidebarBold (navegação lateral)
    ├── login.jsx                     ← Tela de login
    ├── dashboard.jsx                 ← DashboardBold
    ├── contacts.jsx                  ← ContactsBold (lista)
    ├── contact-detail.jsx            ← ContactDetailBold
    ├── pipeline.jsx                  ← PipelineBold (kanban)
    ├── leads.jsx                     ← LeadsScreen + LeadDetail
    ├── settings.jsx                  ← SettingsScreen + 8 sub-abas
    └── screens.jsx                   ← Inbox, Companies, DealDetail, Activities, Reports, SDR, Ads, Segments
```

### Como rodar o protótipo

1. Abra `OmniFy CRM.html` no navegador (qualquer browser moderno — Chrome/Safari/Firefox/Edge).
2. Não precisa de servidor local nem build — tudo carrega via CDN (React 18, Babel Standalone).
3. Login inicial → qualquer email/senha → botão **Entrar** → dashboard.
4. Botão **SAIR (demo)** no canto inferior esquerdo volta pro login (limpa localStorage de rota).

---

## Ordem sugerida de implementação

1. **Tokens primeiro** (`tokens.jsx`) — porta pro sistema de design tokens/theme do codebase. Isso destrava tudo.
2. **Primitives** (`primitives.jsx`) — mapeie cada um pro equivalente na lib do codebase. Se não houver, crie os que faltam seguindo o estilo.
3. **Shell de navegação** (`shell.jsx`) — sidebar + layout base.
4. **Login** — tela standalone, simples, ótima pra calibrar os tokens na prática.
5. **Dashboard + Contatos + Pipeline** — as 3 telas mais usadas pelo usuário final.
6. **Detalhes (contact-detail, deal-detail, lead-detail)** — reaproveitam muito dos padrões acima.
7. **Telas secundárias** (Inbox, Companies, Activities, Reports, Ads, Segments, SDR, Settings) — por ordem de prioridade do negócio.

---

## Contato

Se alguma decisão visual não estiver clara, o protótipo HTML é a fonte da verdade — abra a tela no navegador, inspecione no DevTools, leia o `.jsx` correspondente. Valores exatos (px, hex, pesos) estão literais no código.
