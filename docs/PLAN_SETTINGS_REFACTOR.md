# Plano: Refactor de Settings do CRM Omnify

> Reorganização da seção `/settings` do frontend pra resolver os problemas
> identificados no review de 2026-05-06: features duplicadas em múltiplas
> rotas, 11 items flat sem agrupamento, hack CSS pra esconder headers
> duplicados, padrões de tabs sem abstração, Linx em 3 lugares.

## Context

Após benchmark contra o ZPRO, ficou evidente que o Settings do Omnify
acumulou dívida arquitetural enquanto o produto crescia. **Não é falta
de código — é falta de estrutura.** Páginas individuais até funcionam,
mas:

- Linx é configurável em **3 lugares** (ProfileSettings, CompanySettings,
  TeamSettings) sem fonte de verdade clara
- Channels acessível em `/channels` E em `/settings/channels-integrations`
- `AiAutomationPage` renderiza pages com headers próprios e esconde
  com CSS hack `[&>div>div:first-child]:hidden`
- 11 items flat na sidebar sem agrupamento lógico (cognitive overload)
- Padrão de tabs duplicado entre `ChannelsIntegrationsPage` e
  `AiAutomationPage` sem abstração reutilizável
- Cards inconsistentes (alguns usam `<Card>` componente, outros constroem
  inline com `<div className="bg-muted/50...">`)

**Objetivo:** reorganizar em 8 grupos hierárquicos com SettingsLayout
unificado + componente `ConfigPage` reutilizável (padrão ZPRO), de forma
**incremental por grupo** (1 grupo por sprint, sem big-bang).

**Resultado pretendido:** ao final, ~30 páginas organizadas em 8 grupos,
todas usando o mesmo layout + componentes, sem rotas duplicadas, com
redirects de rotas antigas → novas pra preservar links salvos.

---

## Estrutura proposta — 8 grupos × ~30 páginas

```
/settings (SettingsLayout: sidebar fixa + breadcrumb + content)

📋 Conta                                  Sprint S0
  ├─ Perfil                  /settings/account/profile
  ├─ Segurança               /settings/account/security    [2FA + sessões + senha]
  └─ Notificações            /settings/account/notifications

🏢 Empresa                                Sprint S1
  ├─ Dados                   /settings/company/details
  ├─ Marca                   /settings/company/branding
  ├─ Aparência               /settings/company/appearance
  └─ Equipe                  /settings/company/team        [users + custom profiles]

💬 Atendimento                            Sprint S2
  ├─ Filas                   /settings/support/queues      [+ business hours]
  ├─ Tags                    /settings/support/tags
  ├─ Respostas Rápidas       /settings/support/quick-replies
  ├─ Auto-Replies            /settings/support/auto-replies
  ├─ Fluxos Guiados          /settings/support/step-replies
  └─ Templates WhatsApp      /settings/support/templates

📡 Canais                                 Sprint S3
  ├─ WhatsApp Business       /settings/channels/whatsapp
  ├─ Instagram Direct        /settings/channels/instagram
  ├─ External AI             /settings/channels/external-ai [Dialogflow/Dify]
  └─ Webhooks                /settings/channels/webhooks

📈 Vendas & Marketing                     Sprint S4
  ├─ Pipelines               /settings/sales/pipelines
  ├─ Broadcasts              /settings/sales/broadcasts    [+ send-window]
  ├─ Landing Pages           /settings/sales/landing-pages
  └─ Produtos                /settings/sales/products

🤖 IA & Automação                         Sprint S5
  ├─ Agentes SDR             /settings/ai/agents
  ├─ Base de Conhecimento    /settings/ai/knowledge
  ├─ Guardrails              /settings/ai/guardrails
  └─ Uso & Tokens            /settings/ai/usage

🔌 Integrações                            Sprint S6
  ├─ Linx (ERP)              /settings/integrations/linx       [único lugar]
  ├─ GTM / GA4               /settings/integrations/analytics
  └─ Outras                  /settings/integrations/others

🛡️ Admin (admin/super_admin)              Sprint S7
  ├─ Auditoria               /settings/admin/audit-logs
  ├─ Incidentes Segurança    /settings/admin/security-incidents
  ├─ Custom Profiles         /settings/admin/custom-profiles
  └─ Gamification            /settings/admin/gamification
```

