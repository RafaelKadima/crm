## Funcionalidades do Sistema (CRM AI)

Este documento descreve **todas as funcionalidades do sistema** com base em:
- **Backend Laravel** (`routes/api.php`, Controllers, Services, Jobs, Events)
- **Frontend React/Vite** (`frontend/src/App.tsx` + hooks/páginas)
- **Microserviço IA (FastAPI)** (`ai-service/*`)
- **Docs internas** (`docs/FLUXO_IA_360.md`, `docs/WHATSAPP_INTEGRATION_ARCHITECTURE.md`, `docs/importacao-fila.md`)

---

## Visão geral (o que o sistema faz)

O CRM é uma plataforma **multi-tenant** que integra:
- **Atendimento** (tickets/chat) com **WhatsApp/Instagram** e UI em tempo real (WebSocket).
- **CRM de vendas** (leads, kanban/pipelines, distribuição round-robin, tarefas e relatórios).
- **IA 360°** (SDR Agent para atendimento/qualificação; Ads Agent/Orchestrator para marketing; RAG + memória + aprendizado).
- **Marketing** (Ads Intelligence: criativos, copies, guardrails, automações, insights, conhecimento).
- **Landing Pages** e **Catálogo de Produtos** para captura e atribuição (UTM → campanha/anúncio → conversão).
- **Admin global (Super Admin)** para gestão de tenants, features e custos.

---

## Governança e regras transversais

### Multi-tenant (escopo por empresa)
- Usuários normalmente pertencem a um **tenant** (empresa).
- Rotas em escopo de tenant usam `tenant`/`ResolveTenant`, garantindo que:
  - usuário autenticado
  - `tenant_id` presente no usuário
  - tenant ativo

### Feature flags (módulos por tenant)
Módulos podem ser ativados por tenant (middleware `feature:<key>` / `CheckFeature:<key>`). Catálogo (fonte: `app/Models/TenantFeature.php`):
- **`sdr_ia`**: SDR com IA (agentes, regras, aprendizado)
- **`landing_pages`**: criação de landing pages
- **`whatsapp`**: integração WhatsApp
- **`instagram`**: integração Instagram
- **`appointments`**: agendamentos
- **`reports_advanced`**: relatórios avançados
- **`automation`**: automações (workflows)
- **`api_access`**: acesso à API para integrações externas
- **`multi_pipeline`**: múltiplos funis
- **`products`**: catálogo de produtos
- **`groups`**: grupos/franquias
- **`ads_intelligence`**: Ads Intelligence (Meta/Google)

### Perfis e permissões
- Há autenticação via API (Bearer Token / Passport) e controle de acesso por:
  - papel do usuário (ex.: vendedor/admin)
  - permissões por pipeline/fila
  - rotas restritas para **Super Admin** (`SuperAdminMiddleware`)

---

## Frontend (telas principais)

Rotas (fonte: `frontend/src/App.tsx`):
- **Públicas**
  - `/login`: login
  - `/lp/:slug`: landing page publicada
- **Tenant (autenticadas)**
  - `/`: dashboard
  - `/leads`: kanban de leads
  - `/contacts`: contatos
  - `/tickets`: atendimento/tickets (chat)
  - `/tasks`: tarefas
  - `/reports`: relatórios
  - `/settings/*`: configurações
  - `/groups`: grupos (quando habilitado)
  - `/channels`: canais (WhatsApp/Instagram/etc.)
  - `/queues`: filas/setores e distribuição
  - `/integrations`: integrações
  - `/products`: catálogo de produtos
  - `/landing-pages` e `/landing-pages/:id/edit`: gestão e builder
  - `/sdr` e rotas de configuração/learning do SDR
  - `/appointments` e `/schedule`: agendamentos e agenda
  - `/whatsapp-templates`: templates do WhatsApp
  - `/gtm`: configurações GTM
  - **Ads Intelligence**: `/ads/*` (dashboard, contas, campanhas, insights, automação, agente, criativos, chat, knowledge, guardrails)
- **Super Admin**
  - `/super-admin/*`: dashboard, tenants, criação e detalhes

