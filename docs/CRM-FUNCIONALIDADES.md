# CRM Omnify Hub - Documento de Funcionalidades

## Visao Geral

O **Omnify Hub** e um CRM multi-tenant baseado em SaaS com inteligencia artificial integrada, projetado para gestao de vendas, atendimento ao cliente e marketing digital. O sistema oferece uma suite completa de ferramentas para empresas que buscam automatizar e otimizar seus processos comerciais.

---

## Arquitetura Tecnica

| Componente | Tecnologia |
|------------|------------|
| Frontend | React 19 + Vite + TypeScript + Tailwind CSS |
| Backend | Laravel 12 + PHP 8.2 |
| Servico IA | FastAPI (Python) - Microservico para agentes inteligentes |
| Banco de Dados | PostgreSQL (via Supabase) |
| Filas | Redis/Database |
| Autenticacao | Laravel Passport (OAuth2) |
| Real-time | Laravel Echo + Pusher WebSockets |
| Storage | AWS S3 / Cloudflare R2 |
| Integracoes | Meta APIs, n8n, Linx Smart API |

---

## 1. GESTAO DE LEADS E CRM

### 1.1 Modulo de Leads
- **CRUD Completo**: Criar, visualizar, editar e excluir leads
- **Atribuicao Inteligente**: Distribuicao round-robin para usuarios/filas
- **Pipeline de Vendas**: Suporte a multiplos pipelines com estagios customizaveis
- **Lead Scoring**: Pontuacao automatica de leads com sugestoes de acoes
- **Memoria de Lead**: Contexto de longo prazo para conversas
- **Importacao em Massa**: Upload via CSV/Excel com mapeamento de campos
- **Coleta de Dados**: Formulario de dados do cliente para fechamento
- **Atribuicao UTM**: Rastreamento de origem de campanhas

### 1.2 Pipelines (Funis de Vendas)
- Multiplos pipelines simultaneos
- Estagios personalizaveis por pipeline
- Templates de atividades por estagio (acoes obrigatorias)
- Permissoes de usuario por pipeline
- Regras de avanco entre estagios
- Acompanhamento de progresso

### 1.3 Gestao de Filas
- Criacao e gerenciamento de filas/setores
- Atribuicao de usuarios as filas
- Distribuicao automatica de leads
- Roteamento por menu especifico
- Estatisticas por fila

---

## 2. COMUNICACAO E ATENDIMENTO

### 2.1 Sistema de Tickets/Chat
- **Multi-canal**: WhatsApp, Instagram, Email
- **Mensagens em Tempo Real**: WebSockets para atualizacoes instantaneas
- **Edicao/Exclusao**: Gerenciamento de mensagens enviadas
- **Anexos**: Suporte a arquivos e midias
- **Transferencia**: Entre usuarios e filas
- **Controle de Conversas**: Abertura, fechamento e reabertura
- **Toggle IA**: Alternancia entre atendimento automatizado e humano

### 2.2 Integracao WhatsApp (API Oficial Meta)
- Conexao com API Cloud do WhatsApp
- Gerenciamento de templates de mensagem
- Categorias e status de aprovacao
- Envio de midias (imagens, documentos, audios)
- Webhooks para mensagens recebidas
- Validacao e formatacao de numeros
- Envio em massa via templates

### 2.3 Integracao Instagram
- Atendimento via Direct Messages
- Compartilhamento de midias
- Gestao de conversas

---

## 3. AGENTES INTELIGENTES (IA)

### 3.1 Agente SDR (Sales Development Representative)
- **Qualificacao Automatica**: IA qualifica e nutre leads
- **Progressao Autonoma**: Avanco automatico entre estagios
- **RAG (Retrieval-Augmented Generation)**: Upload de documentos para contexto
- **Deteccao de FAQ**: Identificacao automatica de perguntas frequentes
- **Regras de Escalacao**: Configuracao de quando transferir para humano
- **Instrucoes por Estagio**: Regras especificas para cada fase
- **Teste de Prompts**: Preview de respostas do agente

### 3.2 Agente de Ads Intelligence
- **Integracao Meta/Google Ads**: Conexao com contas de anuncios
- **Criacao de Campanhas**: Gerenciamento completo via IA
- **Gestao de Criativos**: Upload de imagens/videos
- **Geracao de Copys**: IA cria textos para anuncios
- **Guardrails**: Regras de seguranca de marca
- **Automacao com Aprovacao**: Workflow de aprovacao para acoes
- **Insights de Performance**: Sugestoes de otimizacao
- **Base de Conhecimento**: Contexto para o agente

### 3.3 Agente Content Creator
- Descoberta de videos virais
- Analise de conteudo
- Perfis de criadores
- Curadoria de conteudo
- Sugestoes baseadas em IA