---

## Componentes novos a criar

### 1. `SettingsLayout` (foundation)

**Path:** `frontend/src/layouts/SettingsLayout.tsx`

Wrapper único pra todas as pages de Settings. Renderiza:
- Sidebar fixa em desktop (240-280px) com 8 grupos colapsáveis
- Drawer em mobile (hamburger top-left)
- Breadcrumb no header (Settings › Atendimento › Filas)
- `<Outlet />` pro conteúdo da page atual
- Responde a permissions: items ocultos quando user não tem permissão

```tsx
// Signature aproximada
interface SettingsLayoutProps {
  children?: never; // usa <Outlet />
}

// Internal: SettingsNavGroup type
interface SettingsNavGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  permission?: PermissionKey; // esconde grupo inteiro se faltar
  items: SettingsNavItem[];
}

interface SettingsNavItem {
  id: string;
  label: string;
  href: string;
  permission?: PermissionKey;
  badge?: string | number; // ex: "3 incidentes"
}
```

### 2. `ConfigPage` (copiar padrão ZPRO)

**Path:** `frontend/src/components/settings/ConfigPage.tsx`

Forms declarativos. Reduz duplicação de JSX em ~30 páginas.

```tsx
interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'number' | 'boolean' | 'textarea'
      | 'url' | 'email' | 'select' | 'datalist' | 'color'
      | 'media-upload';
  placeholder?: string;
  description?: string;       // helper text abaixo
  required?: boolean;
  options?: { value: string; label: string }[];
  optionsFromField?: string;  // dependência: model depende de provider
  optionsMap?: Record<string, ReadonlyArray<{ value: string; label: string }>>;
  validation?: z.ZodType;     // zod schema opcional
  permission?: PermissionKey; // campo only-admin etc
}

interface ConfigSection {
  title: string;
  description?: string;
  icon?: LucideIcon;
  fields: ConfigField[];
  collapsible?: boolean;      // ZPRO usa em GTM
}

interface ConfigPageProps<T> {
  title: string;
  description?: string;
  icon?: LucideIcon;
  sections: ConfigSection[];
  values: T;
  onSave: (next: T) => Promise<void>;
  help?: { description: string; sections: HelpSection[] };
  headerActions?: React.ReactNode;
}
```

Tipo de cada field renderiza componente correto (Switch, Select, Input,
TextArea, etc.). `<FloatingSaveButton>` aparece quando `isDirty`.

### 3. `<Can>` componente

**Path:** `frontend/src/components/auth/Can.tsx`

```tsx
interface CanProps {
  permission: PermissionKey;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

<Can permission="users_manage">
  <Button>Gerenciar usuários</Button>
</Can>
```

Já está nos planos de Sprint 3-frontend; antecipar pra cá.

### 4. `<FloatingSaveButton>`

Aparece quando há mudanças não salvas. Em scroll > 200px, fica
fixo no bottom-right. Mostra "X mudanças pendentes" + botão Salvar.

### 5. `<HelpDrawer>`

Painel lateral right-side. Cada page que tiver `help` no `ConfigPage`
mostra ícone de `?` no header → abre drawer com:
- Descrição da feature
- Sections de FAQ ou steps
- Link pra docs externas se aplicável

### 6. `useSettings` hook (estilo ZPRO)

**Path:** `frontend/src/hooks/useSettings.ts`

Consolida 2 fontes (tabela `settings` + campos do `tenants`) num hook só:

```tsx
const { values, isLoading, isDirty, save, reset } = useSettings({
  tenantFields: ['name', 'slug', 'whatsapp_number'], // vão pra /tenants/:id
  settingsKeys: ['linx_subscription_key', 'linx_ambiente'], // vão pra /settings
});

await save(); // Promise.all([updateSettings(), updateTenant()])
```

---

## Mapeamento de → para

Pra cada feature/page existente hoje, onde ela vai morar na nova estrutura.
Rotas antigas redirecionam pras novas via `<Navigate replace>`.

| Hoje | Nova rota | Nota |
|---|---|---|
| `/settings` (Settings.tsx) | `/settings/account/profile` (default) | redirect |
| `ProfileSettingsPage` | `/settings/account/profile` | mover Linx do meio pro Integrações |
| `CompanySettingsPage` | `/settings/company/details` | remover Linx daqui |
| `BrandingSettingsPage` | `/settings/company/branding` | mover |
| `AppearanceSettingsPage` | `/settings/company/appearance` | mover |
| `TeamSettingsPage` | `/settings/company/team` | + integrar Custom Profiles UI |
| `NotificationsSettingsPage` | `/settings/account/notifications` | mover |
| `ChannelsIntegrationsPage` (5 tabs) | dissolver — tabs viram pages standalone | quebrar nesting |
| ↪ tab WhatsApp | `/settings/channels/whatsapp` | |
| ↪ tab Instagram | `/settings/channels/instagram` | |
| ↪ tab Queues | `/settings/support/queues` | mover pra Atendimento |
| ↪ tab Templates | `/settings/support/templates` | mover pra Atendimento |
| ↪ tab Integrações Meta | `/settings/channels/whatsapp` (consolidado) | merge |
| `IntegrationsSettingsPage` | `/settings/integrations/others` | mover |
| `AiAutomationPage` (4 tabs) | dissolver — tabs viram pages standalone | quebra hack CSS |
| ↪ tab Usage | `/settings/ai/usage` | |
| ↪ tab Guardrails | `/settings/ai/guardrails` | |
| ↪ tab Knowledge | `/settings/ai/knowledge` | |
| ↪ tab Accounts | `/settings/sales/products` (catálogo) | reclassificar |
| `AiUsageDashboard` | `/settings/ai/usage` | merge com AiAutomation |
| `GtmSettingsPage` | `/settings/integrations/analytics` | mover |
| `ActivitiesDashboard` | **fora** de Settings — dashboard separado | feature, não config |
| `GamificationAdminPage` | `/settings/admin/gamification` | mover |
| `/channels` (rota raiz) | `/settings/channels/whatsapp` | redirect |
| `/queues` (rota raiz) | `/settings/support/queues` | redirect |
| `/whatsapp-templates` | `/settings/support/templates` | redirect |
| `/whatsapp-profile` | dissolver — número específico vai dentro do `/settings/channels/whatsapp/{id}` | |
| `/quick-replies` | `/settings/support/quick-replies` | redirect |
| `/integrations` | `/settings/integrations/others` | redirect |
| `/products` | `/settings/sales/products` | redirect |
| `/landing-pages` | `/settings/sales/landing-pages` | redirect |
| `/broadcasts` | `/settings/sales/broadcasts` | redirect |
| `/groups` | discussion needed | provavelmente fora de Settings |
| **NOVAS pages** (não existem ainda) | | |
| Audit logs viewer | `/settings/admin/audit-logs` | sprint S7 |
| Security incidents viewer | `/settings/admin/security-incidents` | sprint S7 |
| Custom Profiles CRUD UI | `/settings/admin/custom-profiles` | sprint S1 (em Equipe) ou S7 |
| 2FA enable/disable + recovery codes | `/settings/account/security` | sprint S0 |
| Sessions ativas + revogar | `/settings/account/security` | sprint S0 |
| Pause/queue/share UI em Tickets | **fora** de Settings — TicketHeader em `/atendimento` | sprint S2 (mas é página de Tickets, não settings) |
| Auto-replies CRUD UI | `/settings/support/auto-replies` | sprint S2 |
| Step-replies CRUD UI | `/settings/support/step-replies` | sprint S2 |
| External AI config (Dialogflow/Dify) | `/settings/channels/external-ai` | sprint S3 |
| OAuth proxy toggle | `/settings/channels/whatsapp` (per integration) | sprint S3 (espera backend follow-up) |
| Send-window picker em Broadcasts | `/settings/sales/broadcasts` | sprint S4 |