Observação: o frontend usa `useMyFeatures()` para **mostrar/ocultar menus** conforme features do tenant.

---

## Backend (módulos e funcionalidades)

### 1) Autenticação & Sessão
- **Login/logout/me/refresh** para sessão via API.
- Integração com **Laravel Passport** (rotas OAuth fora de `api/*`).

Principais rotas:
- `POST /api/auth/login` (e alias `POST /api/login`)
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/refresh`

### 2) Tenant (Configurações, Branding e Features)
- **Features do tenant**
  - `GET /api/my-features`: retorna features ativas + plano/labels
  - `GET /api/check-feature/{feature}`: valida acesso a um módulo
- **Settings do tenant**
  - `GET /api/tenant/settings`
  - `PUT /api/tenant/settings`
- **Branding/identidade visual**
  - `GET /api/branding` / `PUT /api/branding`
  - upload/remoção de logo e reset
  - rotas equivalentes em `api/tenant/branding/*`

### 3) Usuários & Permissões (por tenant)
- CRUD de usuários do tenant:
  - `GET/POST /api/users`
  - `GET/PUT/DELETE /api/users/{user}`
  - `POST /api/users/{user}/toggle-active`
- Perfil do usuário logado:
  - `GET/PUT /api/profile`
  - `POST /api/profile/change-password`
- Permissões:
  - `GET /api/permissions` (lista)
  - `GET /api/permissions/roles` (por papel)
  - `GET /api/permissions/me`
  - permissões por usuário: `GET/PUT /api/users/{user}/permissions` + reset

### 4) Leads (CRM)
- CRUD de leads:
  - `GET/POST /api/leads`
  - `GET/PUT/DELETE /api/leads/{lead}`
- Operações de CRM:
  - **mover estágio**: `PUT /api/leads/{lead}/stage`
  - **atribuir vendedor/owner**: `PUT /api/leads/{lead}/assign`
  - **dados de cliente** (para fechamento): `GET/POST /api/leads/{lead}/customer-data`

#### Importação de Leads
- `GET /api/leads/imports`
- `POST /api/leads/imports`
- `GET /api/leads/imports/template`
- `GET /api/leads/imports/{import}`

Nota operacional (fila): sem worker ativo a importação fica travada (ver `docs/importacao-fila.md`).

### 5) Pipelines (Kanban)
- CRUD de pipelines:
  - `GET/POST /api/pipelines`
  - `GET/PUT/DELETE /api/pipelines/{pipeline}`
- Stages:
  - `GET /api/pipelines/{pipeline}/stages`
  - `POST /api/pipelines/{pipeline}/stages`
  - `PUT/DELETE /api/pipelines/{pipeline}/stages/{stage}`
- Permissões por pipeline (usuários):
  - `GET /api/pipelines/{pipeline}/users`
  - add/update/remove/sync de usuários e permissões

### 6) Tickets / Atendimento (Chat)
Funcionalidades principais:
- Lista e CRUD de tickets
- Histórico paginado de mensagens
- Envio/edição/exclusão de mensagens
- Transferência de atendimento
- Encerrar/reabrir
- **Toggle IA** por ticket (atendimento humano vs IA)

Rotas:
- `GET/POST /api/tickets`
- `GET/PUT/DELETE /api/tickets/{ticket}`
- `GET /api/tickets/{ticket}/messages`
- `POST /api/tickets/{ticket}/messages`
- `PUT /api/tickets/{ticket}/messages/{message}`
- `DELETE /api/tickets/{ticket}/messages/{message}`
- Transferências e estados:
  - `GET /api/tickets/{ticket}/transfer-options`
  - `PUT /api/tickets/{ticket}/transfer`
  - `PUT /api/tickets/{ticket}/transfer-queue`
  - `PUT /api/tickets/{ticket}/close`
  - `PUT /api/tickets/{ticket}/reopen`
  - `PUT /api/tickets/{ticket}/toggle-ia`
  - `GET /api/tickets/{ticket}/ia-status`

#### Uploads/Anexos e mídia
- Upload com **presigned URL** + confirmação (S3/R2) e fallback local.
- Listagem de anexos por ticket, URL de download, delete.
- Media proxy autenticado e media público com assinatura.

Rotas:
- `POST /api/files/presigned-url`
- `POST /api/files/upload/{attachment}`
- `POST /api/files/confirm`
- `GET /api/files/ticket/{ticket}`
- `GET /api/files/{attachment}/download-url`
- `DELETE /api/files/{attachment}`
- download assinado: `GET /api/files/{attachment}/download`
- media:
  - `GET /api/media/{path}` (auth)
  - `GET /api/media-public/{path}` (assinada)
  - `POST /api/media/signed-url`

### 7) Canais, Filas (Queues) e Distribuição
#### Canais (WhatsApp/Instagram/…)
Funções:
- CRUD de canais
- Testar conexão
- Toggle de ativo
- Modo IA do canal
- Configuração do **menu de filas** por canal (texto, opções, preview)

Rotas:
- `GET/POST /api/channels`
- `GET/PUT/DELETE /api/channels/{channel}`
- `POST /api/channels/{channel}/test-connection`
- `POST /api/channels/{channel}/toggle-active`
- `PUT /api/channels/{channel}/ia-mode`
- menu filas:
  - `PUT /api/channels/{channel}/queue-menu`
  - `GET /api/channels/{channel}/queue-menu/preview`
  - `GET /api/channels/{channel}/queues`
  - `GET /api/channels/{channel}/queues/stats`
  - `POST /api/channels/{channel}/queues/reorder`

#### Filas/Setores (Queues)
Funções:
- CRUD de filas
- Gerenciar usuários e status do usuário na fila
- Habilitar/desabilitar autodistribuição
- Distribuir leads “parados/aguardando”

Rotas:
- `GET/POST /api/queues`
- `GET/PUT/DELETE /api/queues/{queue}`
- usuários:
  - `POST /api/queues/{queue}/users`
  - `DELETE /api/queues/{queue}/users`
  - `PUT /api/queues/{queue}/users/sync`
  - `PUT /api/queues/{queue}/users/{user}/status`
- ações:
  - `POST /api/queues/{queue}/toggle-auto-distribute`
  - `POST /api/queues/{queue}/distribute-waiting`

#### Lógica de roteamento e round-robin (regras importantes)
Fonte: `app/Services/QueueRoutingService.php` e `app/Services/LeadAssignmentService.php`.
- **Menu de filas**
  - se `lead.queue_id` é `null`, o menu é exibido **sempre** (primeiro contato ou ticket fechado manualmente)
  - se há retorno dentro de `channel.return_timeout_hours`, pode reabrir ticket/retomar sem menu (quando aplicável)
- **Carteirização por fila**: lead pode “pertencer” a um atendente dentro de uma fila (`LeadQueueOwner`)
- **Round-Robin**
  - prioridade: usuários elegíveis da fila → usuários com permissão no pipeline → fallback para vendedores ativos do tenant
  - rotação baseada em `LeadAssignmentLog` (canal/fila)

### 8) Tarefas
- CRUD e conclusão:
  - `GET/POST /api/tasks`
  - `GET/PUT/DELETE /api/tasks/{task}`
  - `PUT /api/tasks/{task}/complete`

### 9) Agendamentos (feature `appointments`)
Funções:
- listar, criar, atualizar
- confirmar/cancelar/concluir/no-show/remarcar
- consultar dias/slots disponíveis
- configurar agenda do usuário (schedules)

Rotas:
- `GET/POST /api/appointments`
- `GET /api/appointments/available-days`
- `GET /api/appointments/available-slots`
- `GET/PUT /api/appointments/{appointment}`
- `POST /api/appointments/{appointment}/confirm|cancel|complete|no-show|reschedule`
- agendas:
  - `GET /api/schedules`
  - `POST /api/schedules`
  - `POST /api/schedules/week`

### 10) Produtos & Categorias (catálogo)
#### Categorias
- `GET/POST /api/product-categories`
- `GET/PUT/DELETE /api/product-categories/{category}`
- `POST /api/product-categories/reorder`

#### Produtos
- `GET/POST /api/products`
- `GET/PUT/DELETE /api/products/{product}`
- `POST /api/products/{product}/duplicate`
- imagens:
  - `POST /api/products/{product}/images`
  - `DELETE /api/products/{product}/images/{image}`
  - `PUT /api/products/{product}/images/{image}/primary`
  - `POST /api/products/images/reorder`

#### Público (para LP)
- `GET /api/public/{tenantSlug}/products`

### 11) Landing Pages (feature `landing_pages`)
Funções:
- CRUD de LPs
- publicar/despublicar
- duplicar
- estatísticas
- upload de imagens do builder
- rota pública de renderização + submissão de formulário

Rotas:
- `GET/POST /api/landing-pages`
- `GET/PUT/DELETE /api/landing-pages/{landingPage}`
- `POST /api/landing-pages/{landingPage}/publish|unpublish|duplicate`
- `GET /api/landing-pages/{landingPage}/stats`
- `POST /api/landing-pages/{landingPage}/upload-image`
- público:
  - `GET /api/lp/{slug}`
  - `POST /api/lp/{slug}/submit`

### 12) Relatórios
Rotas:
- `GET /api/reports/funnel`
- `GET /api/reports/productivity`
- `GET /api/reports/ia`
- `GET /api/reports/distribution`

### 13) GTM (Google Tag Manager) & eventos
Funções:
- configurar GTM e mapear eventos por pipeline/estágio
- sugestões de eventos e campos disponíveis

Rotas:
- `GET/PUT /api/gtm/settings`
- `GET /api/gtm/suggestions`
- `GET /api/gtm/fields`
- `GET/PUT /api/gtm/pipeline/{pipeline}/events`
- `PUT /api/gtm/stage/{stage}/event`

Integração com Ads/Conversões:
- `LeadAttributionService` faz:
  - parse de UTM (campos do lead, metadata, referrer)
  - atribuição para campanha/anúncio (utm_campaign / utm_content)
  - registro de conversões (com stage_from/stage_to, gtm_event_key, value, days_to_convert)
  - cálculo de ROAS “real” e stats de atribuição

### 14) Grupos/Franquias (feature `groups`)
Funções:
- CRUD de grupos
- adicionar/remover tenants
- adicionar/remover usuários
- dashboards e relatórios agregados por tenant/grupo

Rotas:
- `GET/POST /api/groups`
- `GET/PUT/DELETE /api/groups/{group}`
- `POST /api/groups/{group}/tenants` / `DELETE /api/groups/{group}/tenants/{tenant}`
- `POST /api/groups/{group}/users` / `DELETE /api/groups/{group}/users/{user}`
- relatórios:
  - `GET /api/groups/{group}/dashboard`
  - `GET /api/groups/{group}/metrics-per-tenant`
  - `GET /api/groups/{group}/funnel`
  - `GET /api/groups/{group}/ranking`

### 15) Integrações: WhatsApp
#### Envio/ações do WhatsApp (rotas autenticadas)
- `POST /api/whatsapp/configure`
- `POST /api/whatsapp/test-connection`
- `POST /api/whatsapp/tickets/{ticket}/send`
- `POST /api/whatsapp/tickets/{ticket}/media`
- `POST /api/whatsapp/tickets/{ticket}/template`
- `POST /api/whatsapp/tickets/{ticket}/proxy-media`

#### Templates do WhatsApp
- listagem/criação e utilitários:
  - `GET/POST /api/whatsapp/templates`
  - `GET /api/whatsapp/templates/categories`
  - `GET /api/whatsapp/templates/statuses`
  - `GET /api/whatsapp/templates/check-name`
  - `POST /api/whatsapp/templates/preview`
- por template:
  - `GET /api/whatsapp/templates/{template}`
  - `DELETE /api/whatsapp/templates/{template}`
  - `GET /api/whatsapp/templates/{template}/status`
- por canal:
  - `GET /api/whatsapp/templates/meta/{channel}`
  - `POST /api/whatsapp/templates/sync/{channel}`
  - `GET /api/whatsapp/templates/approved/{channel}`
  - `GET /api/whatsapp/templates/stats/{channel}`

#### Webhooks públicos
- WhatsApp:
  - `GET /api/webhooks/whatsapp` (verify)
  - `POST /api/webhooks/whatsapp` (receive)
  - `POST /api/webhooks/simulate-message` (teste local)
- Meta unificado:
  - `GET /api/webhooks/meta` (verify)
  - `POST /api/webhooks/meta` (receive)

Observação importante: existe documentação de arquitetura com Node.js + Redis Pub/Sub + Reverb/Echo em `docs/WHATSAPP_INTEGRATION_ARCHITECTURE.md`.

### 16) Integrações: Instagram
Rotas autenticadas:
- `POST /api/instagram/configure`
- `POST /api/instagram/test-connection`
- `POST /api/instagram/tickets/{ticket}/send`
- `POST /api/instagram/tickets/{ticket}/image`
- `GET /api/instagram/conversations`

Webhooks públicos:
- `GET /api/webhooks/instagram` (verify)
- `POST /api/webhooks/instagram` (receive)

### 17) Ads Intelligence (feature `ads_intelligence`)
Módulo de marketing/ads com:
- contas de anúncio
- leitura de campanhas e métricas
- insights e recomendações
- automações (regras + logs + aprovação/rollback)
- criação assistida por IA (Ads Agent)
- gerenciamento de criativos/copies/knowledge/guardrails

Rotas principais:
- Plataformas: `GET /api/ads/platforms`
- Contas:
  - `GET/POST /api/ads/accounts`
  - `GET/PUT/DELETE /api/ads/accounts/{account}`
  - `POST /api/ads/accounts/{account}/sync`
  - `POST /api/ads/accounts/{account}/test`
- Dashboard/Ranking:
  - `GET /api/ads/dashboard`
  - `GET /api/ads/ranking`
- Campanhas:
  - `GET /api/ads/campaigns`
  - `GET /api/ads/campaigns/{campaign}`
  - `GET /api/ads/campaigns/{campaign}/metrics`
- Insights:
  - `GET /api/ads/insights`
  - `GET /api/ads/insights/types`
  - `GET /api/ads/insights/severities`
  - `GET /api/ads/insights/{insight}`
  - `POST /api/ads/insights/{insight}/apply`
  - `POST /api/ads/insights/{insight}/dismiss`
- Regras de automação:
  - `GET/POST /api/ads/rules`
  - `GET /api/ads/rules/metrics`
  - `GET /api/ads/rules/actions`
  - `GET/PUT/DELETE /api/ads/rules/{rule}`
  - `POST /api/ads/rules/{rule}/toggle`
- Logs de automação:
  - `GET /api/ads/automation/logs`
  - `POST /api/ads/automation/logs/{log}/rollback`
  - `POST /api/ads/automation/logs/{log}/approve`
  - `POST /api/ads/automation/logs/{log}/reject`
- Agente:
  - `POST /api/ads/agent/generate-copy`
  - `POST /api/ads/agent/create-campaign`
  - `GET /api/ads/agent/campaigns/{campaign}/full-report`
  - `GET /api/ads/agent/campaigns/{campaign}/ads`
- Criativos:
  - `GET/POST /api/ads/creatives`
  - `POST /api/ads/creatives/from-url`
  - `GET/PUT/DELETE /api/ads/creatives/{creative}`
  - `GET/POST /api/ads/creatives/{creative}/copies`
- Copies:
  - `GET/POST /api/ads/copies`
  - `GET /api/ads/copies/ctas`
  - `GET /api/ads/copies/hook-types`
  - `GET/PUT/DELETE /api/ads/copies/{copy}`
  - `POST /api/ads/copies/{copy}/approve`
- Knowledge base (Ads):
  - `GET/POST /api/ads/knowledge`
  - `GET /api/ads/knowledge/search`
  - `GET /api/ads/knowledge/insights`
  - `POST /api/ads/knowledge/learn`
  - `GET/PUT/DELETE /api/ads/knowledge/{knowledge}`
- Guardrails:
  - `GET/POST /api/ads/guardrails`
  - `GET /api/ads/guardrails/stats`
  - `POST /api/ads/guardrails/defaults`
  - `GET/PUT/DELETE /api/ads/guardrails/{guardrail}`
  - `POST /api/ads/guardrails/{guardrail}/toggle`
  - `POST /api/ads/guardrails/{guardrail}/test`

Regras/execução:
- `AdsAutomationService` avalia regras por tenant, cria logs, executa ações (pausar/retomar, ajustar orçamento, duplicar adset, criar alerta), e permite **aprovação/rejeição** e **rollback** quando aplicável.

### 18) IA (SDR Agent, Actions, Learning) e integrações externas

#### SDR Agents (feature `sdr_ia`)
Funções:
- CRUD do agente SDR
- ligar/desligar agente
- base de conhecimento (documentos, FAQs, entries textuais)
- instruções por pipeline e regras por estágio/escalation
- ferramentas de teste (test prompt, preview payload)

Rotas:
- `GET/POST /api/sdr-agents`
- `GET/PUT/DELETE /api/sdr-agents/{sdrAgent}`
- `POST /api/sdr-agents/{sdrAgent}/toggle-active`
- documentos:
  - `GET/POST /api/sdr-agents/{sdrAgent}/documents`
  - `DELETE /api/sdr-agents/{sdrAgent}/documents/{document}`
  - `POST /api/sdr-agents/{sdrAgent}/documents/{document}/reprocess`
- FAQs:
  - `GET/POST /api/sdr-agents/{sdrAgent}/faqs`
  - `PUT/DELETE /api/sdr-agents/{sdrAgent}/faqs/{faq}`
- Knowledge entries:
  - `GET/POST /api/sdr-agents/{sdrAgent}/knowledge`
  - `PUT/DELETE /api/sdr-agents/{sdrAgent}/knowledge/{entry}`
- pipelines/regras:
  - `GET /api/sdr-agents/{sdrAgent}/pipelines`
  - `POST /api/sdr-agents/{sdrAgent}/pipelines/sync`
  - `PUT /api/sdr-agents/{sdrAgent}/stage-rules`
  - `PUT /api/sdr-agents/{sdrAgent}/pipeline-instructions`
  - regras por estágio:
    - `GET/POST /api/sdr-agents/{sdrAgent}/rules/stages`
    - `PUT/DELETE /api/sdr-agents/{sdrAgent}/rules/stages/{agentStageRule}`
  - regras de escalação:
    - `GET/POST /api/sdr-agents/{sdrAgent}/rules/escalation`
    - `PUT/DELETE /api/sdr-agents/{sdrAgent}/rules/escalation/{agentEscalationRule}`
- testes:
  - `POST /api/sdr-agents/{sdrAgent}/test-prompt`
  - `GET /api/sdr-agents/{sdrAgent}/preview-payload`

#### Templates de agentes (feature `sdr_ia`)
- `GET /api/agent-templates`
- `GET /api/agent-templates/{agentTemplate}`
- `POST /api/agent-templates/{agentTemplate}/apply`
- `POST /api/agent-templates/{agentTemplate}/create-agent`

#### Agent Actions (ações executáveis pela IA)
Esses endpoints são usados para a IA “tomar ações” no CRM:
- `POST /api/agent-actions/move-stage`
- `POST /api/agent-actions/schedule-appointment`
- `POST /api/agent-actions/get-available-slots`
- `POST /api/agent-actions/qualify-lead`
- `POST /api/agent-actions/schedule-follow-up`
- `POST /api/agent-actions/transfer-to-human`
- `POST /api/agent-actions/list-stages`

#### Agent Learning (feedback, memória, padrões)
Rotas:
- `POST /api/agent-learning/feedback`
- `GET /api/agent-learning/questions/{agentId}`
- `POST /api/agent-learning/questions/{questionId}/review`
- `GET /api/agent-learning/lead-memory/{leadId}`
- `GET /api/agent-learning/patterns/{agentId}`
- `GET /api/agent-learning/stats/{agentId}`

#### Integração via webhooks (n8n → CRM)
- `POST /api/ia/leads/{lead}/update-stage`
- `POST /api/ia/leads/{lead}/update-data`
- `POST /api/ia/leads/{lead}/assign-owner`
- `POST /api/ia/tickets/{ticket}/messages`

#### Integração externa (ERP → CRM)
- `POST /api/external/webhook`

#### Endpoints para Worker Python (fila/orquestração)
- `POST /api/agent/context`
- `POST /api/agent/response`

#### Endpoints internos (microserviço IA → Laravel)
Autenticação via `internal.api` (ex.: `X-Internal-Key`):
- `POST /api/internal/ai-usage` + `/check`
- `POST /api/internal/leads/check` + `/register`
- `POST /api/internal/usage/summary`
- Ads para IA:
  - `GET /api/internal/ads/creatives` + `/{creative}`
  - `GET /api/internal/ads/copies` + `/{copy}`
  - `GET /api/internal/ads/accounts`
  - `POST /api/internal/ads/save-campaign`

---

## Microserviço IA (FastAPI) — funcionalidades

Fonte: `ai-service/main.py` + `ai-service/app/routers/*`.

### SDR Agent (core)
- `POST /agent/run`: executa agente com RAG + memória + decisão e retorna ação/resposta.
- `POST /agent/classify-intent`: classifica intenção.
- `POST /agent/qualify`: qualifica lead.
- `GET /agent/cache/stats`: estatísticas do cache (economia de tokens).
- `GET /agent/health` e `GET /health`: health checks.

Segurança:
- Header `X-API-Key` (validação no router do agente).

### Fila de mensagens (agrupamento/debounce)
- `POST /queue/enqueue`: enfileira mensagem; agrupa por ticket e processa quando:
  - tempo máximo (ex.: 5s), OU
  - fim de intenção, OU
  - tempo mínimo desde última mensagem
- `GET /queue/status`: status geral.
- Debug: `GET /queue/pending/{ticket_id}` e `POST /queue/process/{ticket_id}`.

### Learning (conversas, feedback, memória)
- `POST /learning/process-feedback`: feedback (👍/👎) do usuário.
- `POST /learning/analyze-conversation`: extrai padrões e atualiza memória do lead.
- `POST /learning/detect-question`: detecta FAQ/pergunta frequente.
- `POST /learning/update-lead-memory`: força atualização de memória do lead.
- `GET /learning/stats/{agent_id}`: stats (placeholder/básico).

### Ads Intelligence (IA no microserviço)
Além do módulo Laravel, o Python tem:
- `/ads/analyze-performance`, `/ads/detect-anomalies`, `/ads/generate-recommendations`
- `/ads/agent/*` para criar/otimizar/escalar e gerar variações/copies
- `/orchestrator/*` (chat/execute/create-campaign) para orquestração por comandos

### Ads Learning (aprendizado por conversões/feedback)
Rotas típicas:
- `POST /learning/ads/conversion`
- `POST /learning/ads/feedback`
- `GET /learning/ads/insights/{tenant_id}`
- `GET /learning/ads/patterns/{tenant_id}`
- `GET /learning/ads/creatives/{tenant_id}`
- `POST /learning/ads/learn/{tenant_id}`
- knowledge base:
  - `GET/POST /learning/ads/knowledge/{tenant_id}`
  - `DELETE /learning/ads/knowledge/{tenant_id}/{knowledge_id}`
  - `GET /learning/ads/search/{tenant_id}`

Segurança:
- validação por chave interna (em dev pode liberar sem chave).

---

## Processos assíncronos (Jobs/Queues) e automações

Principais jobs (fonte: `app/Jobs/*`):
- **Atendimento/IA**
  - `ProcessAgentResponse.php` / `ProcessAgentResponseDebounced.php`: processamento da resposta do agente (com debounce)
  - `SaveConversationContext.php`: salvar contexto de conversa
  - `NotifyLearningSystemJob.php`: notificar sistema de aprendizado
  - `ProcessKnowledgeEmbedding.php`: gerar embeddings/indexação (RAG)
  - `ProcessSdrDocument.php`: processamento de documentos do SDR (RAG)
- **CRM**
  - `ProcessLeadImport.php`: importar leads em background
  - `ProcessScheduledTasks.php`: tarefas agendadas
  - `SendToExternalSystemJob.php`: integrações externas
- **Ads Intelligence**
  - `Ads/ProcessAdsAutomationJob.php`: avaliar/rodar automações
  - `Ads/SyncAdMetricsJob.php`: sincronizar métricas

Dependência operacional:
- Worker de fila precisa estar rodando; caso contrário importações e automações não executam.

---

## Tempo real (WebSocket/Broadcast)

- `POST /api/broadcasting/auth`: autenticação de canais privados (Echo/Reverb/Pusher).
- Frontend usa `laravel-echo` + `pusher-js` para:
  - receber mensagens em tempo real no atendimento
  - atualização de status
  - eventos do WhatsApp (QR, connected, etc.)

---

## Super Admin (gestão global)

Rotas de Super Admin (sem escopo de tenant padrão; protegidas por `super_admin`):
- Dashboard: `GET /api/super-admin/dashboard`
- Tenants:
  - `GET/POST /api/super-admin/tenants`
  - `GET/PUT /api/super-admin/tenants/{tenant}`
  - `PUT /api/super-admin/tenants/{tenant}/features`
- Usuários:
  - `GET/POST /api/super-admin/users`
  - `PUT/DELETE /api/super-admin/users/{user}`
- Configurações:
  - `GET /api/super-admin/permissions`
  - `GET /api/super-admin/features`
  - `GET /api/super-admin/plans`
- Logs: `GET /api/super-admin/logs`
- Custos/uso/faturamento:
  - `GET /api/super-admin/costs/dashboard`
  - `GET /api/super-admin/costs/tenants`
  - `GET /api/super-admin/costs/tenants/{tenant}`
  - `PUT /api/super-admin/costs/tenants/{tenant}/quota`
  - `POST /api/super-admin/costs/tenants/{tenant}/quota/reset`
  - `GET /api/super-admin/costs/alerts` + acknowledge/resolve
  - `GET /api/super-admin/costs/billing` + generate/mark-paid
  - `GET /api/super-admin/costs/export`
  - `GET /api/super-admin/costs/pricing`

Rotas adicionais em `/api/admin/*` para gestão de tenants/grupos (admin global).

---

## Fluxos principais (jornadas)

### Fluxo A: Atendimento com SDR IA (WhatsApp/Instagram)
1. Mensagem entra via webhook (WhatsApp/Instagram/Meta).
2. CRM cria/atualiza Lead + Ticket + TicketMessage.
3. Mensagem vai para fila (Redis/Jobs) e/ou microserviço IA.
4. IA responde (com RAG/memória) e pode disparar ações:
   - mover estágio, qualificar lead, agendar, transferir para humano.
5. Resposta é enviada ao canal e exibida em tempo real no frontend.

### Fluxo B: Menu de filas + roteamento + carteirização
1. Lead sem `queue_id` recebe menu (sempre).
2. Resposta do menu roteia para fila.
3. Se autodistribuição ativa, sistema atribui owner por round-robin.
4. Carteirização garante que o lead volte ao mesmo atendente no futuro (por fila).

### Fluxo C: Ads Intelligence (campanhas → leads → conversões → aprendizado)
1. Campanha é criada/gerida (Ads Agent + guardrails + knowledge + automações).
2. Lead entra com UTM (landing page / clique / formulário).
3. Atribuição associa lead → campanha/anúncio (utm_campaign/utm_content).
4. Conversões são registradas via mudanças de estágio (GTM) e valores do lead.
5. Microserviço IA aprende padrões e alimenta knowledge/insights.

---

## O que ainda pode ser refinado neste documento

- Se você me autorizar a rodar `python tools/generate_funcionalidades_md.py`, eu complemento este `.md` com uma **tabela completa e 100% fiel** de todas as rotas de `php artisan route:list --json` (sem risco de faltar nenhum endpoint).


