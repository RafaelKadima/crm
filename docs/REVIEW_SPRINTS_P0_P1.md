# Review pré-merge — Sprints P0+P1 (CRM Omnify)

> Documento pra agente revisor / engenheiro sênior independente avaliar
> 9 branches antes de push pro GitHub e merge na `main`. Todas as
> branches estão **locais**, ainda não pushadas. Repo:
> `/Users/rafael/Desktop/Operacional Help/crm/` (clone de
> `RafaelKadima/crm`).

## TL;DR

Implementação backend completa de um plano P0+P1 derivado de benchmark
contra o ZPRO (CRM comercial de WhatsApp da Comunidade ZDG). Cobre:

1. **Remoção do Whatsmeow** (lib WhatsApp Web reverse-engineered, risco
   de ban Meta) → exclusivo Cloud API.
2. **Baseline de segurança** (HMAC webhooks Meta, 2FA TOTP, security
   headers, AuditLog, SecurityIncident, kill switch de tokens).
3. **RBAC v2** com 35 permission keys + ADMIN_ONLY_ACTIONS whitelist.
4. **Paridade WABA com ZPRO** (pause/resume, queue position visível,
   business hours, fast reply com mídia, send-window de broadcasts,
   OAuth proxy white-label, value/tags/transferência/compartilhado em
   tickets).
5. **Atendimento estruturado** (AutoReply keyword + External AI handoff
   Dialogflow/Dify + StepReply state machine multi-passo).
6. **Observabilidade** (sessions tracking granular, Reverb cluster mode
   prep, indexes performance, ai-service /health real, circuit breaker).

**~5.5k LoC backend novas, 24 migrations, 30+ endpoints REST novos,
8 jobs novos, 7 events Reverb novos.** Lint 100% verde (PHP `php -l`
rodado no container `crm-php` em produção).

**Frontend foi DEFERIDO em todas as sprints** — vai num PR separado.
Backend popula schema; UI consome quando aterrar.

---

## Contexto pro revisor

- **Pasta local:** `/Users/rafael/Desktop/Operacional Help/crm/`
- **Repo GitHub:** `RafaelKadima/crm` (default branch `main`)
- **Domínio prod:** `crm.omnify.center` rodando na VPS `212.85.20.129`
  em `/var/www/crm` com 7 containers Docker (nginx, php-fpm, reverb,
  queue, scheduler, redis, ai-service)
- **Stack:** Laravel 12 + Passport + Reverb (WebSockets) + React 19
  + Vite + Python FastAPI ai-service. PostgreSQL no Supabase (externo).
- **Plano original aprovado:**
  `/Users/rafael/.claude/plans/monte-um-plano-para-snazzy-scroll.md`
  — usa esse documento pra entender intenção por trás de cada sprint
  se algo parecer arbitrário.
- **Pré-deploy runbook:**
  `/Users/rafael/.claude/projects/-Users-rafael-Desktop-Operacional-Help/memory/project_crm_pending_deploys.md`
  — comandos exatos por branch (composer install, migrate, restarts).

---

## As 9 branches em ordem de merge

Cada branch parte da anterior — mergear na `main` exige sequência
estrita. Conflitos só quando refazendo via `rebase main`.

