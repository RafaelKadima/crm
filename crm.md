Vamos montar o manual do CRM primeiro, depois transformo isso em comandos prontos pro Cursor.

Vou começar definindo os módulos e funcionalidades em formato de checklist pra você ir “ticando”.

0. Visão geral do CRM

Tecnologias (decididas):

Backend: Laravel

Banco principal: PostgreSQL/MySQL (tanto faz pro Laravel – Supabase entra como serviço extra)

Serviços externos:

Supabase → logs, eventos, analytics, talvez storage

n8n → automações, agentes de IA, campanhas

API oficial do WhatsApp → canal de atendimento

Objetivo do CRM:

Centralizar leads, clientes, tickets e oportunidades

Atender via WhatsApp oficial em tempo real

Ter funil Kanban, relatórios, campanhas automatizadas (Meta/Google) via IA (n8n)

1. Módulo: Usuários, Times e Permissões

Objetivo: controlar quem usa o sistema e o que cada um pode fazer.

Funcionalidades

 Cadastro de usuários

 Nome, e-mail, senha, foto opcional

 Status (ativo / inativo)

 Perfis / Papéis

 Admin (total)

 Gestor (vê time)

 Vendedor/Atendente (vê só sua carteira)

 Marketing (acesso campanhas)

 Times / Equipes

 Usuário pertence a 1 ou mais times

 Filtrar funil/tickets por time

 Autenticação

 Login

 Esqueci minha senha

 Redefinição via e-mail

 Controle de acesso (policies / gates)

 Usuário só vê tickets/oportunidades da sua carteira, salvo se gestor/admin

 Permissão para mexer em campanhas de marketing

Depois eu crio os comandos pro Cursor tipo:
“Crie migrations, models e policies para User, Team e Role com tal estrutura…”

2. Módulo: Cadastros Base (Contatos, Empresas, Canais)

Objetivo: ter a base limpa de clientes/leads.

Funcionalidades

 Contatos

 Nome

 WhatsApp principal

 E-mail

 Origem (campanha, orgânico, indicação, etc.)

 Tags (ex: quente, morno, frio)

 Empresas (opcional, mas poderoso)

 Nome fantasia / Razão social

 CNPJ

 Segmento

 Tamanho (porte)

 Relacionar múltiplos contatos à mesma empresa

 Canais de origem

 Facebook Ads

 Google Ads

 WhatsApp orgânico

 Indicação

 Outros

 Encarteiramento

 Cada contato tem um “dono” (usuário responsável)

 Regra para reatribuir dono (manual por enquanto)

3. Módulo: Funil de Vendas / Oportunidades (Kanban)

Objetivo: acompanhar negócios do lead até o fechamento.

Funcionalidades

 Pipeline

 Estágios configuráveis (exemplo padrão):

Novo

Em contato

Em proposta

Follow-up

Fechado ganho

Fechado perdido

 Possibilidade de criar pipelines diferentes (Ex: Vendas / Suporte avançado) – pode ficar para fase 2

 Oportunidade

 Relacionada a:

 Contato

 Empresa

 Dono (usuário)

 Campos:

Título

Valor estimado

Data prevista de fechamento

Status (aberta / ganha / perdida)

Motivo da perda (se perdida)

 Kanban

 Arrastar e soltar oportunidade entre colunas

 Atualizar automaticamente estágio e logs

 Ações por estágio (do jeito que você falou):

 Ao entrar num estágio, sugerir/registrar ações:

Ex: enviar mensagem WhatsApp

Marcar follow-up

Criar tarefa

 Agendamento de oportunidade

 Campo de “próxima ação” (data/hora e tipo)

 Lista de “agenda do dia” por usuário

4. Módulo: Tickets de Atendimento (SAC / Suporte)

Objetivo: gestão de atendimentos com status e transferência.

Funcionalidades

 Ticket

 Relacionado a contato

 Canal (WhatsApp, telefone, e-mail, outro)

 Assunto

 Descrição

 SLA opcional (prazo ideal)

 Status do ticket

Novo

Aberto

Em atendimento

Aguardando cliente

Finalizado

Cancelado

 Transferência de ticket

 Transferir:

para outro usuário

para outro time

 Registrar histórico da transferência

 Encerramento de conversa

 Marcar ticket como finalizado

 Campo obrigatório “resultado”

 Encarteiramento

 Ticket vinculado ao dono

 Respeitar permissões (só dono, gestor ou admin mexem)

5. Módulo: Integração WhatsApp Oficial

Objetivo: atendimento em tempo real usando a API oficial.

(Aqui a gente faz só o que é necessário pro MVP, o resto joga pra automações n8n)

Funcionalidades

 Webhook de recebimento de mensagem

 Receber mensagens de texto

 Identificar contato por número

 Criar contato se não existir

 Abrir ou associar a ticket/oportunidade

 Envio de mensagens

 Enviar resposta diretamente do CRM

 Histórico

 Exibir timeline da conversa no detalhe do ticket ou contato

 Flags para IA (via n8n)

 Campo “modo de atendimento”:

Manual

IA (n8n)

Híbrido (IA abre, humano assume)

6. Módulo: Agenda, Tarefas e Atividades

Objetivo: garantir que ninguém esqueça follow-up.

Funcionalidades

 Tarefas

 Relacionadas a:

Contato

Oportunidade

Ticket

 Tipo (ligação, mensagem, reunião etc.)

 Data/hora

 Responsável

 Status (pendente, concluída, cancelada)

 Agenda do usuário

 Lista de tarefas do dia/semana

 Ver por time

 Log automático de atividades

 Mudança de estágio

 Mensagem enviada

 Ticket transferido

 IA respondeu (via n8n)

7. Módulo: Campanhas (Facebook / Google Ads via IA + n8n)

Objetivo: área exclusiva de campanhas, como você pediu.

Funcionalidades

 Cadastro de campanha

 Nome interno da campanha

 Objetivo (leads, conversas, tráfego etc.)

 Plataforma:

Facebook/Instagram

Google Ads

 Orçamento diário ou total

 Datas de início/fim

 Públicos

 Descrição do público-alvo

 Região

 Idade / interesses

 Briefing criativo

 Textos

 Pains / promessas

 Links de referência

 Upload de arquivos (imagens, vídeos, docs)

 Integração com n8n (IA)

 Botão: “Enviar para IA configurar campanha”

 Registrar ID do fluxo n8n

 Status da campanha:

Em preparação pela IA

Em revisão

Ativa

Pausada

Encerrada

 Relacionamento com CRM

 Cada lead vindo dessas campanhas chega com origem preenchida certinho