### 3.4 Agente de BI (Business Intelligence)
- **Dashboards Executivos**: Visualizacao de KPIs
- **Analise de Funil**: Metricas de vendas
- **Metricas de Suporte**: Acompanhamento de atendimento
- **Performance de Marketing**: Analise de campanhas
- **Tracking de IA**: Monitoramento de agentes
- **Insights Proativos**: Sugestoes automaticas
- **Workflow de Aprovacao**: Para execucao de acoes
- **Geracao de Relatorios**: PDF e Excel

---

## 4. VENDAS E FECHAMENTO

### 4.1 Modulo de Vendas
- Registro de deals fechados
- Associacao de produtos a vendas
- Multiplos itens por venda
- Estatisticas e metricas de vendas
- Atribuicao lead-to-sale

### 4.2 Dados do Cliente
- Validacao de CPF/CNPJ
- Consulta de CEP
- Coleta de endereco completo
- Formulario de dados para fechamento

---

## 5. PRODUTOS E CATALOGO

### 5.1 Gestao de Produtos
- CRUD completo de produtos
- Categorias e subcategorias
- Multiplas imagens com selecao de principal
- Duplicacao de produtos
- Envio rapido no chat (product sharing)

### 5.2 Landing Pages
- **Page Builder**: Construtor drag-and-drop
- **Tipos de Blocos**: Hero, features, testimonials, CTA, etc.
- **Publicacao**: Controle de publicar/despublicar
- **Estatisticas**: Metricas de trafego
- **Upload de Imagens**: Gestao de assets
- **UTM Tracking**: Parametros de campanha

---

## 6. MARKETING E AUTOMACAO

### 6.1 Google Tag Manager
- Configuracao de eventos por pipeline
- Eventos por estagio
- Mapeamento de campos customizados

### 6.2 Integracoes Externas
- **Linx ERP**: Sincronizacao com sistema de gestao
- **Webhooks**: Conectividade generica
- **Mapeamento de Campos**: Para sistemas externos
- **Logs de Integracao**: Historico e retry
- **Templates de Preview**: Visualizacao antes do envio

### 6.3 Respostas Rapidas
- Respostas pre-configuradas por usuario
- Substituicao de variaveis dinamicas
- Sistema de reordenacao
- Renderizacao com variaveis

---

## 7. GESTAO DE PERFORMANCE

### 7.1 KPIs (Indicadores-Chave)
- Definicoes de KPI por tenant
- Tracking por usuario
- Analise de tendencias
- KPIs padrao com auto-inicializacao
- Snapshots de valores

### 7.2 KPRs (Metas)
- Definicao de metas individuais/equipe
- Tracking de progresso
- Ranking de performance
- Ativacao e conclusao de metas
- Distribuicao para membros da equipe

### 7.3 Analise de Atividades
- Metricas de contribuicao pessoal
- Comparacao entre usuarios
- Rastreamento de jornada do lead
- Analise de efetividade por sequencia
- Relatorios de efetividade

---

## 8. GAMIFICACAO

### 8.1 Sistema de Pontos
- Regras configuraves de pontuacao
- Tracking de transacoes
- Pontos por acao (leads, vendas, atividades)

### 8.2 Sistema de Tiers (Niveis)
- Multiplos niveis de progressao
- Tracking de avanco
- Beneficios por tier

### 8.3 Conquistas (Achievements)
- Definicoes de conquistas
- Tracking por usuario
- Notificacoes de desbloqueio
- Badges visuais

### 8.4 Leaderboards
- Rankings em tempo real
- Periodos customizaveis
- Comparacao entre usuarios

### 8.5 Recompensas
- Catalogo de premios
- Sistema de resgate
- Workflow de aprovacao
- Tracking de entrega
- Historico por usuario

---

## 9. AGENDAMENTOS

### 9.1 Gestao de Compromissos
- Calendario visual
- Verificacao de disponibilidade
- Confirmacao/cancelamento
- Tracking de no-shows
- Reagendamento

### 9.2 Horarios de Usuario
- Configuracao de disponibilidade semanal
- Gestao de agenda pessoal

---

## 10. APRENDIZADO E OTIMIZACAO

### 10.1 Sistema de Aprendizado do Agente
- Feedback de mensagens (like/dislike)
- Deteccao automatica de FAQs
- Analise de padroes de conversa
- Estatisticas de aprendizado por agente

### 10.2 Aprendizado de Ads
- Deteccao de padroes de performance
- Geracao automatica de insights
- Recomendacoes baseadas em padroes

---

## 11. SUPORTE E WORKFLOWS DE APROVACAO

### 11.1 Suporte/Chat Interno
- Gestao de sessoes de suporte
- Chat interno com acoes de aprovacao
- Log de atividades de suporte

### 11.2 Solicitacoes de Correcao
- Pedidos de correcao iniciados pelo usuario
- Feedback de respostas WhatsApp
- Workflow de aprovacao/rejeicao
- Campos de resposta backup

---

## 12. ADMINISTRACAO E MULTI-TENANT

