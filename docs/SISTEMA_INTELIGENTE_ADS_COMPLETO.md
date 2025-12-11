# Sistema Inteligente de Agentes de Ads

## Visão Geral

Este documento descreve a arquitetura completa do sistema de agentes inteligentes para gerenciamento de campanhas de anúncios, integrando:

- **RAG (Retrieval-Augmented Generation)** - Base de conhecimento contextual
- **Aprendizado Contínuo** - Padrões aprendidos de campanhas bem-sucedidas
- **Guardrails** - Regras de segurança configuráveis
- **Atribuição CRM-Ads** - Conexão real entre conversões e campanhas

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           INTERFACE DO MARKETER                              │
├──────────────┬──────────────┬──────────────┬──────────────────────────────────┤
│  Chat com    │  Feedback    │  Admin Base   │     Config Guardrails          │
│   Agente     │  Campanhas   │  Conhecimento │                                │
└──────┬───────┴──────┬───────┴──────┬────────┴────────────────┬───────────────┘
       │              │              │                         │
       ▼              │              ▼                         ▼
┌─────────────────────┴──────────────────────────────────────────────────────┐
│                        AGENTE ORQUESTRADOR ADS                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Dynamic     │  │ Guardrails  │  │ RAG Query   │  │ Tools       │        │
│  │ Prompt      │  │ Engine      │  │             │  │ Meta Ads    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
└────────────────────────────────────────┬───────────────────────────────────┘
                                         │
       ┌─────────────────────────────────┼─────────────────────────────────┐
       │                                 │                                 │
       ▼                                 ▼                                 ▼
┌─────────────────┐           ┌─────────────────┐           ┌─────────────────┐
│   KNOWLEDGE     │           │    LEARNING     │           │   INTEGRAÇÃO    │
│     BASE        │           │     SYSTEM      │           │    CRM-ADS      │
├─────────────────┤           ├─────────────────┤           ├─────────────────┤
│ • Regras Ads    │           │ • Feedback Svc  │           │ • Lead Track    │
│ • Best Practices│◄─────────►│ • Perf Analyzer │◄─────────►│ • UTM Parser    │
│ • Perf History  │           │ • Pattern Learn │           │ • GTM Events    │
│ • Tenant Prefs  │           │ • Attribution   │           │ • Conv Tracking │
└─────────────────┘           └─────────────────┘           └─────────────────┘
```

---

## Componentes do Sistema

### 1. Base de Conhecimento (RAG)

**Arquivo:** `ai-service/app/rag/ads_knowledge.py`

Gerencia conhecimento específico de Ads com busca vetorial:

```python
class AdsKnowledgeService:
    """Gerencia conhecimento específico de Ads"""
    
    async def search_ads_rules(self, query: str, tenant_id: str) -> List[AdsKnowledgeItem]:
        """Busca regras de ads na base de conhecimento usando embeddings"""
        
    async def add_best_practice(self, content: str, tenant_id: str, category: str):
        """Adiciona boa prática aprendida"""
        
    async def get_campaign_patterns(self, tenant_id: str, objective: str) -> List[Pattern]:
        """Retorna padrões de sucesso para objetivo"""
        
    async def get_context_for_agent(self, tenant_id: str, user_message: str) -> Dict:
        """Monta contexto completo para o agente orquestrador"""
```

**Categorias de conhecimento:**
- `rules` - Regras obrigatórias
- `best_practices` - Melhores práticas aprendidas
- `guidelines` - Diretrizes recomendadas
- `patterns` - Padrões de sucesso
- `faq` - Perguntas frequentes

---

### 2. Sistema de Atribuição

**Arquivo:** `app/Services/LeadAttributionService.php`

Conecta leads do CRM às campanhas de Ads:

```php
class LeadAttributionService
{
    public function parseUtmFromLead(Lead $lead): array
    {
        // Extrai utm_campaign, utm_content, utm_source do lead
    }
    
    public function attributeToAdCampaign(Lead $lead): ?AdCampaign
    {
        // Vincula lead à campanha de origem via UTM ou ID da plataforma
    }
    
