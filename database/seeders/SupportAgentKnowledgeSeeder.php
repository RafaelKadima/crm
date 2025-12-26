<?php

namespace Database\Seeders;

use App\Models\Pipeline;
use App\Models\SdrAgent;
use App\Models\SdrFaq;
use App\Models\SdrKnowledgeEntry;
use App\Models\Tenant;
use Illuminate\Database\Seeder;

class SupportAgentKnowledgeSeeder extends Seeder
{
    /**
     * Seed FAQs e Knowledge Entries para o Support Agent.
     */
    public function run(): void
    {
        $tenant = Tenant::where('slug', 'empresa-demo')->first();

        if (!$tenant) {
            $this->command->error('Tenant "empresa-demo" not found.');
            return;
        }

        // Busca ou cria o Support Agent
        $supportAgent = SdrAgent::where('tenant_id', $tenant->id)
            ->where('type', 'support')
            ->first();

        if (!$supportAgent) {
            $this->command->info('Creating Support Agent...');
            $supportAgent = $this->createSupportAgent($tenant);
        }

        // Associa ao Pipeline de Suporte
        $this->associatePipeline($supportAgent, $tenant);

        // Cria FAQs
        $this->command->info('Creating FAQs...');
        $this->createFaqs($supportAgent);

        // Cria Knowledge Entries
        $this->command->info('Creating Knowledge Entries...');
        $this->createKnowledgeEntries($supportAgent);

        $this->command->info('Support Agent Knowledge seeding completed!');
    }

    /**
     * Cria o Support Agent
     */
    private function createSupportAgent(Tenant $tenant): SdrAgent
    {
        return SdrAgent::create([
            'tenant_id' => $tenant->id,
            'name' => 'Agente de Suporte IA',
            'type' => 'support',
            'description' => 'Agente híbrido que atende clientes via WhatsApp, responde dúvidas sobre o sistema e pode identificar/corrigir bugs.',
            'system_prompt' => $this->getSystemPrompt(),
            'personality' => 'Profissional, prestativo, técnico quando necessário, empático com as dores do cliente.',
            'objectives' => 'Resolver dúvidas sobre o CRM, identificar e corrigir bugs, manter cliente informado sobre progresso.',
            'restrictions' => 'Não executar comandos destrutivos sem aprovação. Não prometer prazos específicos. Sempre pedir teste ao cliente após correção.',
            'knowledge_instructions' => 'Sempre consulte a base de conhecimento antes de responder. Use FAQs para respostas rápidas e Knowledge Entries para informações técnicas detalhadas.',
            'pipeline_instructions' => 'Mova o lead conforme o progresso do atendimento. Nova Solicitação → Em Análise → Aguardando Correção → Aguardando Teste → Resolvido.',
            'can_move_leads' => true,
            'language' => 'pt-BR',
            'tone' => 'professional',
            'ai_model' => 'claude-3-5-sonnet-20241022',
            'temperature' => 0.7,
            'is_active' => true,
        ]);
    }

    /**
     * Associa o agente ao Pipeline de Suporte
     */
    private function associatePipeline(SdrAgent $agent, Tenant $tenant): void
    {
        $pipeline = Pipeline::where('tenant_id', $tenant->id)
            ->where('name', 'Suporte Técnico')
            ->first();

        if ($pipeline && !$agent->pipelines()->where('pipeline_id', $pipeline->id)->exists()) {
            $agent->pipelines()->attach($pipeline->id, ['is_primary' => true]);
            $this->command->info('Pipeline de Suporte associated.');
        }
    }