| # | Branch | Commit | Diff | Resumo |
|---|---|---|---|---|
| 1 | `chore/remove-whatsmeow` | `9db9302` | -4205 / +45 | Remove diretório `whatsapp-api/` (Go service Whatsmeow), `InternalWhatsAppWebhookController`, `InternalWhatsAppService`, `QRCodeModal.tsx`, 6 hooks frontend, container do compose. Pre-flight em prod confirmou só 1 channel `internal` (tenant teste do Rafael, 1 ticket, 1 msg) — desativado antes da remoção. |
| 2 | `feat/security-p0-block-1` | `2934099` | +309 | HMAC validation `X-Hub-Signature-256` em webhooks Meta (`VerifyMetaWebhookSignature` middleware), security headers nginx + Laravel (HSTS+CSP+X-Frame+nosniff+Referrer+Permissions), `tokenVersion`/`tokens_invalidated_at` no User com observer auto-invalidando em troca de senha. |
| 3 | `feat/security-p0-block-2` | `1197054` | +1125 | `audit_logs` table (append-only, before/after JSONB) + `Auditable` trait aplicado em 7 models críticos. `security_incidents` + `SecurityIncidentService` integrado em 4 pontos. 2FA TOTP via `pragmarx/google2fa` + `bacon/bacon-qr-code` (composer.json mexido). |
| 4 | `feat/rbac-v2-custom-profiles` | `ddc589d` | +595 | `App\Support\CustomPermissions` catálogo de 35 keys. `custom_profiles` table + `users.custom_profile_id` + flag `custom_profile_enabled` (default false → comportamento legado RoleEnum preservado). Trait `HasCustomPermissions` com fallback. CRUD endpoints. |
| 5 | `feat/waba-pause-queue-hours` | `bf1961f` | +722 | Pause/resume tickets (`paused_at`, `pause_reason`, `paused_by`) + `ticket_pause_logs` + service idempotente + 3 endpoints. Queue position visível (`RecalculateQueuePositionsJob` no scheduler 1min). Business hours por queue (JSONB com slots/dia, helper `Queue::isOpen(?Carbon)`). FastReply com mídia. |
| 6 | `feat/waba-broadcast-oauth-tickets` | `1ca04ca` | +605 | Send-window em broadcasts (TIME + timezone + `respect_business_hours`) + `ProcessBroadcastJob` chama `release()` quando fora da janela. Resume de broadcasts pausados. OAuth proxy schema (`webhook_origin`, `oauth_proxy_enabled`, `webhook_needs_revalidation`). Ticket value DECIMAL + transfer log. Tags polimórficas. Ticket compartilhado. |
| 7 | `feat/atendimento-autoreply-handoff` | `91ba39a` | +910 | `auto_replies` table com keywords + 3 match types + skip_ai toggle. AutoReplyService injeta antes da IA no webhook handler. Adapter pattern (`ExternalAiAdapter` interface, `DialogflowAdapter`, `DifyAdapter`) com `handleInbound` que usa hand-off semântico (`shouldHandoffHuman` desliga handoff). |
| 8 | `feat/atendimento-stepreply-workflows` | `26a7687` | +1115 | State machine pra workflows multi-passo. 3 tabelas (`step_replies`, `step_reply_steps`, `step_reply_executions`). 6 step types (send_message/wait_input/condition/branch/handoff_human/end). `StepReplyEngine` com MAX_STEPS_PER_RUN=50 cap, `CheckStepReplyTimeoutsJob` no scheduler. |
| 9 | `feat/observability-sessions` | `cacae4a` | +529 | `user_sessions` granular (revoga 1 device sem matar outros) + middleware com batched updates (1x/min via Cache). `config/reverb.php` com scaling Redis (default off). 10 indexes phase 2 (parciais com WHERE deleted_at IS NULL). ai-service /health real (OpenAI key, Redis ping, Tavily, Groq) + healthcheck Docker. Circuit breaker no `PythonAgentService` (5 falhas/60s → cooldown 30s). |

**Total:** ~5.5k LoC novas backend, 24 migrations, 30+ endpoints,
8 jobs, 7 events Reverb, 100% lint green PHP+Python.

---

## Schema changes (24 migrations)

Todas idempotentes via `IF NOT EXISTS` ou `CREATE` em tabelas novas;
todas têm `down()` reversível.

### Sprint 0 (drop)
- `2026_05_06_000001_remove_whatsmeow_columns_from_channels` — drop
  `provider_type` + `internal_session_id` + index composto

### Sprint 1
- `2026_05_06_000002_add_token_version_to_users_table` — `token_version`
  (uint default 0) + `tokens_invalidated_at` (timestamp nullable)