8. Módulo: Relatórios e Dashboards

Objetivo: dar visão de negócio (não só tela bonita).

Funcionalidades

 Relatório de funil

 Quantidade de oportunidades por estágio

 Taxa de conversão entre estágios

 Valor em cada etapa

 Relatório de produtividade

 Tickets atendidos por usuário/time

 Tempo médio de resposta/resolução

 Relatório de campanhas

 Leads por campanha

 Taxa de conversão por origem

 Dashboards visuais

 Cards + gráficos simples (linha, barra)

9. Módulo: Configurações e Integrações

Objetivo: deixar o sistema flexível sem mexer em código.

Funcionalidades

 Configuração de pipelines e estágios

 Configuração de motivos de perda

 Configuração dos status de ticket (ativar/desativar algum)

 Configuração de integrações:

 Supabase (chaves, URL, schema)

 n8n (endpoint base, tokens, IDs de workflow)

 WhatsApp API (tokens, webhook)

 Gestão de templates

 Mensagens prontas de WhatsApp

 Scripts de atendimento

 Prompts base para IA (que o n8n usa)

Como podemos seguir a partir daqui

Sugestão de fluxo (bem organizado, modo gerente de projetos):

Você revisa essa lista e ajusta o que quiser (tirar algo, adicionar, mudar nome).

Na próxima etapa, eu:

Pego Módulo 1 (Usuários, Times e Permissões)

Escrevo um mini-especificação técnica (campos, tabelas, relacionamentos)

E te entrego uma lista de comandos prontos para você dar no Cursor, tipo:

“Crie uma migration e model User com os campos X, Y, Z…”
“Implemente policies para garantir que…”

Depois repetimos o mesmo para os outros módulos, um por um, até termos:

Manual funcional

Checklist completo

Biblioteca de prompts/comandos pro Cursor

Se você topar, no próximo passo eu já desço o Módulo 1 no nível técnico + comandos pro Cursor.

Você disse:
Vou criar aqui commo quero que funcione e voce me traga o que precisaremos fazer, ok ? 
Vamos lá... quando formos separar, vamos comecar com o backend e depois a gente vai para o front. blz? ? 

O CRM será mult tenati. 
Se o cliente escolheu o plano com atendimento de IA SDR, ele tera o acesso ao crm com a opcao de crm ativada na configuracao e ele irá configurar em qual canal o atendente de IA irá atender. 

Nesse canal, os leads terao que ir diretamente para o atendente de IA e depois, ele irá autodistribuir os leads de forma igualitaria. Ex: se chegaram 6 e tem tres vendedores, ele tera que distribuir 2 leads para cada um e mover o lead no Kanban conforme configurado. 

Os Atendentes de IA poderao ser treinados com arquivos ou textos que os clientes subirao falando de seus produtos e ali será uma bbase de dados para o atendente de ia consultar. 

Quando o cliente nao solicitar a versao com atendimento de IA humanizada, o sistema fara a distribuiçao automaticamente para os vendedores de forma igualitária. 

OBS: Os leads que chegarem para os atendentes, ja tem que serem inseridos na carteira daqueles atendentes, pois assim, quando o lead mandar mensagem novamente após o ticket finalizado, ele será redirecionado ao vendedor responsável por ele. 

A terceira opcao de planao é a enterprise, onde terá vendedor IA, campanhas por automacao e o atendimento... 

Tudo será integrado via n8n, banco de daods e api. 

O cliente já tem que chegar com o nome e o telefone identificado, dentro da conversa o vendedor poderá editar adicionando dados como email, cpf e endereço. 

Temos que ter também configuracao para apis externas, para fazermos integracao de nevios de dados para outros sistema como erps e sistema de venda mesmo. 

Ex: Assim que o vendedor colocar os dados e clicar em salvar, quando configurado, disparar os dados já para a base de cadastro do sistema de vendas... 

Assim como nosso crm também terá api para enviar dados para outros sistemas também. 


Vamos manter um visual clena e organizado, mas bastante intuitivo, onde o kanban sera a tela princiapl dos leads e ali mesmo, em cada card, o vendedor clicar no incone de conversa e abre uma janela com a conversa daquele lead, para melhorarmos a experiencia do cliente. 

Do card mesmo, o usuario poderá fazer qualquer coisa com o lead. 

Precisaremos da funcao de transferir ticket, finalizar, etc... 

Cada etapa do kanban criado, poderá ser configurado com um evento do google tag manager e alí irá disparar para o que tiver configurado no google tag manager. 

Toda nossa comunicacao com IA será feita via n8n. O Agente de ia tem que entender o momento de cada lead e transferir na etapa do kanban que faz parte do funil de vendas. 
Todo o kanban sera configurado pela criacao de uma funil de vendas.  

A mudança feita pelo agente sera via api ou webhook, por isso, cada funcao no crm tera que ser feita uma api. 

cada vendedor terá a sua agenda para marcar a oportunidade criada... 

Precisaremos ter filtros e relatórios... 



acredito que no momento será somente isso. 
O ChatGPT disse:

Perfeito, Rafael.
Você acabou de entregar a visão completa do produto, com lógica de negócio, fluxo operacional, modelos de plano e comportamento da IA.

Agora eu vou atuar como gestor de projetos + arquiteto de software sênior e transformar sua descrição em:

✅ 1. Lista completa de módulos do backend (multitenant)
✅ 2. Tudo o que precisaremos construir (tabelas, APIs, eventos, integrações)
✅ 3. Arquitetura do CRM
✅ 4. Sequência exata de desenvolvimento
✅ 5. Prompts prontos para o Cursor (quando formos codar)

Vamos por partes.

🔥 1) ARQUITETURA GERAL DO CRM
✔ Multitenant (cada empresa tem seus próprios dados)

Modelo recomendado: Row Level Multitenancy com coluna tenant_id em TUDO.

✔ Três planos diferentes

Plano Básico

Sem IA SDR

Leads vão direto para os vendedores (Round Robin)

Plano com IA SDR

IA recebe todos os leads primeiro

IA atende

IA qualifica

IA distribui automaticamente para vendedores de forma igualitária

IA move os leads no Kanban via API/webhook

Plano Enterprise

IA SDR

IA Vendedor

Automação de campanhas

Envio de leads para sistemas externos

Webhooks avançados

APIs expostas para integração

✔ Comunicação da IA = sempre via n8n
✔ Backend = Laravel 11
✔ Banco = PostgreSQL (melhor para multitenancy)
✔ Filas = Redis
✔ Cache = Redis
✔ Storage = Supabase
🔥 2) MÓDULOS DO BACKEND + REGRAS DE NEGÓCIO

