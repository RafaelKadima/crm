# 🤖 Guia do Agente - MCP Servers do CRM

> **LEIA ESTE ARQUIVO ANTES DE EXECUTAR QUALQUER TAREFA**
> Este documento descreve todos os MCP Servers disponíveis no projeto CRM e quando utilizá-los.

---

## 📋 Índice

1. [Visão Geral do Projeto](#visão-geral-do-projeto)
2. [Arquitetura de MCP Servers](#arquitetura-de-mcp-servers)
3. [Guia de Uso por Cenário](#guia-de-uso-por-cenário)
4. [Referência Completa dos MCP Servers](#referência-completa-dos-mcp-servers)
5. [Fluxos de Trabalho Comuns](#fluxos-de-trabalho-comuns)

---

## 🎯 Visão Geral do Projeto

O CRM é um sistema **multitenant** desenvolvido em **Laravel 11** com as seguintes características:

- **Backend**: Laravel 11
- **Banco de Dados**: PostgreSQL (Row Level Multitenancy com `tenant_id`)
- **Cache/Filas**: Redis
- **Storage**: Supabase
- **Automações/IA**: n8n
- **Planos**: Básico, IA SDR, Enterprise

### Módulos Principais
- Tenants (empresas)
- Usuários, Times e Permissões (RBAC)
- Canais (WhatsApp, Instagram, Webchat)
- Leads e Contatos
- Funil/Kanban (Pipelines e Stages)
- Tickets e Conversas
- IA SDR / Agentes Inteligentes
- Distribuição Round-Robin
- Integrações Externas (ERP, sistemas de vendas)
- Relatórios e Dashboards

---

## 🏗️ Arquitetura de MCP Servers

```
┌───────────────────────────────────────────────────────────────────┐
│                    MCP SERVERS DO CRM (9 total)                   │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                      LARAVEL (30 tools)                     │ │
│  │  Artisan, Migrations, Make, Cache, Queue, Scheduler,        │ │
│  │  Tinker, Composer - TUDO EM UM                              │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                        CRM (35 tools)                       │ │
│  │  API REST: Leads, Tickets, Contatos, Pipelines,             │ │
│  │  Relatórios, IA, Webhooks, Helpers                          │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  POSTGRES   │  │    REDIS    │  │  SUPABASE   │              │
│  │   (banco)   │  │   (cache)   │  │  (storage)  │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │     N8N     │  │     GIT     │  │   DOCKER    │              │
│  │ (webhooks)  │  │ (versionam) │  │ (containers)│              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                   │
│  ┌─────────────┐                                                 │
│  │     FS      │                                                 │
│  │  (arquivos) │                                                 │
│  └─────────────┘                                                 │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

---

## 🎮 Guia de Uso por Cenário

### 📦 Quando preciso trabalhar com LARAVEL

| Tarefa | Ferramenta | Exemplo |
|--------|------------|---------|
| Rodar migrations | `mcp_laravel_laravel_migrate` | - |
| Criar model completo | `mcp_laravel_laravel_make_model` | `{ name: "Lead" }` |
| Criar controller API | `mcp_laravel_laravel_make_controller` | `{ name: "LeadController" }` |
| Criar migration | `mcp_laravel_laravel_make_migration` | `{ name: "create_leads_table" }` |
| Criar event | `mcp_laravel_laravel_make_event` | `{ name: "LeadStageChanged" }` |
| Criar listener | `mcp_laravel_laravel_make_listener` | `{ name: "RegisterActivity" }` |
| Criar job | `mcp_laravel_laravel_make_job` | `{ name: "SendToERP" }` |
| Rodar seeds | `mcp_laravel_laravel_db_seed` | - |
| Limpar caches | `mcp_laravel_laravel_optimize_clear` | - |
| Listar rotas | `mcp_laravel_laravel_route_list` | - |
| Testar código PHP | `mcp_laravel_laravel_tinker` | `{ code: "User::count()" }` |
| Processar job da fila | `mcp_laravel_laravel_queue_work` | - |
| Listar jobs falhos | `mcp_laravel_laravel_queue_failed` | - |
| Executar scheduler | `mcp_laravel_laravel_schedule_run` | - |
| Instalar pacotes | `mcp_laravel_laravel_composer_require` | `{ package: "laravel/sanctum" }` |
| Comando genérico | `mcp_laravel_laravel_artisan` | `{ command: "inspire" }` |

### 🌐 Quando preciso trabalhar com a API REST do CRM

| Tarefa | Ferramenta | Parâmetros |
|--------|------------|------------|
| Fazer login | `mcp_crm_crm_login` | `email`, `password` |
| Listar leads | `mcp_crm_crm_leads_list` | `token`, `status`, `search` |
| Criar lead | `mcp_crm_crm_leads_create` | `token`, `contact_name`, `contact_phone`, `pipeline_id` |
| Mover lead no Kanban | `mcp_crm_crm_leads_update_stage` | `token`, `id`, `stage_id` |
| Transferir lead | `mcp_crm_crm_leads_assign` | `token`, `id`, `owner_id` |
| Listar tickets | `mcp_crm_crm_tickets_list` | `token`, `status` |
| Enviar mensagem | `mcp_crm_crm_tickets_send_message` | `token`, `id`, `message` |
| Fechar ticket | `mcp_crm_crm_tickets_close` | `token`, `id`, `result` |
| IA atualizar estágio | `mcp_crm_crm_ia_update_stage` | `token`, `lead_id`, `stage_id` |
| IA distribuir lead | `mcp_crm_crm_ia_assign_owner` | `token`, `lead_id`, `user_id` |
| Relatório funil | `mcp_crm_crm_report_funnel` | `token`, `pipeline_id` |
| Relatório IA | `mcp_crm_crm_report_ia` | `token` |
| Testar Round-Robin | `mcp_crm_crm_testar_distribuicao` | `leads`, `vendedores` |
| Simular WhatsApp | `mcp_crm_crm_simular_mensagem_whatsapp` | `nome`, `origem`, `produto` |

### ⚡ Quando preciso trabalhar com USO DE IA (Unidades)

| Tarefa | Ferramenta | Parâmetros |
|--------|------------|------------|
| Resumo de uso | `mcp_crm_crm_usage_summary` | `token` |
| Uso diário | `mcp_crm_crm_usage_daily` | `token`, `days` |
| Uso por modelo | `mcp_crm_crm_usage_by_model` | `token`, `start_date`, `end_date` |
| Verificar limites | `mcp_crm_crm_usage_limits` | `token` |
| Calcular excedente | `mcp_crm_crm_usage_overage` | `token` |
| Estimar uso | `mcp_crm_crm_usage_estimate` | `token`, `leads_per_month`, `messages_per_lead` |

### 📦 Quando preciso trabalhar com PACOTES DE IA

| Tarefa | Ferramenta | Parâmetros |
|--------|------------|------------|
| Ver pacotes disponíveis | `mcp_crm_crm_packages_available` | `token` |
| Listar compras | `mcp_crm_crm_packages_purchases` | `token`, `status` |
| Comprar pacote | `mcp_crm_crm_packages_purchase` | `token`, `package_type`, `package_id` |
| Confirmar pagamento | `mcp_crm_crm_packages_confirm` | `token`, `purchase_id`, `payment_reference` |
| Ver planos | `mcp_crm_crm_plans_list` | `token` |

### 🗄️ Quando preciso trabalhar com BANCO DE DADOS

| Tarefa | Ferramenta | Exemplo |
|--------|------------|---------|
| Executar SQL | `mcp_postgres_postgres_query` | `{ sql: "SELECT * FROM tenants" }` |

### 🔴 Quando preciso trabalhar com CACHE (Redis)

| Tarefa | Ferramenta | Parâmetros |
|--------|------------|------------|
| Testar conexão | `mcp_redis_redis_ping` | - |
| Buscar valor | `mcp_redis_redis_get` | `key` |
| Salvar valor | `mcp_redis_redis_set` | `key`, `value`, `ttl` |
| Remover chave | `mcp_redis_redis_del` | `key` |
| Listar chaves | `mcp_redis_redis_keys` | `pattern` |

### 🤖 Quando preciso trabalhar com IA/AUTOMAÇÕES (n8n)

| Tarefa | Ferramenta | Parâmetros |
|--------|------------|------------|
| Disparar webhook | `mcp_n8n_n8n_run` | `url`, `data` |

### 🔀 Quando preciso trabalhar com GIT

| Tarefa | Ferramenta | Parâmetros |
|--------|------------|------------|
| Ver status | `mcp_git_git_status` | - |
| Fazer commit | `mcp_git_git_commit` | `message` |
| Criar branch | `mcp_git_git_create_branch` | `name` |
| Fazer merge | `mcp_git_git_merge` | `source` |
| Fazer push | `mcp_git_git_push` | - |

### 🐳 Quando preciso trabalhar com DOCKER

| Tarefa | Ferramenta | Parâmetros |
|--------|------------|------------|
| Listar containers | `mcp_docker_docker_list` | - |
| Iniciar container | `mcp_docker_docker_start` | `name` |
| Parar container | `mcp_docker_docker_stop` | `name` |

### 📂 Quando preciso trabalhar com ARQUIVOS

| Tarefa | Ferramenta | Parâmetros |
|--------|------------|------------|
| Ler arquivo | `mcp_fs_fs_read_file` | `path` |
| Escrever arquivo | `mcp_fs_fs_write_file` | `path`, `content` |
| Listar diretório | `mcp_fs_fs_list_dir` | `path` |

---

## 📚 Referência Completa dos MCP Servers

### 1. `laravel` (Laravel Full)
**Arquivo**: `tools/laravel-full-mcp.cjs`
**Propósito**: Todos os comandos Laravel em um único MCP

**Ferramentas disponíveis (30)**:
```
MIGRATIONS:
- laravel.migrate
- laravel.migrate_fresh
- laravel.migrate_rollback
- laravel.migrate_status

MAKE (Criação):
- laravel.make_model (cria com -a: migration, factory, seeder, controller)
- laravel.make_controller (cria com --api)
- laravel.make_migration
- laravel.make_seeder
- laravel.make_request
- laravel.make_resource
- laravel.make_event
- laravel.make_listener (cria com --queued)
- laravel.make_job
- laravel.make_middleware
- laravel.make_policy

SEEDS E CACHE:
- laravel.db_seed
- laravel.optimize_clear
- laravel.route_list

TESTES E UTILITÁRIOS:
- laravel.test
- laravel.serve
- laravel.artisan (comando genérico)

QUEUE (Filas):
- laravel.queue_work
- laravel.queue_failed
- laravel.queue_retry

SCHEDULER:
- laravel.schedule_run
- laravel.schedule_list

TINKER:
- laravel.tinker

COMPOSER:
- laravel.composer_install
- laravel.composer_update
- laravel.composer_require
```

---

### 2. `crm` (CRM Full)
**Arquivo**: `tools/crm-full-mcp.cjs`
**Propósito**: API REST do CRM + Helpers + Uso de IA

**Ferramentas disponíveis (46)**:
```
AUTENTICAÇÃO:
- crm.login
- crm.me
- crm.logout

LEADS:
- crm.leads_list
- crm.leads_show
- crm.leads_create
- crm.leads_update_stage
- crm.leads_assign

CONTATOS:
- crm.contacts_list
- crm.contacts_show
- crm.contacts_create

TICKETS:
- crm.tickets_list
- crm.tickets_show
- crm.tickets_send_message
- crm.tickets_close

PIPELINES:
- crm.pipelines_list
- crm.stages_list

IA (n8n → CRM):
- crm.ia_update_stage
- crm.ia_assign_owner
- crm.ia_send_message

RELATÓRIOS:
- crm.report_funnel
- crm.report_productivity
- crm.report_ia
- crm.report_distribution

USO DE IA (Unidades):
- crm.usage_summary
- crm.usage_daily
- crm.usage_by_model
- crm.usage_limits
- crm.usage_overage
- crm.usage_estimate

PACOTES DE IA:
- crm.packages_available
- crm.packages_purchases
- crm.packages_purchase
- crm.packages_confirm
- crm.plans_list

WEBHOOK:
- crm.webhook_external

HELPERS:
- crm.testar_distribuicao
- crm.simular_mensagem_whatsapp
- crm.auditar_multitenancy
```

---

### 3. `postgres`
**Arquivo**: `tools/postgres-mcp.cjs`
- `postgres.query` - Executa SQL

### 4. `redis`
**Arquivo**: `tools/redis-mcp.cjs`
- `redis.ping`, `redis.get`, `redis.set`, `redis.del`, `redis.keys`

### 5. `supabase`
**Arquivo**: `tools/supabase-mcp.cjs`
- `supabase.query`

### 6. `n8n`
**Arquivo**: `tools/n8n-mcp.cjs`
- `n8n.run`

### 7. `git`
**Arquivo**: `tools/git-mcp.cjs`
- `git.status`, `git.commit`, `git.create_branch`, `git.merge`, `git.push`

### 8. `docker`
**Arquivo**: `tools/docker-mcp.cjs`
- `docker.list`, `docker.start`, `docker.stop`, `docker.run`

### 9. `fs`
**Arquivo**: `tools/fs-mcp.cjs`
- `fs.read_file`, `fs.write_file`, `fs.list_dir`

---

## 🔄 Fluxos de Trabalho Comuns

### Fluxo 1: Criar nova funcionalidade

```javascript
// 1. Criar branch
mcp_git_git_create_branch({ name: "feature/leads" })

// 2. Criar model completo
mcp_laravel_laravel_make_model({ name: "Lead" })

// 3. Criar events e listeners
mcp_laravel_laravel_make_event({ name: "LeadStageChanged" })
mcp_laravel_laravel_make_listener({ name: "RegisterLeadActivity" })

// 4. Rodar migrations
mcp_laravel_laravel_migrate()

// 5. Testar com Tinker
mcp_laravel_laravel_tinker({ code: "Lead::factory()->create()" })

// 6. Commit e Push
mcp_git_git_commit({ message: "feat: add leads" })
mcp_git_git_push()
```

### Fluxo 2: Atendimento completo (Lead → Venda)

```javascript
// 1. Login
mcp_crm_crm_login({ email: "vendedor@empresa.com", password: "123" })

// 2. Criar lead
mcp_crm_crm_leads_create({
  token: "xxx",
  contact_name: "João",
  contact_phone: "11999999999",
  pipeline_id: "uuid",
  stage_id: "uuid",
  channel_id: "uuid"
})

// 3. Enviar mensagem
mcp_crm_crm_tickets_send_message({
  token: "xxx",
  id: "ticket-uuid",
  message: "Olá! Como posso ajudar?"
})

// 4. Mover no Kanban
mcp_crm_crm_leads_update_stage({
  token: "xxx",
  id: "lead-uuid",
  stage_id: "em-proposta-uuid"
})

// 5. Fechar venda
mcp_crm_crm_tickets_close({
  token: "xxx",
  id: "ticket-uuid",
  result: "Venda realizada!"
})
```

### Fluxo 3: Gerenciar Uso de IA (Unidades)

```javascript
// 1. Login
mcp_crm_crm_login({ email: "admin@empresa.com", password: "123" })

// 2. Ver resumo de uso de Unidades de IA
mcp_crm_crm_usage_summary({ token: "xxx" })
// Retorna: Unidades usadas, limite, breakdown por modelo (4o-mini vs 4o)

// 3. Verificar se precisa comprar pacote
mcp_crm_crm_usage_limits({ token: "xxx" })
// Retorna: warnings se estiver acima de 80%

// 4. Ver pacotes disponíveis
mcp_crm_crm_packages_available({ token: "xxx" })
// Retorna: pack_10k (R$229), pack_30k (R$599), pack_80k (R$1399)

// 5. Comprar pacote de 10.000 Unidades
mcp_crm_crm_packages_purchase({
  token: "xxx",
  package_type: "ai_units",
  package_id: "pack_10k"
})

// 6. Confirmar pagamento
mcp_crm_crm_packages_confirm({
  token: "xxx",
  purchase_id: "uuid-da-compra",
  payment_reference: "PIX-12345"
})

// 7. Estimar uso para próximo mês
mcp_crm_crm_usage_estimate({
  token: "xxx",
  leads_per_month: 500,
  messages_per_lead: 12,
  premium_percentage: 0.1  // 10% em GPT-4o
})
// Retorna: estimativa de Unidades e plano recomendado
```

---

## 📋 Resumo Rápido

| MCP Server | Arquivo | Tools | Uso Principal |
|------------|---------|-------|---------------|
| `laravel` | `laravel-full-mcp.cjs` | 30 | Artisan, Queue, Scheduler, Tinker, Composer |
| `crm` | `crm-full-mcp.cjs` | 46 | API REST, IA, Relatórios, Uso de IA, Pacotes |
| `postgres` | `postgres-mcp.cjs` | 1 | Queries SQL |
| `redis` | `redis-mcp.cjs` | 5 | Cache |
| `supabase` | `supabase-mcp.cjs` | 1 | Storage |
| `n8n` | `n8n-mcp.cjs` | 1 | Webhooks |
| `git` | `git-mcp.cjs` | 5 | Versionamento |
| `docker` | `docker-mcp.cjs` | 4 | Containers |
| `fs` | `fs-mcp.cjs` | 3 | Arquivos |

**Total: ~96 ferramentas**

---

## 📝 Notas Importantes

1. **Rotas do Laravel**: Use **kebab-case** nas URIs (hífens, sem maiúsculas).

2. **Multitenancy**: Sempre inclua `tenant_id` em todas as operações.

3. **Diretório do Projeto**: `C:/dev/crm`

4. **Variáveis de ambiente**:
   - `CRM_API_URL` (default: `http://localhost:8000/api`)
   - `CRM_API_TOKEN`
   - `PGUSER`, `PGHOST`, `PGDATABASE`, `PGPASSWORD`, `PGPORT`
   - `REDIS_URL`
   - `SUPABASE_URL`, `SUPABASE_KEY`

---

*Última atualização: Dezembro 2024*

## Internal API (AI Service Communication)

The Laravel backend exposes a set of internal APIs specifically for the Python AI Service. These are **not** accessible via standard user authentication tokens.

**Authentication:** 
- Header `X-Internal-Key` matching `LARAVEL_INTERNAL_KEY` env var.
- Header `X-Tenant-ID` for multitenancy context.

**Base URL:** `/api/internal`

**Available Endpoints:**

### BI Agent
- `GET /bi/config/settings`: Fetch tenant-specific thresholds and config.
- `POST /bi/analysis`: Store daily analysis results (JSON payload).
- `GET /bi/history/revenue`: Helper for revenue prediction training data.
- `GET /bi/history/leads`: Helper for lead volume training data.
- `GET /bi/leads/active`: Fetch active leads for churn prediction.
- `POST /bi/actions`: Create a suggested action for approval.
- `GET /bi/actions/{id}`: Get action details.
- `POST /bi/actions/{id}/status`: Update action status (e.g. `in_progress`, `completed`).

### SDR Agent Control
- `POST /sdr/config/script`: Update script/prompt.
- `POST /sdr/config/timing`: Update follow-up timing.
- `POST /sdr/config/qualification`: Update qualification criteria.

### Ads Agent Control
- `POST /ads/campaigns/{id}/optimize`: Trigger optimization on a specific campaign.