### Sprint 2 (3)
- `2026_05_06_000003_create_audit_logs_table` — UUID PK, append-only,
  index composto `(tenant_id, model_type, model_id, created_at)`
- `2026_05_06_000004_create_security_incidents_table` — append-only,
  3 indexes
- `2026_05_06_000005_add_two_factor_to_users_table` — secret/recovery
  encrypted (cast); confirmed_at timestamp

### Sprint 3 (2)
- `2026_05_06_000006_create_custom_profiles_table` — soft-delete,
  unique tenant+name
- `2026_05_06_000007_add_custom_profile_to_users_table` — FK + flag

### Sprint 4 (5)
- `2026_05_06_000008_add_pause_fields_to_tickets_table`
- `2026_05_06_000009_create_ticket_pause_logs_table` — append-only
- `2026_05_06_000010_add_queue_position_to_tickets_table`
- `2026_05_06_000011_add_response_time_and_business_hours_to_queues_table`
- `2026_05_06_000012_add_media_to_quick_replies_table`

### Sprint 5 (5)
- `2026_05_06_000013_add_send_window_to_broadcasts_table`
- `2026_05_06_000014_add_oauth_proxy_to_meta_integrations_table`
- `2026_05_06_000015_add_value_and_transfer_to_tickets_table`
- `2026_05_06_000016_create_tags_and_taggables_tables` — polimórfico
- `2026_05_06_000017_create_ticket_shared_users_table` — composite PK

### Sprint 6 (2)
- `2026_05_06_000018_create_auto_replies_table` — soft-delete
- `2026_05_06_000019_add_external_ai_to_channels_and_tickets`

### Sprint 7 (3)
- `2026_05_06_000020_create_step_replies_table` — soft-delete
- `2026_05_06_000021_create_step_reply_steps_table` — unique order
- `2026_05_06_000022_create_step_reply_executions_table`

### Sprint 8 (2)
- `2026_05_06_000023_create_user_sessions_table`
- `2026_05_06_000024_add_performance_indexes_phase_2` — 10 indexes
  (CREATE INDEX IF NOT EXISTS + try/catch silencioso)

---

## Decisões arquiteturais que merecem 2nd opinion

### 1. Whatsmeow removido — exclusivo Cloud API

**Decisão:** abandonar Whatsmeow (Go reverse-engineered) e ficar 100%
Cloud API oficial.

**Trade-off:** Cloud API tem custo por conversa marketing
($0.005-0.01); Whatsmeow é grátis. Por outro lado, Whatsmeow tem
risco de ban Meta crescente em escala comercial.

**Risco do path escolhido:** clientes que precisam de número não-WABA
(uso pessoal, evitar fee Meta) ficam fora. Aceito.

**Ponto de revisão:** confirmar que pre-flight `SELECT COUNT(*) FROM
channels WHERE provider_type='internal' AND is_active=true` em prod
realmente retornou só o canal teste. Já feito em
`/Users/rafael/.claude/projects/-Users-rafael-Desktop-Operacional-Help/memory/project_crm.md`.

### 2. Auditable trait NÃO aplicado em Ticket

**Decisão:** trait `Auditable` aplicado em User, Tenant, Lead, Channel,
MetaIntegration, WhatsAppTemplate, Broadcast, CustomProfile, Tag,
StepReply, AutoReply.

**Excluído explicitamente:** Ticket. Razão: alto volume de updates
(toda mensagem nova faz `tickets.updated_at = now()` → audit log entry
desnecessário a cada msg).

**Ponto de revisão:** auditar mudanças importantes do Ticket
(status_change, assignment_change, pause/resume) deve ser feito
**explicitamente** nos services correspondentes (`TicketPauseService`
já não usa AuditLog — só TicketPauseLog dedicado). Está OK ou queremos
audit centralizado também pra Ticket via field whitelist
(`auditOnlyFields = ['status', 'assigned_user_id', 'paused_at']`)?

### 3. Custom profiles — fallback pra RoleEnum legado