    /**
     * System Prompt do Support Agent
     */
    private function getSystemPrompt(): string
    {
        return <<<'PROMPT'
Você é o **Agente de Suporte IA** do OmniFy HUB CRM.

## SUAS FUNÇÕES

### 1. Atendimento ao Cliente (WhatsApp)
- Responder dúvidas sobre funcionalidades do sistema
- Ensinar o cliente a usar recursos do CRM
- Mover leads no Kanban conforme o atendimento evolui
- Escalar para humano quando necessário

### 2. Resolução de Problemas Técnicos
- Consultar a base de conhecimento
- Identificar bugs no código
- Aplicar correções (com aprovação)
- Fazer deploy em produção (com aprovação)
- Notificar cliente quando bug for corrigido
- Solicitar teste ao cliente

## CONTEXTO TEMPORAL
- Você tem acesso à data e hora atual através das ferramentas
- Use isso para contextualizar suas respostas (ex: "Bom dia!", "Hoje é segunda-feira...")
- Considere horário comercial (9h-18h) ao sugerir contato com humanos

## FLUXO DE ATENDIMENTO

### Se o cliente tiver DÚVIDA sobre o sistema:
1. Consulte a base de conhecimento e FAQs
2. Explique de forma clara e didática
3. Se resolver, mova o lead para "Resolvido"

### Se o cliente relatar um BUG:
1. Agradeça o feedback e peça detalhes
2. Mova o lead para "Em Análise"
3. Busque logs de erro
4. Localize o problema no código
5. Explique ao cliente o que encontrou
6. Proponha a correção (REQUER APROVAÇÃO)
7. Após aprovação, aplique a correção
8. Faça commit (REQUER APROVAÇÃO)
9. Execute testes
10. Faça deploy (REQUER APROVAÇÃO)
11. Mova para "Aguardando Teste do Cliente"
12. Peça ao cliente para testar
13. Se resolveu → "Resolvido" | Se não → volta "Em Análise"

## REGRAS
1. Seja sempre educado e profissional
2. Responda em português brasileiro
3. NUNCA execute comandos destrutivos sem aprovação
4. Sempre informe o status do atendimento ao cliente
5. Mova o lead no Kanban conforme progresso

## ESTÁGIOS DO PIPELINE
- **Nova Solicitação**: Lead recém chegou
- **Em Análise**: Investigando o problema
- **Aguardando Correção**: Bug identificado, correção em andamento
- **Aguardando Teste do Cliente**: Correção aplicada
- **Resolvido**: Problema solucionado ✓
- **Escalado**: Encaminhado para humano

Você está atendendo clientes do OmniFy HUB CRM.
PROMPT;
    }