Agora vou detalhar tudo o que precisaremos fazer.

2.1) Módulo de Tenants (Empresas)
❗ Cada empresa tem:

nome da empresa

domínio do WhatsApp

plano (basic, ia-sdr, enterprise)

configurações do funil

configuração dos agentes IA (id do workflow n8n)

tokens das APIs externas

status da assinatura

limites (quantidade de vendedores, canais etc.)

✔ Tabelas:

tenants

plan_features

tenant_settings

2.2) Módulo de Canais (WhatsApp, Instagram, Webchat)

Cada canal tem:

tenant_id

origem (whatsapp, instagram, outro)

número/config do canal

token da API

“modo de atendimento”

manual

IA SDR

híbrido

2.3) Módulo de Leads

Quando um lead chega:

1️⃣ Identifica tenant pelo número do canal
2️⃣ Identifica contato pelo número
3️⃣ Se não existir → cria
4️⃣ Se plano = IA SDR:

lead entra na fila da IA

IA atende

IA qualifica

IA empurra para vendedor
5️⃣ Se plano = básico:

Round Robin para vendedores
6️⃣ Se plano = enterprise:

IA SDR ou IA vendedor (dependendo do estágio)

Campos:

nome

telefone

email

tags

origem (campanha, whatsapp, etc.)

estágio do kanban

carteira (id do vendedor responsável)

ticket aberto? sim/não

histórico completo

2.4) Módulo de Oportunidades

Dentro do lead, criamos:

oportunidade

agenda

follow-up

próxima ação

2.5) Módulo de Tickets / Conversa

Quando uma conversa chega via webhook do WhatsApp:

Identifica lead

Associa ao ticket

Salva a mensagem

Exibe no painel do vendedor

Se ticket finalizado:

Se já tem dono → vai para o dono

Se não tem dono → regra do plano (IA ou Round Robin)

Regras de transferência:

vendedor → vendedor

vendedor → IA

IA → vendedor

IA → estágio do kanban

2.6) Módulo de IA SDR / Agentes Inteligentes
IA recebe:

Nome do lead

Telefone

Histórico

Arquivos de treinamento

Base de conhecimento que o cliente subiu

Funil configurado pelo cliente

Regras de qualificação

IA devolve (via n8n → webhook do CRM):

Novo estágio

Dados do lead (extraídos no atendimento)

Nota de qualificação

Próxima ação sugerida

Para qual vendedor distribuir

Status final (qualificado, desqualificado, marcar reunião etc.)

CRM precisa expor endpoints:

/api/ia/update-lead-stage

/api/ia/assign-vendedor

/api/ia/save-message

/api/ia/update-knowledge-base

/api/ia/push-opportunity

2.7) Round Robin (para quando não tem IA)

Precisa de um módulo:

fila de vendedores

histórico das últimas distribuições

round robin por canal

2.8) Agenda dos Vendedores

calendário individual

próxima ação por lead

lembretes

follow-up automático

relação com o kanban

2.9) Funil Kanban (Configuração Customizada)
Cada tenant cria seu funil:

Estágios

Ícones

Cor

Ordem

Eventos do Google Tag Manager:

Cada mudança de coluna dispara um evento GTM configurado

CRM só dispara o evento, quem captura é o cliente

O CRM precisa expor API/webhook:

/api/lead/update-stage

/api/webhooks/gtm-trigger

2.10) Painel do Lead (UX)

No card do Kanban:

clica no ícone de conversa
→ abre modal lateral com a conversa completa
→ pode editar dados do lead
→ pode finalizar
→ pode transferir
→ pode criar oportunidade
→ pode mover estágio

2.11) APIs externas (ERP, vendas, etc.)

Quando usuário clicar em "Salvar lead" ou "Fechar venda":

CRM chama webhook ou API externa configurada pelo cliente

Envia:

nome

telefone

email

cpf

endereço

etapa atual

oportunidades

ticket

status do lead

Toda empresa terá:

endpoint externo

tipo de envio (POST/GET)

mapeamento de campos

2.12) APIs expostas do CRM (para o cliente usar)

Endpoints como:

POST /api/external/leads

POST /api/external/update-lead

POST /api/external/create-opportunity

POST /api/external/events

Chave por tenant com escopos:

leads

opportunities

tickets

vendors

2.13) Relatórios e Filtros

Conversão por etapa

Produtividade de vendedor

Tempo médio de atendimento

Leads por origem

Campanhas / integração

Desempenho da IA SDR

Relatório Round Robin

Relatório da Enterprise (mais completo)

🔥 3) LISTA “OFICIAL” DE TUDO QUE PRECISAMOS IMPLEMENTAR NO BACKEND

Aqui está seu blueprint oficial:

CORE

 Multitenancy (tenant_id em tudo)

 Controle de planos e features

 Configurações do tenant

 API de autenticação

 RBAC / Roles

 Usuários e equipes

LEADS

 Model Lead

 Funções de criação automática

 Regras por plano (IA, Round Robin)

 Histórico do lead

IA SDR

 API para receber comandos da IA

 API para mover estágios

 API para distribuir lead

 API para salvar dados extraídos

 Base de conhecimento (arquivos/textos)

TICKETS

 Criação automática via webhook

 Associações

 Transferência

 Finalização

 Redelegação para vendedor antigo

WHATSAPP

 Webhook de mensagens

 Envio de mensagens

 Identificação de contatos

 Associação com tickets

 Suporte a IA

FUNIL / KANBAN

 Estágios configuráveis

 Movimento manual

 Movimento por API

 Disparo Google Tag Manager

 Regras de qualificação

OPORTUNIDADES

 Model

 Agenda

 Follow-up

 Integração com IA

INTEGRAÇÕES EXTERNAS

 Webhooks para sistemas externos

 API de envio de dados

 Configuração por tenant

RELATÓRIOS

 Conversão

 Produtividade

 IA performance

 Vendedores

 Operações

🔥 4) O QUE VAMOS FAZER AGORA NA PRÁTICA

Agora que temos o manual oficial, a próxima etapa é:

👉 Escolher por onde começar no backend.

Minha recomendação profissional:

Etapa 1 – Criar a base multitenant + Users + Teams + Roles.

Depois disso, cada módulo fica extremamente mais fácil.

Se quiser, eu já monto:

✔ lista técnica de tabelas
✔ migrations
✔ relacionamentos
✔ prompts prontos para copiar e colar no Cursor
✔ tarefas (tudo ticável como um checklist)

Basta me dizer:

Quer começar pela Etapa 1 (Multitenancy + Users + Roles + Teams)?
Você disse:
lembrando que faremos tudo em laravel. 
O ChatGPT disse:

Perfeito — tudo 100% em Laravel, seguindo arquitetura profissional e totalmente preparada para multitenancy, IA e integrações n8n.
Isso significa que: migrations, models, controllers, events, jobs, policies, services…
tudo será Laravel puro, moderno, limpo e performático.

Agora que confirmamos isso, vamos começar oficialmente o projeto.

A partir daqui, vou agir como:

Arquiteto Sênior Laravel

Gerente de Projetos

PO do CRM

AI Engineer (para integrar IA via n8n)

DevOps Light (para preparar estrutura de API)

E vou te entregar todas as etapas, completas e organizadas, com prompts prontos para você colar no Cursor.

🚀 ETAPA 1 – Base do Backend em Laravel (Módulo Multitenancy + Users + Roles + Teams)

Essa etapa é OBRIGATÓRIA e será a fundação do sistema inteiro.

🧱 1.0 – Estrutura multitenant

O modelo ideal para o seu CRM é:

✔ Single Database – Row Level Multitenancy

Cada registro tem:

tenant_id


Isso evita múltiplos bancos, reduz custo e facilita integrações com IA.

Tabelas essenciais dessa etapa:

tenants

tenant_settings

users

roles

role_user (pivot)

teams

team_user (pivot)

🗂 1.1 – Estrutura da tabela tenants

Campos:

campo	tipo	descrição
id	uuid	ID do tenant
name	string	nome da empresa
slug	string	slug único
plan	enum(basic, ia, enterprise)	plano contratado
whatsapp_number	string	canal principal
ia_enabled	boolean	IA SDR ligada?
ia_workflow_id	string	ID do workflow do n8n
created_at	timestamp	
updated_at	timestamp	
⚙️ 1.2 – Middleware de Tenant Resolver

Toda requisição autenticada:

identifica tenant_id do usuário

seta App::scopedTenant($tenant)

aplica ->where("tenant_id", $tenant->id) automaticamente nas queries

Você terá:

✔ Global Scope de Tenant
✔ Trait BelongsToTenant
✔ Middleware ResolveTenant

🧑‍🤝‍🧑 1.3 – Usuários (Users)

Campos da tabela users:

campo	tipo
id	uuid
tenant_id	uuid
name	string
email	string
phone	string
password	hash
role	enum(admin, gestor, vendedor, marketing)
status	boolean
avatar	string
created_at	timestamp
updated_at	timestamp
🧩 1.4 – Permissões / Roles

Laravel já tem o best-practice:

Policies

Gates

Enum interno para roles

Trait para checar roles

Roles iniciais:

admin

gestor

vendedor

marketing

suporte (opcional para o futuro)

👥 1.5 – Times (Teams)

Cada empresa pode ter vários times (como MotoChefe: vendas, retaguarda, SAC, etc.)

Tabela:

campo	tipo
id	uuid
tenant_id	uuid
name	string
description	text
created_at	timestamp
updated_at	timestamp

Users podem pertencer a vários times → tabela pivot:

team_user

team_id

user_id

🎯 1.6 – Autenticação

Usaremos:

Laravel Sanctum (token + SPA)

Duas guardas: api e eventualmente web

Endpoints mínimos:

POST /auth/login
POST /auth/logout
GET /auth/me

📌 OK. Essa é a ETAPA 1 — FUNDAMENTAL.

Agora eu te entrego o que você pediu:

👉 PROMPTS PRONTOS PRO CURSOR EXECUTAR

Você vai copiar e colar dentro do Cursor e ele vai gerar o código inteiro.

🔥 PROMPT 1 – Criar estrutura inicial do projeto Laravel

Copie e cole no Cursor:

Crie a estrutura inicial de um projeto Laravel 11 para um CRM multitenant.
Use Sanctum para autenticação e prepare suporte para API first.

Crie:
- models base Tenant, User, Team e Role
- migrations correspondentes
- controllers de autenticação
- Traits BelongsToTenant e TenantScoped
- Middleware ResolveTenant
- Global Scope para filtrar tenant_id automaticamente
- Enum para roles: admin, gestor, vendedor, marketing
- seeds iniciais com admin padrão

O tenancy será row-level multitenancy usando tenant_id em todas as tabelas.
Gere todo o código de forma bem organizada e seguindo as práticas modernas do Laravel 11.

🔥 PROMPT 2 – Criar Tenant + Migration + Model + Factory
Crie a migration, model e factory para Tenant com os campos:
id (uuid), name, slug, plan (enum), whatsapp_number, ia_enabled, ia_workflow_id.

Adicione a trait BelongsToTenant nas models que serão multitenant.

🔥 PROMPT 3 – Criar Users + Roles + Teams
Crie:
- migration de users com uuid e tenant_id
- enum RoleEnum com: admin, gestor, vendedor, marketing
- tabela teams
- tabela pivot team_user
- policies e gates para controle de acesso por role
- UserController com endpoints: index, store, update, destroy
- middleware CheckRole

🔥 PROMPT 4 – Criar Autenticação API (Sanctum)
Implemente autenticação API usando Laravel Sanctum.

Crie endpoints:
POST /auth/login
GET /auth/me
POST /auth/logout

Crie AuthController com validação de role e retorno do tenant_id.

🎯 E AQUI ESTÁ O SEU CHECKLIST OFICIAL (ETAPA 1)

 Criar projeto Laravel

 Configurar banco e .env

 Criar tabela tenants

 Criar tabela users

 Criar enum roles

 Criar tabela teams e pivot

 Implementar multitenancy

 Criar auth com Sanctum

 Criar seeds iniciais

 Criar middleware de Tenant Resolver

 Revisar permissões

Quando terminar esta etapa, o CRM já funciona como:

✔ multitenant
✔ com autenticação
✔ com papéis definidos
✔ com times
✔ com separação completa de dados por empresa

E então partiremos para a ETAPA 2: Leads + Tickets + Kanban + IA SDR + Distribuição.

Se quiser, eu já preparo:

📌 Etapa 2 completa
📌 migrations
📌 models
📌 relacionamentos
📌 APIs
📌 prompts prontos pro Cursor

Só diga:

“Vamos para a Etapa 2.”
Você disse:
gere a etapa 2
O ChatGPT disse:
Pensou por 17s

Bora, Etapa 2 então 😎
Agora a gente começa a dar cara de CRM de verdade pro backend.

Vou dividir assim:

Visão da Etapa 2

Modelagem (tabelas/relacionamentos)