**Decisão:** flag `custom_profile_enabled` default `false`. Quando
false, `HasCustomPermissions::hasPermission()` cai no
`roleHasPermission()` legado (`RoleEnum::ADMIN` permite tudo,
GESTOR/VENDEDOR/MARKETING usam defaults conservadores).

**Trade-off:** evita breaking change em users existentes vs. duas
fontes de verdade pra autorização.

**Ponto de revisão:** o fallback `roleHasPermission()` retorna
`CustomPermissions::defaults()[$key]` pra GESTOR — isso significa
gestor herda os defaults configurados pelo catálogo (que mudam
quando ajustamos defaults). É intencional, mas vale revisar se
alguma key do catálogo foi marcada `default: true` e GESTOR não
deveria ter (`tickets_create` é true, OK; `broadcasts_create`
é false, OK).

### 4. Pipeline do webhook reordenado

**Antes:** queue routing → IA interna.

**Agora:**
1. Queue routing
2. **StepReply engine** (preempta tudo se ativo)
3. AutoReply keyword (preempta IA se `skip_ai_after_match=true`)
4. External AI (Dialogflow/Dify)
5. AI agente interno

**Ponto de revisão:** ordem é correta? StepReply em primeiro lugar
garante que fluxo guiado tem prioridade absoluta — uma vez começado,
todo input vai pra engine. AutoReply só dispara se não tiver flow
running. External AI só se nada acima respondeu. Faz sentido?

### 5. Circuit breaker manual no PythonAgentService

**Decisão:** implementação custom (5 falhas em 60s → cooldown 30s)
via Cache Redis em vez de adicionar pacote
(`kbruton/laravel-circuit-breaker`).

**Trade-off:** menos código pra revisar, sem dep externa, mas perde
half-open state machine (todo cooldown é "absoluto" — quando expira,
tenta de novo direto).

**Ponto de revisão:** Cache driver precisa ser `redis` (não `array`)
em CLI workers pra estado ser compartilhado. Está em `.env` de prod?
Confirmar.

### 6. OAuth proxy white-label só preparou schema

**Decisão:** Sprint 5 adiciona `webhook_origin`, `oauth_proxy_enabled`,
`oauth_redirect_uri`, `webhook_needs_revalidation` em `meta_integrations`
mas **NÃO refatorou** `MetaOAuthService` pra escolher credentials
baseado nessas flags.

**Status:** schema preparado, código que usa schema não. Deploy seguro
(default `webhook_origin='own_app'` mantém comportamento atual), mas
**não ativar `oauth_proxy_enabled=true` em tenants** até follow-up
aterrar.

**Ponto de revisão:** confirmar que essa separação é OK. Risco zero
hoje, mas se alguém configurar via SQL direto e ativar a flag, sistema
não vai fazer nada (silent failure em vez de erro). Talvez adicionar
guard no `flagForRevalidation()` pra avisar?

### 7. AutoReply regex sandboxing fraco

**Decisão:** regex match usa `@preg_match` (silencia warnings de
padrões malformados).

**Risco:** padrões com backtracking exponencial (ex: `(a+)+$` num
texto malicioso) podem travar o worker indefinidamente —
`pcre.backtrack_limit` do php.ini protege parcialmente, mas não é
timeout duro.

**Ponto de revisão:** AutoReply é configurada por admin do tenant
(não por end-user), então vetor é limitado. Mas vale validação no
controller pra rejeitar padrões obviamente catastróficos? Ou aceitamos
o risco?

### 8. StepReply update usa "replace strategy"

**Decisão:** `StepReplyController::update` deleta todos os steps
e recria. FK com `SET NULL` em `step_reply_executions.current_step_id`.

**Risco:** execução running cujo `current_step_id` aponta pra step
deletado vai ter `current_step_id = NULL` na próxima request →
`handleInbound` retorna `false` (sem step válido) → cliente fica
silente.