    /**
     * Cria FAQs para o Support Agent
     */
    private function createFaqs(SdrAgent $agent): void
    {
        // Limpa FAQs existentes
        SdrFaq::where('sdr_agent_id', $agent->id)->delete();

        $faqs = [
            // === LEADS ===
            [
                'question' => 'Como criar um novo lead?',
                'answer' => 'Para criar um novo lead, acesse Menu > Leads > Clique no botão "+ Novo Lead" no canto superior direito. Preencha os dados do cliente (nome, email, telefone) e clique em Salvar.',
                'keywords' => ['lead', 'criar', 'novo', 'cadastrar', 'adicionar'],
                'priority' => 100,
            ],
            [
                'question' => 'Como mover um lead no Kanban?',
                'answer' => 'No Kanban, arraste o card do lead e solte na coluna desejada. Você também pode clicar no lead, editar e alterar o estágio pelo campo "Estágio do Funil".',
                'keywords' => ['lead', 'mover', 'kanban', 'arrastar', 'estagio', 'funil'],
                'priority' => 95,
            ],
            [
                'question' => 'Como filtrar leads por estágio?',
                'answer' => 'Na página de Leads, use os filtros no topo. Clique em "Estágio" e selecione os estágios que deseja visualizar. Você pode combinar múltiplos filtros.',
                'keywords' => ['lead', 'filtrar', 'estagio', 'buscar', 'pesquisar'],
                'priority' => 80,
            ],
            [
                'question' => 'Como importar leads de uma planilha?',
                'answer' => 'Acesse Leads > Importar (ícone de upload). Baixe o modelo de planilha, preencha com seus dados e faça upload. O sistema mapeará as colunas automaticamente.',
                'keywords' => ['lead', 'importar', 'planilha', 'excel', 'csv', 'upload'],
                'priority' => 85,
            ],
            [
                'question' => 'Como exportar leads?',
                'answer' => 'Na lista de Leads, clique no botão "Exportar" (ícone de download). Escolha o formato (CSV ou Excel) e os campos que deseja exportar.',
                'keywords' => ['lead', 'exportar', 'baixar', 'excel', 'csv', 'download'],
                'priority' => 75,
            ],

            // === TICKETS ===
            [
                'question' => 'Como criar um ticket de suporte?',
                'answer' => 'Acesse Menu > Tickets > "+ Novo Ticket". Preencha o assunto, descrição do problema, selecione a prioridade e o departamento responsável.',
                'keywords' => ['ticket', 'criar', 'suporte', 'chamado', 'novo'],
                'priority' => 90,
            ],
            [
                'question' => 'Como acompanhar o status de um ticket?',
                'answer' => 'Na lista de Tickets, você vê o status de cada um. Clique no ticket para ver o histórico completo de interações e atualizações.',
                'keywords' => ['ticket', 'status', 'acompanhar', 'ver', 'historico'],
                'priority' => 85,
            ],

            // === CONTATOS ===
            [
                'question' => 'Qual a diferença entre Lead e Contato?',
                'answer' => 'Lead é uma oportunidade de venda (potencial cliente). Contato é uma pessoa física cadastrada, que pode estar vinculada a uma empresa. Um Lead pode se tornar um Contato após conversão.',
                'keywords' => ['lead', 'contato', 'diferenca', 'cliente'],
                'priority' => 88,
            ],
            [
                'question' => 'Como vincular um contato a uma empresa?',
                'answer' => 'Ao criar ou editar um Contato, use o campo "Empresa" para selecionar a empresa. Você pode criar uma nova empresa pelo ícone "+" ao lado do campo.',
                'keywords' => ['contato', 'empresa', 'vincular', 'associar'],
                'priority' => 70,
            ],

            // === EMPRESAS ===
            [
                'question' => 'Como cadastrar uma empresa?',
                'answer' => 'Acesse Menu > Empresas > "+ Nova Empresa". Preencha razão social, CNPJ, endereço e dados de contato. Você pode adicionar campos personalizados conforme necessário.',
                'keywords' => ['empresa', 'cadastrar', 'criar', 'nova', 'cnpj'],
                'priority' => 75,
            ],

            // === PRODUTOS ===
            [
                'question' => 'Como cadastrar um produto?',
                'answer' => 'Acesse Menu > Produtos > "+ Novo Produto". Preencha nome, descrição, preço, categoria e estoque. Você pode adicionar variações (tamanhos, cores) se necessário.',
                'keywords' => ['produto', 'cadastrar', 'criar', 'novo', 'preco'],
                'priority' => 80,
            ],
            [
                'question' => 'Como gerenciar estoque de produtos?',
                'answer' => 'Na lista de Produtos, você vê o estoque atual. Para ajustar, edite o produto e altere o campo "Quantidade em Estoque". Use movimentações para registrar entradas/saídas.',
                'keywords' => ['produto', 'estoque', 'quantidade', 'inventario'],
                'priority' => 70,
            ],

            // === PROPOSTAS ===
            [
                'question' => 'Como criar uma proposta comercial?',
                'answer' => 'Acesse Menu > Propostas > "+ Nova Proposta". Selecione o lead/cliente, adicione produtos/serviços, configure desconto e condições de pagamento. Você pode usar modelos salvos.',
                'keywords' => ['proposta', 'criar', 'orcamento', 'comercial', 'nova'],
                'priority' => 85,
            ],
            [
                'question' => 'Como enviar uma proposta por email?',
                'answer' => 'Abra a proposta e clique em "Enviar por Email". O sistema gerará um PDF e enviará para o email do cliente. Você pode personalizar a mensagem antes de enviar.',
                'keywords' => ['proposta', 'enviar', 'email', 'pdf'],
                'priority' => 75,
            ],

            // === WHATSAPP ===
            [
                'question' => 'Como conectar o WhatsApp ao CRM?',
                'answer' => 'Acesse Configurações > Canais > WhatsApp > "Conectar". Escaneie o QR Code com seu WhatsApp. A conexão usa Evolution API e as mensagens serão sincronizadas automaticamente.',
                'keywords' => ['whatsapp', 'conectar', 'integrar', 'qrcode', 'canal'],
                'priority' => 95,
            ],
            [
                'question' => 'Por que o WhatsApp desconectou?',
                'answer' => 'Pode ser: 1) Celular sem internet, 2) WhatsApp Web aberto em outro lugar, 3) Sessão expirada. Acesse Canais > WhatsApp e reconecte escaneando o QR Code novamente.',
                'keywords' => ['whatsapp', 'desconectou', 'offline', 'problema', 'qrcode'],
                'priority' => 90,
            ],
            [
                'question' => 'Como usar o chat do CRM?',
                'answer' => 'Acesse Menu > Chat ou clique no ícone de chat. Selecione a conversa desejada. Você pode responder clientes, enviar arquivos, áudios e usar respostas rápidas.',
                'keywords' => ['chat', 'mensagem', 'responder', 'conversa'],
                'priority' => 85,
            ],

            // === AUTOMAÇÕES ===
            [
                'question' => 'Como criar uma automação?',
                'answer' => 'Acesse Menu > Automações > "+ Nova". Escolha o gatilho (ex: lead criado), defina as condições e a ação (ex: enviar mensagem). Ative a automação quando estiver pronta.',
                'keywords' => ['automacao', 'criar', 'workflow', 'gatilho', 'automatico'],
                'priority' => 80,
            ],
            [
                'question' => 'Como agendar envio de mensagens?',
                'answer' => 'Use Automações com gatilho de "Agendamento" ou na conversa clique em "Agendar Mensagem" para definir data e hora de envio.',
                'keywords' => ['agendar', 'mensagem', 'envio', 'programar', 'horario'],
                'priority' => 70,
            ],

            // === CONFIGURAÇÕES ===
            [
                'question' => 'Como adicionar um novo usuário?',
                'answer' => 'Acesse Configurações > Usuários > "+ Novo Usuário". Preencha nome, email e defina o papel (Admin, Vendedor, etc). O usuário receberá um email para criar a senha.',
                'keywords' => ['usuario', 'adicionar', 'criar', 'novo', 'equipe'],
                'priority' => 75,
            ],
            [
                'question' => 'Como configurar permissões de usuário?',
                'answer' => 'Acesse Configurações > Papéis. Edite o papel desejado ou crie um novo. Defina quais módulos e ações o papel pode acessar. Depois, atribua o papel ao usuário.',
                'keywords' => ['permissao', 'acesso', 'papel', 'role', 'configurar'],
                'priority' => 70,
            ],
            [
                'question' => 'Como alterar minha senha?',
                'answer' => 'Clique no seu avatar no canto superior direito > "Minha Conta" > "Alterar Senha". Digite a senha atual e a nova senha duas vezes.',
                'keywords' => ['senha', 'alterar', 'mudar', 'trocar', 'password'],
                'priority' => 65,
            ],

            // === RELATÓRIOS ===
            [
                'question' => 'Como acessar os relatórios?',
                'answer' => 'Acesse Menu > Relatórios. Escolha o tipo de relatório (Vendas, Leads, Atendimentos), defina o período e filtros desejados. Você pode exportar em PDF ou Excel.',
                'keywords' => ['relatorio', 'dashboard', 'metricas', 'exportar'],
                'priority' => 75,
            ],
            [
                'question' => 'Como ver métricas de vendas?',
                'answer' => 'Acesse Menu > Relatórios > Vendas. Você verá faturamento, ticket médio, conversão de leads, vendas por vendedor e evolução mensal.',
                'keywords' => ['metricas', 'vendas', 'faturamento', 'conversao', 'dashboard'],
                'priority' => 70,
            ],

            // === AGENTE IA ===
            [
                'question' => 'Como configurar o Agente SDR IA?',
                'answer' => 'Acesse Configurações > Agentes IA. Edite o agente, configure o prompt, personalidade e restrições. Adicione documentos à base de conhecimento e FAQs para treinar.',
                'keywords' => ['agente', 'ia', 'sdr', 'configurar', 'prompt', 'treinar'],
                'priority' => 85,
            ],
            [
                'question' => 'Como treinar o Agente IA?',
                'answer' => 'Na configuração do Agente, adicione: 1) FAQs com perguntas frequentes, 2) Documentos (PDFs, textos), 3) Knowledge Entries com informações específicas. O agente aprenderá com esse conteúdo.',
                'keywords' => ['agente', 'ia', 'treinar', 'rag', 'conhecimento', 'faq'],
                'priority' => 80,
            ],

            // === PIPELINE ===
            [
                'question' => 'Como criar um novo funil de vendas?',
                'answer' => 'Acesse Configurações > Pipelines > "+ Novo Pipeline". Dê um nome e crie os estágios (ex: Novo, Qualificação, Proposta, Fechamento). Defina cores e ordem.',
                'keywords' => ['pipeline', 'funil', 'criar', 'estagios', 'kanban'],
                'priority' => 75,
            ],
            [
                'question' => 'Como editar os estágios do funil?',
                'answer' => 'Acesse Configurações > Pipelines > selecione o pipeline. Você pode adicionar, remover, renomear e reordenar os estágios. Cuidado ao remover estágios com leads.',
                'keywords' => ['estagio', 'funil', 'editar', 'pipeline', 'alterar'],
                'priority' => 70,
            ],

            // === PROBLEMAS COMUNS ===
            [
                'question' => 'O sistema está lento, o que fazer?',
                'answer' => 'Tente: 1) Atualizar a página (F5), 2) Limpar cache do navegador, 3) Verificar sua conexão com internet, 4) Usar outro navegador. Se persistir, entre em contato conosco.',
                'keywords' => ['lento', 'travando', 'demora', 'problema', 'performance'],
                'priority' => 90,
            ],
            [
                'question' => 'Não consigo fazer login',
                'answer' => 'Verifique: 1) Email e senha estão corretos, 2) Caps Lock está desligado, 3) Tente "Esqueci minha senha". Se você é novo, verifique se recebeu o email de convite.',
                'keywords' => ['login', 'entrar', 'senha', 'acesso', 'nao consigo'],
                'priority' => 95,
            ],
            [
                'question' => 'Mensagem não foi enviada',
                'answer' => 'Verifique: 1) WhatsApp está conectado (ícone verde), 2) Número do cliente está correto, 3) Há conexão com internet. Vá em Canais > WhatsApp para verificar status.',
                'keywords' => ['mensagem', 'nao enviou', 'whatsapp', 'falha', 'erro'],
                'priority' => 90,
            ],
            [
                'question' => 'Como reportar um bug?',
                'answer' => 'Descreva o problema com detalhes: o que estava fazendo, o que esperava acontecer e o que aconteceu. Se possível, envie prints da tela. Eu vou analisar e corrigir!',
                'keywords' => ['bug', 'erro', 'problema', 'reportar', 'relatar'],
                'priority' => 100,
            ],
        ];

        foreach ($faqs as $faq) {
            SdrFaq::create([
                'sdr_agent_id' => $agent->id,
                'question' => $faq['question'],
                'answer' => $faq['answer'],
                'keywords' => $faq['keywords'],
                'priority' => $faq['priority'],
                'is_active' => true,
            ]);
        }

        $this->command->info(count($faqs) . ' FAQs created.');
    }