**Linx consolidado:** SAI de Profile/Company/Team. Vai SÓ em
`/settings/integrations/linx`. As FKs `linx_*` continuam em `users` e
`tenants` (não muda backend), mas a UI é uma só.

---

## Cronograma — 8 sprints (~32 dias)

### Sprint S0 — Foundation + grupo Conta (5 dias)

**Entrega:**
- `SettingsLayout` componente + roteamento `/settings/*` redirecionando
  default pra `/settings/account/profile`
- `ConfigPage` componente + tipos + storybook básico
- `<Can>`, `<FloatingSaveButton>`, `<HelpDrawer>` componentes
- `useSettings` hook
- **Grupo Conta completo (3 pages):**
  - Perfil (já existe — refactor pra ConfigPage)
  - Segurança (NOVA — 2FA enable/confirm/disable + recovery codes
    download + sessões ativas com revogar)
  - Notificações (já existe — refactor pra ConfigPage)
- Redirect das rotas antigas relevantes

**Foundation justifica os 5 dias:** este sprint cria o "framework"
interno que todos os próximos vão consumir. Investimento alto upfront,
ROI nas sprints seguintes que vão ser mais rápidas.

### Sprint S1 — grupo Empresa (4 dias)

**Entrega:**
- Dados (já existe — refactor)
- Marca (já existe — refactor)
- Aparência (já existe — refactor)
- Equipe (já existe + Custom Profiles inline UI — modal/drawer com
  matriz de checkboxes das 35 keys agrupadas por categoria)

**Decisão a tomar:** Custom Profiles fica em Equipe ou em Admin?
**Recomendação:** em Equipe (admin tenant) + replicado em Admin
super_admin (que vê todos tenants).

### Sprint S2 — grupo Atendimento (5 dias) — maior

**Entrega (6 pages, todas novas ou refactor pesado):**
- Filas: refactor + adicionar editor de business_hours JSON (UI com
  picker de horários por dia, suporte múltiplos slots/dia)
- Tags: refactor de `/quick-replies` velho ou criar do zero
- Respostas Rápidas: refactor + adicionar dropzone de mídia
- Auto-Replies: NOVA (sprint 6 backend, frontend agora)
- Fluxos Guiados (StepReplies): NOVA (sprint 7 backend) — builder
  list-based com drag-drop via `react-beautiful-dnd` (já em uso no
  Pipeline)
- Templates WhatsApp: refactor de `/whatsapp-templates`

**Maior risco:** o builder do StepReplies. Não é visual (ChatFlow
ReactFlow é Phase 2), é list-based. Cada step tem form inline pelo
`type` selecionado. Validação pra detectar steps sem destino, etc.

### Sprint S3 — grupo Canais (4 dias)

**Entrega:**
- WhatsApp Business: refactor com Embedded Signup já existente +
  toggle OAuth proxy white-label (espera backend follow-up Sprint 5)
- Instagram Direct: ainda não tem — pode ficar como "Em breve" ou
  implementar com mesmo handler (Meta unifica)
- External AI: NOVA — config Dialogflow/Dify por channel
- Webhooks: refactor

### Sprint S4 — grupo Vendas & Marketing (4 dias)

**Entrega:**
- Pipelines: já existe — refactor
- Broadcasts: refactor + send-window picker (sliders + timezone) +
  resume button