**Ponto de revisão:** vale forçar verificação de "tem execução
running?" antes de permitir update? Ou avisar via warning no response
("X execuções ativas serão interrompidas")? Hoje só anotei como
recomendação operacional na memória.

---

## Pontos de risco específicos pra revisar com atenção

### 🔴 Alto — pode causar incidente em prod

1. **HMAC validation Meta webhook** — se `META_APP_SECRET` não estiver
   no `.env` de produção, **todos webhooks Meta retornam 500 + Meta
   começa a retry → eventualmente desabilita o webhook depois de N
   falhas.** Verificar antes de mergear o block-1.

2. **Healthcheck do ai-service em modo strict** — sem
   `OPENAI_API_KEY`/Redis acessível, retorna 503 → container em
   `restart: unless-stopped` entra em **restart loop** → derruba
   serviços que dependem dele. Verificar `.env` antes de rebuild
   ai-service.

3. **`composer install` antes de migrate na Sprint 2** — o
   `AppServiceProvider` registra observer e trait que usa
   `pragmarx/google2fa`. Se rodar migrate primeiro, autoload pode dar
   `Class not found` durante boot. Ordem: composer → migrate → optimize.

4. **Indexes phase 2 sem CONCURRENTLY** — `CREATE INDEX IF NOT
   EXISTS` (não CONCURRENTLY) bloqueia writes durante criação.
   Em tabelas pequenas (hoje) tudo bem. Quando crescer,
   rodar manualmente com CONCURRENTLY antes do migrate.

### 🟡 Médio — vale double-check

5. **TenantScope global em todos models críticos** — `BelongsToTenant`
   trait. Se algum query usar `withoutGlobalScopes()` por engano,
   pode vazar dados entre tenants. Audit nas mudanças desta sprint:
   `MetaAuthController::callback` usa `withoutGlobalScopes()`
   (legítimo — OAuth callback ainda não tem tenant resolvido).

6. **`Gate::before` super_admin com SecurityIncident dedup por
   request** — primeira chamada `Gate::check` num request com super
   admin grava SecurityIncident, demais não. Se o request envolver
   queue job que muda contexto, pode perder events. Aceito por agora.

7. **2FA pending session em Cache (Redis)** — TTL 5min. Se Redis cair
   durante login com 2FA, sessão pending some → user precisa logar
   de novo. Aceito (Redis é hard dep do sistema todo).

### 🟢 Baixo — anotado, sem ação imediata

8. **Adapters externos (Dialogflow/Dify) síncronos** — bloqueiam
   request enquanto fazem HTTP call (timeout 15-20s). Cliente
   WhatsApp pode notar latência. Mover pra async é follow-up.

9. **Branch step do StepReply usa texto numerado** em vez de
   Interactive Lists nativas WABA. UX inferior. Follow-up.

10. **Reverb scaling default `false`** — broadcasts só funcionam em 1
    instância. Quando escalar, flip env var.

---

## Dependências entre branches (rebase order)

```
main
  └─ chore/remove-whatsmeow                         (Sprint 0)
       └─ feat/security-p0-block-1                  (Sprint 1)
            └─ feat/security-p0-block-2             (Sprint 2)
                 └─ feat/rbac-v2-custom-profiles    (Sprint 3)
                      └─ feat/waba-pause-queue-hours              (Sprint 4)
                           └─ feat/waba-broadcast-oauth-tickets   (Sprint 5)
                                └─ feat/atendimento-autoreply-handoff       (Sprint 6)
                                     └─ feat/atendimento-stepreply-workflows (Sprint 7)
                                          └─ feat/observability-sessions    (Sprint 8)
```

Conflitos esperados ao mergear: nenhum dentro da cadeia (já partem
em sequência). Conflito **possível** se `main` recebeu commits no
mesmo arquivo desde que branch 1 partiu — `git log main` mostra
último commit `256ee1f`, então sem conflito ainda.

---

## Diferidos — fora do escopo deste batch

Itens conhecidos que ficaram pra próximo lote (nada quebra sem eles):