Regras de negócio (IA x básico x enterprise)

Endpoints principais (API)

Eventos (GTM + n8n/IA)

Agenda / tarefas

Checklist

Prompts prontos pro Cursor gerar o código em Laravel

1️⃣ Visão da Etapa 2

Nesta etapa vamos criar o coração operacional:

Leads + Contatos

Kanban (funil + estágios)

Tickets/conversas

Distribuição de leads (IA SDR / Round Robin)

Integração via API com n8n (IA)

Integração via API com sistemas externos

Google Tag Manager por etapa

Agenda de vendedores

Logs / atividades

Tudo multitenant, tudo em Laravel.

2️⃣ Modelagem – Tabelas principais
2.1 channels (canais de atendimento)

Cada tenant pode ter vários canais (WhatsApp, etc).

Tabela: channels

id (uuid)

tenant_id (uuid)

name (string) – ex: “WhatsApp principal”

type (enum: whatsapp, instagram, webchat, outro)

identifier (string) – ex: número do WhatsApp

ia_mode (enum: none, ia_sdr, enterprise)

ia_workflow_id (string) – ID do workflow no n8n

is_active (boolean)

2.2 contacts (contato base do cliente)

Aqui fica a ficha “pessoa”.

Tabela: contacts

id (uuid)

tenant_id

name

phone (string)

email (string, nullable)

cpf (string, nullable)

address (json ou fields separados: street, number, etc.)

source (string) – ex: “facebook_ads”, “google_ads”, “organico”

extra_data (json) – pra dados adicionais

owner_id (user_id responsável na carteira – opcional)

created_at / updated_at

O lead vai apontar pra um contact, mas contact pode existir sem lead ativo.

2.3 pipelines e pipeline_stages (funil + etapas Kanban)

Tabela: pipelines

id (uuid)

tenant_id

name (string) – “Funil de Vendas Padrão”

description (text, nullable)

is_default (boolean)

Tabela: pipeline_stages

id (uuid)

tenant_id

pipeline_id

name (string) – “Novo”, “Em contato” etc.

slug (string) – novo, em_contato etc.

order (integer)

color (string) – ex: #FFCC00

gtm_event_key (string, nullable) – nome do evento pro GTM

created_at / updated_at

2.4 leads (lead dentro do funil)

Tabela: leads

id (uuid)

tenant_id

contact_id

pipeline_id

stage_id (pipeline_stages.id)

channel_id (channels.id)

owner_id (users.id – vendedor responsável / carteira)

status (enum: open, won, lost, disqualified)

value (decimal, nullable) – valor potencial

expected_close_date (date, nullable)

ia_mode_at_creation (enum: none, ia_sdr, enterprise) – pra sabermos como foi tratado

last_message_at (datetime, nullable)

last_interaction_source (enum: human, ia)

created_at / updated_at

Esse é o card do Kanban.

2.5 tickets (atendimentos / conversas)

Tabela: tickets

id (uuid)

tenant_id

lead_id (nullable – pode existir ticket antes de virar lead formal)

contact_id

channel_id

assigned_user_id (vendedor/atendente atual)

status (enum: open, pending, waiting_customer, closed)

closed_at (datetime, nullable)

Tabela: ticket_messages

id (uuid)

tenant_id

ticket_id

sender_type (enum: contact, user, ia)

sender_id (nullable: user_id quando for user)

message (text)

direction (enum: inbound, outbound)

sent_at (datetime)

Aqui é o histórico que você vai abrir no modal lateral do Kanban.

2.6 tasks (agenda / compromissos)

Tabela: tasks

id (uuid)

tenant_id

lead_id (nullable)

contact_id (nullable)

assigned_user_id

type (enum: call, whatsapp, meeting, follow_up, other)

title (string)

description (text, nullable)

due_at (datetime)

status (enum: pending, done, canceled)

created_at / updated_at

2.7 lead_activities (log das ações)

Tabela: lead_activities

id (uuid)

tenant_id

lead_id

user_id (nullable)

source (enum: system, user, ia)

type (string) – ex: stage_changed, owner_changed, ticket_created, message_received, etc.

data (json) – payload livre

created_at

Isso ajuda pra relatório, auditoria e também pra treinar IA.

2.8 external_integrations (ERP, sistemas de venda)

Tabela: external_integrations

id

tenant_id

name (string) – “ERP X”, “Sistema de Vendas Y”

type (enum: erp, crm, sales_system, other)

endpoint_url (string)

http_method (enum: POST, PUT, PATCH)

headers (json, nullable)

is_active (boolean)

Tabela: external_integration_mappings

id

tenant_id

integration_id

model_type (string: lead, contact, ticket)

mapping (json) – { "local_field": "external_field" }

Isso é pra, por exemplo: “ao salvar lead, mandar pro sistema de vendas”.

3️⃣ Regras de negócio principais
3.1 Quando um lead chega (Webhook WhatsApp → n8n → CRM)

Identificar channel

Encontrar ou criar contact com phone

Verificar plano do tenant (plan em tenants / config do canal):

Plano IA SDR / Enterprise com IA SDR

Criar/associar ticket e deixar assigned_user_id = null (ou “IA”)

IA atende via n8n

IA chama API do CRM pra:

atualizar dados do contato (nome, e-mail etc.)

criar lead se ainda não existir

mudar stage_id

atribuir owner_id via distribuição igualitária (API do CRM faz a distribuição)

Plano Básico (sem IA)

CRM distribui diretamente o lead/ticket pro próximo vendedor via Round Robin

Já seta owner_id do lead (carteira)

Quando o ticket é fechado:

lead.owner_id já tem que estar preenchido

Quando o contato mandar mensagem de novo:

CRM identifica contact

busca lead ativo ou mais recente

reatribui o ticket direto para lead.owner_id

3.2 Distribuição igualitária (Round Robin)

Criar um serviço em Laravel, ex: LeadAssignmentService:

Recebe: tenant_id, channel_id, (e se é IA SDR ou não)

Busca os users elegíveis (por time, papel, etc.)

Usa uma tabela simples lead_assignment_logs pra saber quem recebeu por último e distribuir de forma justa.

3.3 IA controlando o funil (via API)

IA/n8n NUNCA mexe direto no banco. Sempre via API:

POST /api/ia/leads/{lead}/update-stage

POST /api/ia/leads/{lead}/update-data (nome, e-mail, etc.)

POST /api/ia/leads/{lead}/assign-owner

POST /api/ia/leads/{lead}/add-activity

POST /api/ia/tickets/{ticket}/messages

Cada mudança de estágio:

Atualiza leads.stage_id