- Landing Pages: refactor
- Produtos: refactor (catálogo)

### Sprint S5 — grupo IA & Automação (3 dias)

**Entrega:**
- Agentes SDR: refactor da gestão atual
- Base de Conhecimento: refactor (já tem)
- Guardrails: refactor (já tem)
- Uso & Tokens: refactor (já tem)

### Sprint S6 — grupo Integrações (3 dias)

**Entrega:**
- Linx (ERP): NOVO único lugar, consolidando os 3 atuais
- GTM/GA4: mover de Settings.tsx
- Outras: hub pra Pipedrive, Sentry config, etc

### Sprint S7 — grupo Admin (4 dias)

**Entrega (3 NOVAS + 1 refactor):**
- Auditoria: viewer de `audit_logs` com filtros (model_type, actor,
  date range), tabela paginada, drill-down em row pra ver before/after
  JSON. **Maior peça do sprint.**
- Incidentes Segurança: viewer de `security_incidents` similar
- Custom Profiles: CRUD completo (replicar do que já fizer em Equipe
  S1, mas super_admin vê cross-tenant)
- Gamification: refactor

---

## Estratégia de rotas + redirects

Cada rota antiga ganha um redirect via `<Navigate to="..." replace />`
no router. Mantém URLs salvos funcionando.

```tsx
// frontend/src/router/index.tsx
{ path: '/channels', element: <Navigate to="/settings/channels/whatsapp" replace /> },
{ path: '/queues', element: <Navigate to="/settings/support/queues" replace /> },
// ... etc
```

**Rotas antigas que NÃO vão redirecionar:**
- `/atendimento` — não é settings, fica
- `/dashboard`, `/leads`, etc — não são settings
- Tudo do Super Admin (`/super-admin/*`) — fica fora desse refactor

---

## Decisões pendentes pra cada sprint

Cada sprint vai abrir 2-3 decisões de UX que precisam ser tomadas
antes de implementar. Sugestão: criar issue/PR draft no início e
linkar dúvidas pra Rafael responder rápido.

**Exemplos típicos:**
- S0: design do recovery codes — modal com lista + botão "Baixar TXT"?
  Ou copy-paste com checkbox "salvei em local seguro"?
- S0: sessões ativas — mostrar IP completo ou só país (fingerprint)?
  Privacy vs debug.
- S1: Custom Profiles — preset de "perfis comuns" (SDR, Atendente,
  Supervisor) ou começa em branco?
- S2: business_hours editor — visual (toggle dias da semana + range
  picker por dia) ou JSON cru?
- S2: StepReply builder — máximo de steps por flow (50? 100?)
- S3: OAuth proxy toggle — confirma duas vezes (irreversível sem
  re-OAuth)?
- S7: audit logs — retenção visual (mostrar só últimos 90 dias por
  default? loadear todos sob demanda?)

---

## Riscos e mitigações

### 🔴 Alto

**Refactor durante uso ativo de produção** — se um usuário está numa
page que vai ser deletada, ele perde estado. **Mitigação:** redirects
preservam acesso; novo SettingsLayout é additive (não deleta páginas
até nova estar pronta + smoke test passar).

**3 lugares pra Linx consolidar em 1** — usuários acostumados com
fluxo antigo. **Mitigação:** banner "📍 Linx agora vive em
Integrações" nas pages antigas por 30 dias.

### 🟡 Médio

**Volume de pages a refatorar** — 30 pages x 2-4h cada = 60-120h só
no refactor. **Mitigação:** ConfigPage reduz tempo médio em ~50%
(declarativo > JSX manual). Sprints S0+S1 valida o ROI.

**Conflito com Sprints 1.4/1.5/3-7-frontend pendentes** —
DOMPurify, encryption client-side, UI Sprints 3-7 vão usar SettingsLayout
novo. **Mitigação:** fazer S0 (foundation) primeiro; daí Sprints
1.4/1.5/3-7-frontend usam o framework novo.