### Frontend (Sprints 1.4 + 1.5 + UI das 3-7)
- **Sprint 1.4:** DOMPurify wrapper em `frontend/src/lib/sanitize.ts`
  + uso em renders de message body
- **Sprint 1.5:** encryption client-side de senha (CryptoJS AES com
  tenant key) + endpoint público `GET /api/auth/encryption-key`
- **UI Custom Profiles** (Sprint 3): `frontend/src/pages/settings/
  CustomProfiles.tsx` + hook `useHasPermission(key)` + `<Can>` componente
- **UI pause/queue/share/value/tags** (Sprints 4+5): TicketHeader
  com botões, badge de queue position, dialog de share, inline edit
  de value
- **UI auto-reply / step-reply** (Sprints 6+7): pages de gerenciamento
  + builder list-based com drag-drop (`react-beautiful-dnd` já em
  uso no Pipeline). ChatFlow visual com ReactFlow é Phase 2.
- **UI sessões ativas** (Sprint 8): page em settings com lista
  revogável

### Backend follow-ups
- **OAuth proxy refactor (Sprint 5):** `MetaOAuthService` precisa
  escolher credentials por `webhook_origin`. Schema preparado.
- **Transfer logging integration (Sprint 5):** `LeadTransferService`
  precisa popular `transferred_from_user_id`/`transferred_at`/
  `transfer_reason` quando transferência acontece.
- **Dialogflow token refresh (Sprint 6):** `service_account_token`
  expira 1h — job que faz JWT signing + token exchange + cache.
- **WABA Interactive Lists (Sprint 7):** mapear branch step do
  StepReply pra API de listas interativas (botões clicáveis).
- **StepReply on_timeout_step (Sprint 7):** estender schema
  pra suportar fallback step quando wait_input expira.

---

## Pré-deploy checklist por branch (resumo)

Detalhe completo em `/Users/rafael/.claude/projects/-Users-rafael-
Desktop-Operacional-Help/memory/project_crm_pending_deploys.md`.

| Branch | composer? | migrate? | restart? | env vars novos? |
|---|---|---|---|---|
| Sprint 0 | não | sim (drop) | rebuild compose | — |
| Sprint 1 | não | sim (1) | nginx reload + php | confirma `META_APP_SECRET` |
| Sprint 2 | **SIM** | sim (3) | php+queue+scheduler+reverb | — |
| Sprint 3 | não | sim (2) | php | — |
| Sprint 4 | não | sim (5) | php+scheduler+queue+reverb | — |
| Sprint 5 | não | sim (5) | php+queue | — |
| Sprint 6 | não | sim (2) | php+queue | — |
| Sprint 7 | não | sim (3) | php+scheduler+queue | — |
| Sprint 8 | não | sim (2) | rebuild ai-service + php+reverb | opcional `REVERB_SCALING_ENABLED` |

**Ordem dentro da Sprint 2 (importante):** `composer install` →
`migrate` → `optimize` → restart workers. Se invertido, observer da
Sprint 2 vai dar `Class \PragmaRX\Google2FA\Google2FA not found` no
boot.

---

## Smoke tests sugeridos pós-deploy

### Segurança (Sprints 1+2)
```bash
# HMAC inválido deve retornar 401
curl -X POST https://crm.omnify.center/api/webhooks/whatsapp \
  -d '{}' -H 'X-Hub-Signature-256: sha256=invalid'
# expect: 401

# Headers de segurança
curl -I https://crm.omnify.center
# expect: Strict-Transport-Security, X-Frame-Options: DENY, etc

# SecurityIncident após HMAC inválido (rodar SQL)
SELECT * FROM security_incidents WHERE type='invalid_webhook_signature'
  ORDER BY created_at DESC LIMIT 1;
# expect: 1 linha recente
```

### 2FA (Sprint 2)
```bash
# Habilitar pra um user de teste, fazer login, verificar pending session
# manual via Postman/Insomnia
```