    public function recordConversion(Lead $lead, string $eventType): AdConversion
    {
        // Registra conversão (purchase, lead, schedule, etc)
    }
}
```

**Eventos de conversão:**
- `lead` - Novo lead capturado
- `qualified` - Lead qualificado
- `scheduled` - Agendamento realizado
- `proposal` - Proposta enviada
- `purchase` - Venda fechada

---

### 3. Sistema de Aprendizado

**Arquivo:** `ai-service/app/learning/ads_learning_service.py`

Aprende com performance real e feedback:

```python
class AdsLearningService:
    """Aprende com performance real de campanhas"""
    
    async def record_conversion(self, campaign_id: str, event_type: str, value: float):
        """Registra conversão e atualiza métricas"""
        
    async def learn_from_conversion(self, campaign_id: str, success_factors: dict):
        """Extrai padrões de sucesso e salva como conhecimento"""
        
    async def process_marketer_feedback(self, campaign_id: str, rating: str, feedback: str):
        """Processa feedback do marketer e extrai insights"""
```

---

### 4. Analisador de Padrões

**Arquivo:** `ai-service/app/learning/ads_pattern_analyzer.py`

Identifica padrões em campanhas bem-sucedidas:

```python
class AdsPatternAnalyzer:
    """Analisa padrões de campanhas bem-sucedidas"""
    
    async def analyze_winning_campaigns(self, tenant_id: str, min_roas: float = 2.0):
        """Identifica padrões em campanhas com ROAS > threshold"""
        
    async def compare_creative_performance(self, tenant_id: str):
        """Compara performance de tipos de criativos (imagem vs vídeo)"""
        
    async def identify_best_audiences(self, tenant_id: str, objective: str):
        """Identifica públicos que mais convertem"""
```

---

### 5. Engine de Guardrails

**Arquivo:** `ai-service/app/agents/guardrails_engine.py`

Valida ações do agente contra regras configuradas:

```python
class GuardrailsEngine:
    """Valida ações do agente contra regras"""
    
    async def check_action(self, tenant_id: str, action: str, params: dict) -> GuardrailResult:
        """Verifica se ação é permitida"""
        
    async def get_tenant_rules(self, tenant_id: str) -> List[Guardrail]:
        """Busca regras ativas do tenant"""
```

**Tipos de ação:**
- `block` - Bloqueia a ação
- `require_approval` - Requer aprovação
- `warn` - Permite mas avisa
- `notify` - Apenas notifica

**Operadores de condição:**
- `_gt` / `_lt` - Maior/menor que
- `_gte` / `_lte` - Maior/menor ou igual
- `_in` / `_not_in` - Está/não está na lista

---

### 6. Agente Orquestrador Atualizado

**Arquivo:** `ai-service/app/agents/orchestrator.py`

Integra todos os componentes:

```python
async def run(self, input_text: str, context: dict) -> dict:
    tenant_id = context.get('tenant_id')
    
    # 1. Busca conhecimento relevante do RAG
    rag_context = await self.knowledge_service.get_context_for_agent(
        tenant_id=tenant_id,
        user_message=input_text
    )
    
    # 2. Busca padrões de sucesso
    performance_insights = await self.pattern_analyzer.get_relevant_patterns(
        tenant_id=tenant_id
    )
    
    # 3. Verifica guardrails
    guardrails_check = await self.guardrails_engine.check_action(
        tenant_id=tenant_id,
        action='create_campaign',
        params=context
    )
    
    # 4. Monta contexto enriquecido
    enriched_context = {
        **context,
        "knowledge": rag_context,
        "patterns": performance_insights,
        "guardrails": guardrails_check
    }
    
    # 5. Executa agente com contexto
    result = await self.agent.ainvoke({
        "input": input_text,
        "context": json.dumps(enriched_context)
    })
    
    return result
```

---

## Fluxo de Dados

```
┌─────────────┐
│   Marketer  │
│  "Criar     │
│  campanha"  │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│                    ORQUESTRADOR                              │
├─────────────────────────────────────────────────────────────┤
│  1. Busca regras no RAG                                     │
│     → "Min R$50/dia, aprovação >R$200"                      │
│                                                             │
│  2. Verifica guardrails                                     │
│     → OK (dentro dos limites)                               │
│                                                             │
│  3. Busca padrões de sucesso                                │
│     → "Vídeos performam 2x melhor para este objetivo"       │
│                                                             │
│  4. Executa tools Meta Ads                                  │
│     → Cria campanha, adset, ad                              │
│                                                             │
│  5. Salva no banco local                                    │
│     → Registra para aprendizado futuro                      │
└─────────────────────────────────────────────────────────────┘
       │
       │  Dias depois...
       ▼