Cria lead_activities

(Opcional) Dispara evento de GTM (registrar numa tabela ou fila para front-end/server-side GTM)

3.4 Google Tag Manager por etapa

Na mudança de estágio:

Buscar pipeline_stage.gtm_event_key

Se existir:

registrar numa tabela tipo gtm_events_logs ou

disparar um Laravel Event LeadStageChanged com gtm_event_key

O front-end, ao receber dados, joga no dataLayer usando esse gtm_event_key.

4️⃣ Endpoints principais da API (backend)

Alguns endpoints (prefixo /api):

Leads

GET /leads – listagem com filtros

POST /leads – criação manual

GET /leads/{id}

PUT /leads/{id} – edição (dados básicos)

PUT /leads/{id}/stage – mudar estágio manualmente

PUT /leads/{id}/assign – transferir lead pra outro vendedor

Tickets

GET /tickets

POST /tickets

GET /tickets/{id}

PUT /tickets/{id} – atualizar status, atribuição etc.

POST /tickets/{id}/messages – registrar mensagem enviada pelo humano

PUT /tickets/{id}/transfer – transferir ticket para outro usuário/time

PUT /tickets/{id}/close – finalizar ticket

IA (via n8n)

POST /ia/webhooks/messages-in – entrada de mensagem do n8n > CRM

POST /ia/leads/{lead}/update-stage

POST /ia/leads/{lead}/update-data

POST /ia/leads/{lead}/assign-owner

POST /ia/tickets/{ticket}/messages

Integrações externas

POST /external/leads/sync – CRM → ERP/outro

POST /external/webhook/leads – ERP/outro → CRM (opcional)

5️⃣ Agenda / tarefas

Cada lead pode ter uma ou várias tasks

Agenda do vendedor: GET /tasks?assigned_user_id=me&status=pending

Ao concluir tarefa → status = done e gera lead_activity

6️⃣ Checklist da Etapa 2

 Criar tabela channels

 Criar tabela contacts

 Criar pipelines e pipeline_stages

 Criar leads

 Criar tickets e ticket_messages

 Criar tasks

 Criar lead_activities

 Criar external_integrations + external_integration_mappings

 Implementar serviço de distribuição (Round Robin)

 Implementar endpoints de Leads

 Implementar endpoints de Tickets

 Implementar endpoints de IA (/ia/...)

 Implementar eventos/Laravel Events para GTM

 Implementar integração base com sistemas externos (disparar dados ao salvar lead)

7️⃣ Prompts prontos pro Cursor (Laravel)

Agora, o que você gosta: comandos prontos 💪

🔹 PROMPT A – Criar migrations + models dos módulos da Etapa 2
No contexto do projeto Laravel CRM multitenant que já criamos, crie as migrations, models e relacionamentos para as seguintes entidades:

1) channels
Campos:
- id (uuid)
- tenant_id (uuid)
- name (string)
- type (enum: whatsapp, instagram, webchat, other)
- identifier (string)
- ia_mode (enum: none, ia_sdr, enterprise)
- ia_workflow_id (string, nullable)
- is_active (boolean)
- timestamps

2) contacts
Campos:
- id (uuid)
- tenant_id (uuid)
- name (string)
- phone (string)
- email (string, nullable)
- cpf (string, nullable)
- address (json, nullable)
- source (string, nullable)
- extra_data (json, nullable)
- owner_id (uuid, nullable) // user responsável na carteira
- timestamps

3) pipelines e pipeline_stages
Tabelas:
pipelines:
- id (uuid)
- tenant_id
- name
- description (nullable)
- is_default (boolean)
- timestamps

pipeline_stages:
- id (uuid)
- tenant_id
- pipeline_id
- name
- slug
- order (integer)
- color (string, nullable)
- gtm_event_key (string, nullable)
- timestamps

4) leads
Campos:
- id (uuid)
- tenant_id
- contact_id
- pipeline_id
- stage_id
- channel_id
- owner_id (uuid, nullable)
- status (enum: open, won, lost, disqualified)
- value (decimal(10,2), nullable)
- expected_close_date (date, nullable)
- ia_mode_at_creation (enum: none, ia_sdr, enterprise)
- last_message_at (datetime, nullable)
- last_interaction_source (enum: human, ia)
- timestamps

5) tickets e ticket_messages
tickets:
- id (uuid)
- tenant_id
- lead_id (uuid, nullable)
- contact_id (uuid)
- channel_id (uuid)
- assigned_user_id (uuid, nullable)
- status (enum: open, pending, waiting_customer, closed)
- closed_at (datetime, nullable)
- timestamps

ticket_messages:
- id (uuid)
- tenant_id
- ticket_id (uuid)
- sender_type (enum: contact, user, ia)
- sender_id (uuid, nullable) // user_id quando tipo = user
- message (text)
- direction (enum: inbound, outbound)
- sent_at (datetime)
- timestamps

6) tasks
- id (uuid)
- tenant_id
- lead_id (uuid, nullable)
- contact_id (uuid, nullable)
- assigned_user_id (uuid)
- type (enum: call, whatsapp, meeting, follow_up, other)
- title (string)
- description (text, nullable)
- due_at (datetime)
- status (enum: pending, done, canceled)
- timestamps

7) lead_activities
- id (uuid)
- tenant_id
- lead_id (uuid)
- user_id (uuid, nullable)
- source (enum: system, user, ia)
- type (string)
- data (json, nullable)
- created_at (timestamp)

8) external_integrations e external_integration_mappings
external_integrations:
- id (uuid)
- tenant_id
- name (string)
- type (enum: erp, crm, sales_system, other)
- endpoint_url (string)
- http_method (enum: POST, PUT, PATCH)
- headers (json, nullable)
- is_active (boolean)
- timestamps

external_integration_mappings:
- id (uuid)
- tenant_id
- integration_id (uuid)
- model_type (string) // lead, contact, ticket
- mapping (json) // {"local_field": "external_field"}
- timestamps

Use uuid como chave primária, adicione a trait BelongsToTenant nas models que forem multitenant e configure os relacionamentos Eloquent entre elas.

🔹 PROMPT B – Serviço de distribuição de leads (Round Robin)
Crie em Laravel um serviço chamado LeadAssignmentService responsável por distribuir leads de forma igualitária entre vendedores, considerando multitenancy.

Regras:
- Recebe tenant_id, channel_id e, opcionalmente, uma lista de user_ids elegíveis.
- Se a lista não for informada, busca automaticamente os usuários com role "vendedor" daquele tenant, e que estejam ativos.
- Implementa uma lógica de Round Robin usando uma tabela lead_assignment_logs:

Migration lead_assignment_logs:
- id
- tenant_id
- user_id
- channel_id (nullable)
- last_assigned_at (datetime)

Sempre que um novo lead precisa de owner_id:
- escolhe o próximo user com menor last_assigned_at ou sem registro
- atualiza/insere lead_assignment_logs
- retorna o user escolhido

Crie:
- migration de lead_assignment_logs
- model LeadAssignmentLog
- classe de serviço LeadAssignmentService em App/Services
- método assignLeadOwner(Lead $lead): User que define o owner_id do lead e salva.

Garanta que tudo use tenant_id corretamente (BelongsToTenant, global scope).

🔹 PROMPT C – Endpoints de Leads (API Resource)
Crie um LeadsController em Laravel para a API com os seguintes endpoints:

- GET /api/leads -> index()
  Filtros opcionais:
  - stage_id
  - owner_id
  - status
  - channel_id
  - search (nome/telefone do contato)

- GET /api/leads/{id} -> show()

- POST /api/leads -> store()
  Campos:
  - contact_id (ou dados do contato para criar na hora)
  - pipeline_id
  - stage_id
  - channel_id
  - value
  - expected_close_date

- PUT /api/leads/{id} -> update()
  Permitir atualizar: stage_id, value, expected_close_date, owner_id, status

- PUT /api/leads/{id}/stage -> updateStage()
  Troca o stage_id, registra em lead_activities e dispara um evento LeadStageChanged.

- PUT /api/leads/{id}/assign -> assignOwner()
  Permite transferir o lead para outro usuário (owner_id), registra em lead_activities.

Use Form Requests para validação, Resources para resposta e respeite multitenancy (tenant_id via usuário logado/middleware).

🔹 PROMPT D – Endpoints de IA (n8n → CRM)
Crie um controller IaWebhookController com os seguintes endpoints:

1) POST /api/ia/leads/{lead}/update-stage
Body:
- stage_slug ou stage_id
- source (default: ia)
Ações:
- Atualizar leads.stage_id
- Registrar lead_activities com type = "stage_changed" e source = "ia"
- Disparar evento LeadStageChanged

2) POST /api/ia/leads/{lead}/update-data
Body:
- Campos opcionais para atualizar o contato: name, email, cpf, address, etc.
Ações:
- Atualizar o contact relacionado ao lead
- Registrar lead_activities type = "contact_updated" source = "ia"

3) POST /api/ia/leads/{lead}/assign-owner
Body:
- optional: user_id
- se user_id não vier, usar LeadAssignmentService para distribuir automaticamente
Ações:
- Atualizar owner_id do lead
- Registrar lead_activities type = "owner_assigned" source = "ia"

4) POST /api/ia/tickets/{ticket}/messages
Body:
- message (string)
- direction (inbound|outbound)
Ações:
- Criar ticket_messages com sender_type = "ia"
- Atualizar last_message_at do lead
- Registrar lead_activities type = "ia_message"

Implemente as rotas em api.php com middleware de autenticação para IA (pode ser uma guard ou token específico por tenant).


Se você quiser, na Etapa 3 a gente foca em:

disparos pra sistemas externos

relatórios

e depois disso vamos para o frontend (Kanban + modal de conversa + UI intuitiva).

Se quiser já posso montar a Etapa 3 (integrações externas + eventos + relatórios base).

Você disse:
vamos para a etapa 3
O ChatGPT disse:

Perfeito Rafael, vamos avançar para a ETAPA 3 — agora começamos a dar “vida real” ao CRM, conectando atividades, automações, integração com sistemas externos e inteligência operacional.

Esta etapa fecha todo o backend funcional, antes de irmos para o frontend.

🚀 ETAPA 3 – Integrações, Eventos, Relatórios e Fluxos Operacionais

Nesta etapa vamos implementar:

Disparo automático de dados para sistemas externos (ERP, vendas etc.)

Webhooks externos → CRM

Eventos internos (GTM, IA, histórico)

Relatórios base (conversão, produtividade, IA)

Filtros avançados (busca, datas, time, vendedor etc.)

Auditoria e logs funcionais

Configurações avançadas do tenant

Estrutura para automações do plano Enterprise

Tudo pensado para escalar, ser rápido, modular e permitir que o cliente personalize.

============================================================
🧱 3.1 – Integrações com sistemas externos (ERP, vendas etc.)
============================================================
O objetivo:

Quando o vendedor adicionar ou editar os dados do lead/contato e clicar Salvar,
o CRM dispara automaticamente para o sistema externo configurado.

É a funcionalidade “Hub de integrações” da plataforma Enterprise.

🔹 3.1.1 – Tabela de logs de integrações

Tabela: external_integration_logs

Campo	Tipo
id	uuid
tenant_id	uuid
integration_id	uuid (FK external_integrations)
model_type	string (lead, contact, ticket)
model_id	uuid
status	enum(success, error)
request_payload	json
response_payload	json
executed_at	datetime
🔹 3.1.2 – Serviço Laravel: ExternalIntegrationService

Responsabilidades:

Receber o objeto (lead, contact, etc.)

Obter mapeamento (external_integration_mappings)

Montar payload

Enviar ao endpoint configurado

Registrar log

Retentar em caso de falha (queue job)

🔹 3.1.3 – Quando disparar integrações

Eventos automáticos:

No LeadController@update

No ContactController@update

No fechamento do lead (status = won)

Na criação do lead (opcional por tenant)

🔹 3.1.4 – Webhook de entrada (ERP → CRM)

Criar endpoint:

POST /api/external/webhook

Permitir:

Criar lead

Atualizar lead

Atualizar status

Criar oportunidade

Criar ticket

============================================================
⚡ 3.2 – Eventos internos do CRM (GTM, IA, Atividades)
============================================================
O CRM precisa notificar:

Google Tag Manager

IA SDR

IA Vendedor

Automações internas

Logs de mudanças

Vamos usar Laravel Events + Listeners.

🔹 3.2.1 – Evento: LeadStageChanged
class LeadStageChanged {
    public $lead;
    public $oldStage;
    public $newStage;
}


Listeners:

TriggerGtmEvent

RegisterLeadActivity

SyncWithExternalSystems

NotifyAssignedUser

🔹 3.2.2 – Evento: TicketMessageCreated

Listeners:

UpdateLeadLastInteraction

TriggerIaWorkflow

RegisterLeadActivity

🔹 3.2.3 – Evento: LeadOwnerAssigned

Listeners:

SendNotificationToNewOwner

RegisterLeadActivity