### RBAC (Sprint 3)
```bash
# GET /api/auth/permissions deve retornar 35 keys + flags
# GET /api/custom-profiles/catalog deve listar PERMISSIONS + ADMIN_ONLY_ACTIONS
```

### Pause/Queue (Sprint 4)
```bash
# Pausar ticket → audit log + Reverb event
# Verificar scheduler:
docker logs crm-scheduler --tail 50 | grep RecalculateQueuePositions
# expect: rodando a cada minuto
```

### AutoReply (Sprint 6)
```bash
# Criar AutoReply via API com keyword "preço"
# Enviar "qual o preço?" pelo WhatsApp test number
# expect: resposta automática + entry em audit_logs (Auditable trait)
```

### StepReply (Sprint 7)
```bash
# Criar flow de 3 steps via API: send_message + wait_input + end
# Trigger via keyword
# expect: execução row em step_reply_executions com status=completed
docker logs crm-scheduler --tail 50 | grep CheckStepReplyTimeouts
# expect: rodando a cada minuto
```

### Sessions (Sprint 8)
```bash
# Login em 2 browsers diferentes
# GET /api/auth/sessions → 2 entries
# Revoke 1 → próximo request do device revogado retorna 401
# Healthcheck ai-service:
docker exec crm-ai-service curl -i http://127.0.0.1:8001/health
# expect: 200 + status:healthy ou degraded
```

---

## Perguntas pro revisor

1. **Auditable em Ticket** (decisão #2 acima): manter excluído ou
   adicionar audit explícito de campos selecionados via observer
   custom?

2. **OAuth proxy** (decisão #6): o approach de "schema preparado +
   código pendente" é confortável ou prefere fazer tudo numa só
   sprint mesmo que demore mais?

3. **Circuit breaker custom** (decisão #5): adicionar pacote
   `kbruton/laravel-circuit-breaker` pra ter half-open state machine
   ou manter implementação custom?

4. **AutoReply regex sandbox** (risco #7): adicionar validação no
   controller pra rejeitar padrões com backtracking suspect ou
   aceitar risco (admin-only configuration)?

5. **StepReply update strategy** (risco #8): bloquear update quando
   há execuções running ou só avisar via warning na response?

6. **Frontend timing**: prefere mergear backend agora e fazer frontend
   depois (UI fica invisível), OU acumular tudo num PR só (10x maior
   pra revisar mas estrutura completa)?

---

## Como revisar (se for Claude/agente automático)

```
1. Ler este documento inteiro
2. git log --oneline main..feat/observability-sessions  # ver os 9 commits
3. Pra cada branch, ler o commit message (são detalhados)
4. Pegar 2-3 arquivos críticos por branch e ler integralmente:
   - Sprint 2: app/Traits/Auditable.php, app/Http/Middleware/VerifyMetaWebhookSignature.php, app/Services/TwoFactorService.php
   - Sprint 3: app/Support/CustomPermissions.php, app/Traits/HasCustomPermissions.php
   - Sprint 7: app/Services/StepReplyEngine.php (564 linhas — core do sprint)
   - Sprint 8: app/Services/AI/PythonAgentService.php (circuit breaker), config/reverb.php
5. Validar respostas pras 6 perguntas acima
6. Apontar qualquer issue de segurança, performance ou correctness
   que tenha passado batido
7. Recomendar ordem de merge (estrita conforme acima ou diferente?)
```

---

## Comandos úteis pro revisor

```bash
# Ver todas as branches locais com commit
git log --all --oneline --decorate | head -15

# Ver diff de uma sprint específica
git diff main..feat/security-p0-block-2 --stat

# Ver código completo de um arquivo numa branch
git show feat/atendimento-stepreply-workflows:app/Services/StepReplyEngine.php

# Ver diff só de migrations
git diff main..feat/observability-sessions -- 'database/migrations/*'
```

---

**Status atual:** todas branches locais, lint 100% verde, nada
pushado. Decisão pendente: aguardando revisão deste doc antes de
push + PR + merge.