    /**
     * Cria Knowledge Entries para o Support Agent
     */
    private function createKnowledgeEntries(SdrAgent $agent): void
    {
        // Limpa entries existentes
        SdrKnowledgeEntry::where('sdr_agent_id', $agent->id)->delete();

        $entries = [
            // === ARQUITETURA DO SISTEMA ===
            [
                'title' => 'Arquitetura do OmniFy HUB CRM',
                'category' => 'arquitetura',
                'tags' => ['arquitetura', 'stack', 'tecnologia'],
                'content' => <<<'CONTENT'
## Stack Tecnológica

### Backend (Laravel 11)
- **Framework**: Laravel 11 com PHP 8.3
- **Banco de dados**: PostgreSQL 16
- **Cache**: Redis
- **Filas**: Redis + Laravel Queue
- **Autenticação**: Laravel Sanctum (tokens)
- **Multi-tenancy**: Stancl/Tenancy (por banco de dados)

### Frontend (React + TypeScript)
- **Framework**: React 18 com TypeScript
- **Build**: Vite
- **UI**: Tailwind CSS + Shadcn/UI
- **Estado**: TanStack Query + Zustand
- **Roteamento**: React Router v6

### AI Service (Python)
- **Framework**: FastAPI
- **LLM**: Claude API (Anthropic)
- **Embeddings**: OpenAI text-embedding-3-small
- **Vector DB**: PostgreSQL + pgvector
- **MCP**: Model Context Protocol para tools

### Infraestrutura (VPS)
- **Servidor**: Ubuntu 22.04 LTS
- **Docker**: Docker Compose
- **Proxy**: Nginx
- **SSL**: Let's Encrypt
- **IP**: 212.85.20.129
- **Path**: /var/www/crm

### Containers Docker
- crm-php: Backend Laravel
- crm-nginx: Servidor web
- crm-ai-service: Serviço de IA Python
- crm-postgres: Banco de dados
- crm-redis: Cache e filas
CONTENT,
            ],

            // === ESTRUTURA DE PASTAS ===
            [
                'title' => 'Estrutura de Pastas do Projeto',
                'category' => 'arquitetura',
                'tags' => ['pastas', 'estrutura', 'organizacao'],
                'content' => <<<'CONTENT'
## Estrutura Principal

```
crm/
├── app/                    # Código Laravel
│   ├── Http/Controllers/   # Controllers da API
│   ├── Models/             # Models Eloquent
│   ├── Services/           # Lógica de negócio
│   └── Jobs/               # Jobs assíncronos
├── frontend/               # Código React
│   ├── src/
│   │   ├── components/     # Componentes React
│   │   ├── pages/          # Páginas
│   │   ├── hooks/          # Custom hooks
│   │   ├── api/            # Chamadas API
│   │   └── stores/         # Estado global (Zustand)
├── ai-service/             # Serviço de IA Python
│   ├── app/                # Aplicação FastAPI
│   ├── mcp/                # MCP Server e Tools
│   │   ├── tools/          # Ferramentas MCP
│   │   ├── agents/         # Agentes IA
│   │   └── server.py       # Servidor MCP
│   └── tests/              # Testes
├── database/
│   ├── migrations/         # Migrations
│   └── seeders/            # Seeders
├── routes/
│   ├── api.php             # Rotas API
│   └── web.php             # Rotas web
└── docker/                 # Configurações Docker
```

## Arquivos Importantes
- `app/Http/Controllers/Api/` - Controllers da API REST
- `app/Models/` - Models com relacionamentos
- `frontend/src/pages/` - Páginas React
- `ai-service/mcp/tools/` - Ferramentas dos agentes
CONTENT,
            ],

            // === PROCESSO DE BUG FIX ===
            [
                'title' => 'Processo de Correção de Bugs',
                'category' => 'bugfix',
                'tags' => ['bug', 'correcao', 'processo', 'debug'],
                'content' => <<<'CONTENT'
## Fluxo de Correção de Bugs

### 1. Identificação
1. Receber relato do cliente
2. Coletar detalhes: o que fez, o que esperava, o que aconteceu
3. Verificar logs de erro com `get_error_logs`

### 2. Análise
1. Buscar arquivos relacionados com `search_codebase`
2. Ler código do arquivo com `read_file`
3. Identificar a causa raiz do problema
4. Documentar o bug e a correção proposta

### 3. Correção (REQUER APROVAÇÃO)
1. Usar `edit_file` para aplicar a correção
2. Fazer commit com `git_commit`
3. Executar testes com `run_tests`

### 4. Deploy (REQUER APROVAÇÃO)
1. Push para repositório com `git_push`
2. Deploy em produção com `deploy_production`

### 5. Validação
1. Notificar cliente sobre a correção
2. Solicitar teste do cliente
3. Mover lead para "Aguardando Teste do Cliente"
4. Se confirmado, mover para "Resolvido"

## Comandos Úteis

### Logs de Erro
- Laravel: `docker logs crm-php 2>&1 | grep -i error`
- Nginx: `docker logs crm-nginx 2>&1 | tail -50`
- AI Service: `docker logs crm-ai-service 2>&1 | tail -50`

### Tipos Comuns de Bugs
- **500 Internal Server Error**: Verificar logs do PHP
- **404 Not Found**: Verificar rotas em routes/api.php
- **CORS Error**: Verificar config/cors.php
- **WhatsApp Offline**: Verificar Evolution API
CONTENT,
            ],

            // === PROCESSO DE DEPLOY ===
            [
                'title' => 'Processo de Deploy em Produção',
                'category' => 'deploy',
                'tags' => ['deploy', 'producao', 'vps', 'docker'],
                'content' => <<<'CONTENT'
## Deploy no OmniFy HUB CRM

### Servidor
- **IP**: 212.85.20.129
- **User**: root
- **Path**: /var/www/crm

### Passos do Deploy

1. **Git Pull**
```bash
cd /var/www/crm && git pull origin main
```

2. **Instalar Dependências PHP**
```bash
docker exec crm-php composer install --no-dev --optimize-autoloader
```

3. **Instalar Dependências Node**
```bash
docker exec crm-php npm install && npm run build
```

4. **Rodar Migrations**
```bash
docker exec crm-php php artisan migrate --force
```

5. **Limpar Cache**
```bash
docker exec crm-php php artisan optimize:clear
docker exec crm-php php artisan config:cache
docker exec crm-php php artisan route:cache
docker exec crm-php php artisan view:cache
```

6. **Reiniciar Serviços**
```bash
docker compose restart
```

### Deploy do AI Service
```bash
cd /var/www/crm/ai-service
docker compose down && docker compose up -d --build
```

### Verificação Pós-Deploy
1. Acessar o sistema e verificar se está funcionando
2. Verificar logs: `docker logs crm-php 2>&1 | tail -20`
3. Testar funcionalidade específica que foi alterada
CONTENT,
            ],

            // === MÓDULOS DO CRM ===
            [
                'title' => 'Módulos do OmniFy HUB CRM',
                'category' => 'funcionalidades',
                'tags' => ['modulos', 'funcionalidades', 'recursos'],
                'content' => <<<'CONTENT'
## Módulos Principais

### 1. Leads (CRM)
- Cadastro e gestão de leads
- Pipeline/Kanban visual
- Histórico de interações
- Score de leads (IA)
- Importação/Exportação

### 2. Tickets (Helpdesk)
- Abertura de chamados
- Prioridades e SLA
- Atribuição por departamento
- Histórico de atendimento

### 3. Chat (Omnichannel)
- WhatsApp integrado
- Respostas rápidas
- Transferência entre atendentes
- Chatbot/Agente IA

### 4. Contatos & Empresas
- Cadastro de pessoas
- Cadastro de empresas
- Vínculos entre contatos e empresas
- Campos personalizados

### 5. Produtos
- Catálogo de produtos
- Variações (cor, tamanho)
- Controle de estoque
- Categorias

### 6. Propostas
- Criação de orçamentos
- Templates personalizáveis
- Envio por email
- Assinatura eletrônica

### 7. Automações
- Workflows visuais
- Gatilhos e ações
- Envio automático de mensagens
- Mudança automática de estágio

### 8. Relatórios
- Dashboard de vendas
- Métricas de atendimento
- Performance de equipe
- Exportação PDF/Excel

### 9. Agentes IA
- SDR automatizado
- Base de conhecimento (RAG)
- FAQs
- Suporte técnico IA

### 10. Configurações
- Usuários e permissões
- Canais de comunicação
- Pipelines/Funis
- Integrações
CONTENT,
            ],

            // === WHATSAPP EVOLUTION API ===
            [
                'title' => 'Integração WhatsApp (Evolution API)',
                'category' => 'integracoes',
                'tags' => ['whatsapp', 'evolution', 'integracao', 'api'],
                'content' => <<<'CONTENT'
## Evolution API v2

### Sobre
O OmniFy HUB usa Evolution API para integração com WhatsApp. É uma API open-source que permite enviar/receber mensagens via WhatsApp Web.

### Configuração
- A instância é criada por tenant
- QR Code escaneado para conectar
- Webhooks recebem mensagens

### Problemas Comuns

#### WhatsApp Desconectado
1. Celular sem internet
2. WhatsApp Web aberto em outro lugar
3. Sessão expirada
**Solução**: Reconectar via QR Code

#### Mensagens não enviando
1. Verificar status da instância
2. Verificar número de destino (formato: 5511999999999)
3. Verificar logs da Evolution API

### Endpoints Principais
- `POST /message/sendText` - Enviar texto
- `POST /message/sendMedia` - Enviar mídia
- `GET /instance/connectionState` - Status conexão
- `GET /instance/qrcode` - QR Code

### Arquivo de Configuração
- Backend: `config/services.php` > evolution
- Controller: `app/Http/Controllers/Api/ChannelController.php`
CONTENT,
            ],

            // === AGENTES IA ===
            [
                'title' => 'Sistema de Agentes IA',
                'category' => 'ia',
                'tags' => ['agente', 'ia', 'sdr', 'suporte', 'rag'],
                'content' => <<<'CONTENT'
## Arquitetura dos Agentes IA

### Tipos de Agentes
1. **SDR Agent**: Atendimento comercial, qualificação de leads
2. **Support Agent**: Suporte técnico, correção de bugs

### Base de Conhecimento (RAG)
- **Documentos**: PDFs, TXT, DOCX processados
- **FAQs**: Perguntas e respostas predefinidas
- **Knowledge Entries**: Texto livre categorizado

### Fluxo de Processamento
1. Mensagem chega via webhook
2. Sistema busca contexto RAG
3. Claude processa com tools disponíveis
4. Resposta enviada ao cliente

### MCP (Model Context Protocol)
O agente usa MCP para chamar ferramentas:
- `search_manual`: Busca na base de conhecimento
- `move_lead_stage`: Move lead no Kanban
- `send_message`: Envia mensagem WhatsApp
- `get_error_logs`: Busca logs de erro
- `edit_file`: Edita arquivos (com aprovação)
- `deploy_production`: Faz deploy (com aprovação)

### Arquivos Principais
- `ai-service/mcp/server.py` - Servidor MCP
- `ai-service/mcp/tools/` - Ferramentas disponíveis
- `ai-service/mcp/permissions.py` - Permissões por agente
- `app/Models/SdrAgent.php` - Model do agente
CONTENT,
            ],

            // === MULTI-TENANCY ===
            [
                'title' => 'Sistema Multi-Tenant',
                'category' => 'arquitetura',
                'tags' => ['tenant', 'multi-tenancy', 'isolamento'],
                'content' => <<<'CONTENT'
## Multi-Tenancy no OmniFy HUB

### Abordagem
Usamos Stancl/Tenancy com isolamento por banco de dados. Cada tenant tem seu próprio banco PostgreSQL.

### Como Funciona
1. Request chega ao sistema
2. Middleware identifica tenant (subdomínio ou header)
3. Conexão muda para banco do tenant
4. Todas as queries são isoladas

### Tenant Central vs Tenant
- **Central**: Tabela `tenants`, gerenciamento de assinaturas
- **Tenant**: Dados específicos (leads, contatos, etc)

### Arquivos Importantes
- `config/tenancy.php` - Configuração
- `app/Http/Middleware/InitializeTenancy.php` - Middleware
- `database/migrations/tenant/` - Migrations do tenant

### Problemas Comuns
- **Tenant não encontrado**: Verificar header X-Tenant-Id
- **Dados misturados**: Bug no middleware de tenancy
- **Migration pendente**: Rodar `php artisan tenants:migrate`
CONTENT,
            ],

            // === CONTEXTO TEMPORAL ===
            [
                'title' => 'Contexto Temporal e Horários',
                'category' => 'contexto',
                'tags' => ['hora', 'data', 'fuso', 'horario'],
                'content' => <<<'CONTENT'
## Informações Temporais

### Fuso Horário
O sistema opera em **America/Sao_Paulo** (UTC-3).

### Horário Comercial
- Segunda a Sexta: 9h às 18h
- Sábado: 9h às 13h (opcional)
- Domingo: Fechado

### Saudações por Horário
- 6h às 12h: "Bom dia!"
- 12h às 18h: "Boa tarde!"
- 18h às 6h: "Boa noite!"

### Considerações
- Se for fora do horário comercial, avise que o atendimento humano retornará no próximo dia útil
- Emergências: Escalar para o admin via notificação
- Feriados: Verificar calendário brasileiro

### Uso na Conversa
Sempre considere o contexto temporal ao responder:
- "Como você está nessa segunda-feira?"
- "Bom dia! Como posso ajudar hoje?"
- "São 17h, ainda consigo resolver isso hoje!"
CONTENT,
            ],

            // === ERROS COMUNS E SOLUÇÕES ===
            [
                'title' => 'Erros Comuns e Soluções',
                'category' => 'bugfix',
                'tags' => ['erro', 'solucao', 'debug', 'problema'],
                'content' => <<<'CONTENT'
## Erros Frequentes

### 500 Internal Server Error
**Causas**:
1. Erro de sintaxe PHP
2. Model não encontrado
3. Dependência faltando

**Diagnóstico**:
```bash
docker logs crm-php 2>&1 | grep -i error | tail -20
```

### 401 Unauthorized
**Causas**:
1. Token expirado
2. Token inválido
3. Middleware de autenticação

**Solução**:
- Fazer logout e login novamente
- Verificar header Authorization

### 404 Not Found
**Causas**:
1. Rota não existe
2. Registro não encontrado
3. Route caching desatualizado

**Solução**:
```bash
docker exec crm-php php artisan route:cache
```

### CORS Error
**Causas**:
1. Origin não permitida
2. Header não permitido

**Arquivo**: `config/cors.php`

### WhatsApp não conecta
**Causas**:
1. Instância expirou
2. Celular offline
3. QR Code expirado

**Solução**:
1. Verificar status em Canais > WhatsApp
2. Reconectar via QR Code

### Mensagem não chega
**Causas**:
1. Webhook não configurado
2. Erro no processamento
3. Número inválido

**Diagnóstico**:
```bash
docker logs crm-php 2>&1 | grep webhook | tail -20
```
CONTENT,
            ],

            // === GIT WORKFLOW ===
            [
                'title' => 'Workflow Git',
                'category' => 'deploy',
                'tags' => ['git', 'commit', 'push', 'branch'],
                'content' => <<<'CONTENT'
## Git Workflow

### Branches
- **main**: Produção (protegida)
- **develop**: Desenvolvimento
- **feature/***: Novas features
- **fix/***: Correções de bugs

### Fluxo de Correção
1. Identificar o arquivo com problema
2. Fazer a correção
3. Commit com mensagem descritiva
4. Push para repositório
5. Deploy em produção

### Convenção de Commits
```
fix: Corrigir [descrição do bug]
feat: Adicionar [nova funcionalidade]
refactor: Refatorar [o que foi refatorado]
docs: Atualizar documentação
```

### Comandos
```bash
git status                    # Ver arquivos alterados
git diff                      # Ver diferenças
git add .                     # Adicionar alterações
git commit -m "fix: ..."      # Fazer commit
git push origin main          # Enviar para remoto
```

### Repositório
- **Remote**: origin
- **URL**: Configurado no .git/config
- **Branch principal**: main
CONTENT,
            ],

            // === TESTES ===
            [
                'title' => 'Executando Testes',
                'category' => 'deploy',
                'tags' => ['teste', 'phpunit', 'jest', 'qa'],
                'content' => <<<'CONTENT'
## Testes do Sistema

### Testes Backend (PHPUnit)
```bash
docker exec crm-php php artisan test
```

### Testes Frontend (Vitest)
```bash
cd frontend && npm run test
```

### Testes AI Service (Pytest)
```bash
cd ai-service && pytest
```

### Tipos de Teste
1. **Unit**: Testa funções isoladas
2. **Feature**: Testa endpoints da API
3. **Integration**: Testa fluxos completos

### Antes do Deploy
Sempre executar testes antes de fazer deploy:
```bash
docker exec crm-php php artisan test --stop-on-failure
```

### Se os Testes Falharem
1. Verificar qual teste falhou
2. Ler a mensagem de erro
3. Corrigir o código
4. Rodar testes novamente
5. Só fazer deploy se todos passarem
CONTENT,
            ],
        ];

        foreach ($entries as $entry) {
            SdrKnowledgeEntry::create([
                'sdr_agent_id' => $agent->id,
                'title' => $entry['title'],
                'content' => $entry['content'],
                'category' => $entry['category'],
                'tags' => $entry['tags'],
                'is_active' => true,
            ]);
        }

        $this->command->info(count($entries) . ' Knowledge Entries created.');
    }
}