┌─────────────────────────────────────────────────────────────┐
│                     LEAD ENTRA                               │
├─────────────────────────────────────────────────────────────┤
│  1. Lead capturado via Landing Page com UTM                 │
│     → utm_campaign=CAMPANHA_X                               │
│                                                             │
│  2. Attribution Service vincula à campanha                  │
│     → lead.ad_campaign_id = CAMPANHA_X                      │
│                                                             │
│  3. Lead avança no Kanban (VENDA!)                          │
│     → Dispara evento GTM "purchase"                         │
│                                                             │
│  4. Listener registra conversão                             │
│     → AdConversion criada com valor R$ 500                  │
│                                                             │
│  5. Learning Service processa                               │
│     → Extrai padrões: "Vídeo + Interesse X = Alto ROAS"     │
│                                                             │
│  6. Salva como conhecimento                                 │
│     → Próximas campanhas usarão este padrão                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Modelos de Dados

### knowledge_base
```sql
CREATE TABLE knowledge_base (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    context VARCHAR(50),        -- 'sdr', 'ads', 'general'
    category VARCHAR(50),       -- 'rules', 'best_practices', 'patterns'
    title VARCHAR(255),
    content TEXT,
    embedding JSON,             -- Vetor de embeddings
    priority INTEGER DEFAULT 0,
    tags JSON,
    source VARCHAR(50),         -- 'manual', 'learned', 'imported'
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP
);
```

### ad_conversions
```sql
CREATE TABLE ad_conversions (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    ad_campaign_id UUID REFERENCES ad_campaigns(id),
    lead_id UUID REFERENCES leads(id),
    event_type VARCHAR(50),     -- 'lead', 'qualified', 'purchase'
    value DECIMAL(12,2),
    utm_data JSON,
    attribution_model VARCHAR(50),
    days_to_convert INTEGER,
    converted_at TIMESTAMP
);
```

### ad_guardrails
```sql
CREATE TABLE ad_guardrails (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    name VARCHAR(255),
    rule_type VARCHAR(50),      -- 'budget_limit', 'approval_required'
    scope VARCHAR(50),          -- 'campaign', 'adset', 'ad', 'all'
    conditions JSON,            -- {"daily_budget_gt": 500}
    action JSON,                -- {"type": "block", "message": "..."}
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    trigger_count INTEGER DEFAULT 0
);
```

---

## Endpoints da API

### Knowledge Base
```
GET    /api/ads/knowledge              # Lista conhecimento
POST   /api/ads/knowledge              # Cria conhecimento
GET    /api/ads/knowledge/search       # Busca semântica
GET    /api/ads/knowledge/insights     # Insights consolidados
POST   /api/ads/knowledge/learn        # Dispara aprendizado
PUT    /api/ads/knowledge/{id}         # Atualiza
DELETE /api/ads/knowledge/{id}         # Remove
```

### Guardrails
```
GET    /api/ads/guardrails             # Lista guardrails
POST   /api/ads/guardrails             # Cria guardrail
GET    /api/ads/guardrails/stats       # Estatísticas de uso
POST   /api/ads/guardrails/defaults    # Cria guardrails padrão
POST   /api/ads/guardrails/{id}/toggle # Ativa/desativa
POST   /api/ads/guardrails/{id}/test   # Testa com parâmetros
```

### AI Service (Learning)
```
POST   /learning/ads/conversion        # Recebe conversão
POST   /learning/ads/feedback          # Recebe feedback
GET    /learning/ads/insights/{tenant} # Retorna insights
GET    /learning/ads/patterns/{tenant} # Retorna padrões
POST   /learning/ads/learn/{tenant}    # Dispara aprendizado
```

---

## Diferenciais Competitivos

1. **Atribuição Real** 
   - Não depende apenas do pixel Meta
   - Usa dados reais do CRM (Kanban, tickets, vendas)
   - Rastreamento UTM completo

2. **Aprendizado Contínuo** 
   - Agente melhora a cada conversão
   - Extrai padrões de campanhas bem-sucedidas
   - Feedback do marketer treina o sistema

3. **Guardrails Inteligentes** 
   - Evita erros caros automaticamente
   - Limites de orçamento configuráveis
   - Aprovações para ações críticas

4. **RAG Contextual** 
   - Conhecimento específico do negócio
   - Regras personalizadas por tenant
   - Memória de longo prazo

5. **Feedback Loop Fechado** 
   - Marketer avalia campanhas
   - Sistema aprende com avaliações
   - Melhoria contínua

---

## Próximos Passos

1. **Integração com Google Ads**
   - Adicionar tools para Google Ads
   - Unificar métricas cross-platform

2. **Modelo de Attribution Multi-Touch**
   - Implementar atribuição linear
   - Time-decay attribution

3. **Alertas Proativos**
   - Notificar quando ROAS cair
   - Sugerir otimizações automaticamente

4. **A/B Testing Inteligente**
   - Agente sugere variações
   - Aprende com resultados