### 🟢 Baixo

**Permission gates podem esconder grupo inteiro** — se user não tem
nenhuma permission do grupo Admin, sidebar não mostra "Admin". OK,
intencional. **Mitigação:** N/A.

---

## Critical files (paths concentrados)

### Componentes a criar
- `frontend/src/layouts/SettingsLayout.tsx`
- `frontend/src/components/settings/ConfigPage.tsx`
- `frontend/src/components/settings/FieldRenderer.tsx` (interno do ConfigPage)
- `frontend/src/components/settings/SettingsSidebar.tsx`
- `frontend/src/components/settings/SettingsBreadcrumb.tsx`
- `frontend/src/components/auth/Can.tsx`
- `frontend/src/components/ui/FloatingSaveButton.tsx`
- `frontend/src/components/ui/HelpDrawer.tsx`
- `frontend/src/hooks/useSettings.ts`
- `frontend/src/hooks/useHasPermission.ts` (já em planos Sprint 3-frontend)

### Pages novas (Sprint S0)
- `frontend/src/pages/settings/account/SecurityPage.tsx` (2FA + sessions)

### Router refactor
- `frontend/src/router/index.tsx` — toda a árvore de `/settings/*` +
  redirects

### Referências do ZPRO (ler antes de codar)
- `[ZPRO]/frontend/src/app/(dashboard)/configuracoes/layout.tsx` —
  pattern de sidebar+search
- `[ZPRO]/frontend/src/components/config/config-section.tsx` — base
  do ConfigPage
- `[ZPRO]/frontend/src/components/ui/floating-save-button.tsx`
- `[ZPRO]/frontend/src/stores/auth-store.ts` — `injectTenantSettings`,
  `getConfigValue`, `hasPermission`

---

## Verification (após cada sprint)

### Cada sprint individualmente
- Página antiga → redirect funciona, URL nova carrega correto
- ConfigPage form salva via Promise.all (settings + tenant) — verificar
  rede no DevTools
- `<Can permission="...">` esconde corretamente quando user não tem
- `<FloatingSaveButton>` aparece em scroll com mudanças
- `<HelpDrawer>` abre/fecha corretamente
- Mobile responsive (drawer hamburger funciona)

### End-to-end (após S7)
- Logado como user role=vendedor → menu Settings só mostra Conta +
  Empresa (Branding readonly) + Atendimento + Canais readonly
- Logado como admin → vê todos os 8 grupos
- Logado como super_admin → vê Admin com cross-tenant
- Linx — configurar em /settings/integrations/linx → checar via API
  que valores chegaram em `users.linx_*` e `tenants.linx_*`
- Audit logs — fazer mudança em qualquer config → entrada aparece em
  /settings/admin/audit-logs com before/after correto
- Browser back/forward navega corretamente entre pages do settings
  sem perder state local

---

## Quando começar este refactor

**Recomendação operacional:** começar Sprint S0 SOMENTE após mergear
todas as 9 branches P0+P1 atuais (ou pelo menos as Sprints 0-3, que
são as security-críticas).

Razão: as branches atuais ainda não mexeram em frontend. Se começarmos
S0 antes delas serem merged, vamos ter 2 PRs grandes mexendo em coisas
relacionadas (S0 cria ConfigPage, Sprint 3-frontend usa Custom Profiles
UI que precisa do ConfigPage). Sequência limpa:

1. Merge Sprints P0+P1 backend (9 branches)
2. Sprint S0 settings refactor (foundation + Conta)
3. Sprints 1.4/1.5 (DOMPurify + encryption) usando o novo framework
4. Sprints S1-S7 incrementais

**Total estimado:** ~32 dias de frontend = 6-8 semanas dependendo de
parallelismo + revisões.

---

**Status atual:** plano completo. Aguardando aprovação pra começar
S0 quando o backend P0+P1 for merged em produção.