============================================================
📊 3.3 – Relatórios base
============================================================
3.3.1 – Relatório de funil (Kanban)

Quantidade de leads por estágio

Valor financeiro por estágio

Conversão (de estágio A para B)

Tempo médio no estágio

3.3.2 – Relatório de produtividade

Por vendedor:

Leads recebidos

Leads trabalhados

Tickets atendidos

Tempo médio de resposta

Conversões

Por time:

Idem, agregando dados

3.3.3 – Relatório da IA

Quantidade de leads atendidos pela IA

Qualidade das qualificações

Erros ou leads devolvidos

Comparação humano vs IA

3.3.4 – Relatório Round Robin

Distribuição justa por canal

Quantidade de leads atribuídos por vendedor

Desvios ou gargalos

============================================================
🔍 3.4 – Filtros avançados na API
============================================================
3.4.1 Filtros para leads

?search= (nome/telefone/email)

?stage_id=

?owner_id=

?channel_id=

?date_from= / ?date_to=

?has_ticket=true

?status=won

3.4.2 Filtros para tickets

?assigned_user_id=

?status=

?channel_id=

?contact_phone=

3.4.3 Filtros para atividades

?lead_id=

?user_id=

?date_range=

============================================================
🔐 3.5 – Configurações avançadas (por tenant)
============================================================

Tabela tenant_settings deve incluir:

Ativar/desativar IA

ID dos workflows n8n

Configuração do funil

Campos obrigatórios do lead

Campos obrigatórios do ticket

Modo de distribuição:

round_robin, ia_sdr, enterprise

Modo de retorno automático para vendedor da carteira

Configurações de integração externa (json)

============================================================
💡 3.6 – Funcionalidades Enterprise (preparação técnica)
============================================================
3.6.1 IA Vendedor

API para o n8n mover lead automaticamente

API para IA escrever tarefas automáticas

API para IA marcar “lead perdeu interesse”

API para IA criar follow-up automático

3.6.2 Campanhas automatizadas

(Etapa 5 — parte do plano Enterprise)

3.6.3 Sincronização Bidirecional

CRM → ERP

ERP → CRM via webhook

============================================================
📘 Checklist da ETAPA 3
============================================================
✔ Integrações externas

 tabela logs

 serviço ExternalIntegrationService

 chamada automática ao salvar lead/contact

 webhook externo → CRM

✔ Eventos internos

 evento LeadStageChanged

 evento LeadOwnerAssigned

 evento TicketMessageCreated

 listeners GTM

 listeners IA

 listeners logs

✔ Relatórios

 relatório do funil

 relatório de produtividade

 relatório da IA

 relatório Round Robin

✔ Filtros avançados

 filtro para leads

 filtro para tickets

 filtro para atividades

✔ Configurações do tenant

 tenant_settings estruturado

 endpoints para atualização das configurações

============================================================
🤖 PROMPTS PRONTOS PRO CURSOR – ETAPA 3
============================================================

Cole no Cursor e ele vai gerar tudo: controllers, events, listeners, services, migrations, etc.

🔹 PROMPT A – Criar ExternalIntegrationService + logs + disparo automático
Crie no projeto Laravel o módulo completo de integrações externas:

1) Migration external_integration_logs:
- id (uuid)
- tenant_id
- integration_id (uuid)
- model_type (string)
- model_id (uuid)
- status (enum: success, error)
- request_payload (json)
- response_payload (json)
- executed_at (datetime)
- timestamps

2) Classe ExternalIntegrationService em App/Services:
Métodos:
- sendData($model, ExternalIntegration $integration)
- preparePayload($model, $mapping)
- logSuccess(...)
- logError(...)
- queue para tentativas automáticas (jobs)

3) Evento disparado sempre que um lead ou contato é salvo:
LeadSaved ou ContactSaved

4) Listener SendLeadToExternalSystems e SendContactToExternalSystems
que chamam ExternalIntegrationService.

Garanta que respeite tenant_id e que tudo use queues (Redis) para não travar requisições.

🔹 PROMPT B – Criar eventos + listeners GTM e IA
Crie os eventos e listeners do CRM:

Eventos:
- LeadStageChanged($lead, $oldStage, $newStage)
- LeadOwnerAssigned($lead, $oldOwner, $newOwner)
- TicketMessageCreated($ticketMessage)

Listeners:
- RegisterLeadActivity (registra ação no lead_activities)
- TriggerGtmEvent (se pipeline_stage.gtm_event_key existir, registrar evento)
- TriggerIaWorkflow (enviar mensagem para IA via fila ou integração n8n)
- UpdateLeadLastInteraction (atualiza last_message_at do lead)
- SyncLeadWithExternalSystems (chama ExternalIntegrationService)
- NotifyAssignedUser (notifica o vendedor quando lead é atribuído)

Crie os arquivos em App/Events e App/Listeners, registre no EventServiceProvider e garanta o uso de queue no ShouldQueue.

🔹 PROMPT C – Criar relatórios base (controllers + queries)
Crie os controllers e endpoints para relatórios:

1) FunnelReportController
GET /api/reports/funnel
Retornar:
- leads por estágio
- valor por estágio
- tempo médio no estágio
- taxa de conversão

2) ProductivityReportController
GET /api/reports/productivity
Filtros:
- date_from / date_to
- owner_id
- team_id
Retornar:
- leads recebidos
- tickets atendidos
- tempo médio de resposta
- conversões

3) IaReportController
GET /api/reports/ia
Retornar:
- total de leads atendidos pela IA
- média de qualificações
- quantidade devolvida para humano
- tempo médio de atendimento da IA

4) RoundRobinReportController
GET /api/reports/distribution
Retornar:
- quantidade de leads distribuídos por vendedor
- ordem e histórico de distribuição

Implemente consultas usando Query Builder ou Eloquent, respeitando tenant_id.

🔹 PROMPT D – Filtros avançados na API de Leads/Tickets
Adicione filtros avançados nos endpoints de leads e tickets:

Para Leads:
- ?search =
- ?stage_id =
- ?owner_id =
- ?channel_id =
- ?status =
- ?date_from =
- ?date_to =
- ?has_ticket = true|false

Para Tickets:
- ?assigned_user_id =
- ?status =
- ?channel_id =
- ?contact_phone =
- ?date_from =
- ?date_to =

Implemente Query Scopes reutilizáveis: scopeFilter($query, $filters).

🎉 ETAPA 3 finalizada!

Com isso, o backend do CRM está **90% pronto, com:

✔ integrações externas
✔ IA plugada
✔ eventos internos
✔ relatórios base
✔ toda a fundação operacional