### 12.1 Autenticacao
- OAuth2 via Laravel Passport
- Tokens Bearer
- Isolamento multi-tenant

### 12.2 Roles e Permissoes
| Role | Descricao |
|------|-----------|
| Super Admin | Controle global do sistema |
| Admin | Controle a nivel de tenant |
| Manager/Gestor | Visao de equipe |
| Seller/Atendente | Apenas propria carteira |
| Marketing | Acesso a campanhas |
| Custom | Roles personalizadas |

### 12.3 Funcionalidades Multi-Tenant
- Dados isolados por tenant
- **Feature Flags**: sdr_ia, landing_pages, appointments, ads_intelligence, etc.
- Configuracoes e branding por tenant
- Tracking de uso e quotas
- Gestao de billing e custos

---

## 13. REAL-TIME E NOTIFICACOES

- **WebSockets**: Chat em tempo real
- **Presence Tracking**: Status de usuarios
- **Broadcast Events**: Atualizacoes de leads e tickets
- **Leaderboard Live**: Rankings em tempo real
- **Notificacoes Push**: Alertas e avisos

---

## 14. MOBILE E RESPONSIVIDADE

- Design React responsivo
- Navegacao especifica para mobile
- Componentes touch-friendly
- PWA-ready

---

## 15. RELATORIOS E ANALYTICS

### Tipos de Relatorios
- Performance de vendas
- Metricas de atendimento
- Efetividade de campanhas
- ROI de marketing
- Analise de funil
- Performance de agentes IA
- Engajamento de equipe

### Formatos de Exportacao
- PDF
- Excel
- CSV

---

## 16. INTEGRACOES DISPONIVEIS

| Integracao | Tipo | Descricao |
|------------|------|-----------|
| WhatsApp | Comunicacao | API oficial Meta |
| Instagram | Comunicacao | Direct Messages |
| Linx Smart API | ERP | Sincronizacao de dados |
| n8n | Automacao | Workflows customizados |
| Google Tag Manager | Marketing | Tracking de eventos |
| Meta Ads | Publicidade | Facebook/Instagram Ads |
| Supabase | Infraestrutura | Storage e analytics |
| AWS S3/R2 | Storage | Armazenamento de arquivos |

---

## 17. SEGURANCA

- Autenticacao OAuth2
- Tokens com expiracao
- Rate limiting
- Sanitizacao de inputs
- CORS configuravel
- Logs de auditoria
- Isolamento de dados por tenant
- Criptografia de dados sensiveis

---

## 18. JOBS E PROCESSAMENTO ASSINCRONO

| Job | Funcao |
|-----|--------|
| ProcessLeadImport | Processamento de importacao CSV |
| ProcessSdrDocument | Embedding de documentos para RAG |
| ProcessKnowledgeEmbedding | Embedding de base de conhecimento |
| ProcessAgentResponse | Processamento de respostas do agente |
| ProcessAdsAutomationJob | Execucao de automacoes de ads |
| SyncAdMetricsJob | Sincronizacao de metricas Meta Ads |
| CalculateKpisJob | Recalculo de KPIs |
| ProcessScheduledTasks | Execucao de tarefas agendadas |

---

## 19. EVENTOS DO SISTEMA

| Evento | Trigger |
|--------|---------|
| LeadCreated | Novo lead criado |
| LeadUpdated | Lead modificado |
| LeadOwnerAssigned | Atribuicao de proprietario |
| LeadStageChanged | Mudanca de estagio |
| TicketMessageCreated | Nova mensagem no chat |
| GtmEventTriggered | Tracking GTM |
| DealActivityCompleted | Atividade concluida |
| AchievementUnlocked | Conquista desbloqueada |
| PointsEarned | Pontos ganhos |
| UserTierChanged | Mudanca de tier |

---

## 20. METRICAS DO SISTEMA

- **105+ modelos** de banco de dados
- **77 controllers** de API
- **32 classes de servico** para logica de negocio
- **27 modulos de paginas** no frontend
- **14 jobs** de processamento assincrono
- **10 eventos** em tempo real
- **1.373 linhas** de definicao de rotas API

---

## Conclusao

O **Omnify Hub** e uma solucao completa de CRM que combina:

1. **Gestao de Relacionamento**: Leads, contatos, pipelines e vendas
2. **Comunicacao Omnichannel**: WhatsApp, Instagram e mais
3. **Inteligencia Artificial**: Agentes autonomos para vendas, ads, conteudo e BI
4. **Automacao**: Workflows, integracoes e processamento em background
5. **Gamificacao**: Engajamento de equipe com pontos, conquistas e recompensas
6. **Analytics**: Dashboards, KPIs, metas e relatorios completos
7. **Escalabilidade**: Arquitetura multi-tenant pronta para crescimento

O sistema foi projetado para empresas que buscam centralizar operacoes de vendas, marketing e atendimento em uma unica plataforma inteligente e integrada.
