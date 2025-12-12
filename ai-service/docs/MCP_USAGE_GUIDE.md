# Guia de Uso do MCP (Model Context Protocol)

## 📋 Índice

1. [Configuração Inicial](#configuração-inicial)
2. [Usando via API REST](#usando-via-api-rest)
3. [Usando os Agentes Diretamente](#usando-os-agentes-diretamente)
4. [Chamando Ferramentas Individualmente](#chamando-ferramentas-individualmente)
5. [Exemplos Práticos](#exemplos-práticos)

---

## 1. Configuração Inicial

### 1.1 Variáveis de Ambiente

Adicione no seu `.env`:

```env
# Anthropic (recomendado)
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Ou OpenAI
OPENAI_API_KEY=sk-xxxxx
```

### 1.2 Instalar Dependências

```bash
cd ai-service
pip install -r requirements.txt
```

### 1.3 Iniciar o Serviço

```bash
# Desenvolvimento
python main.py

# Ou com uvicorn
uvicorn main:app --reload --port 8001
```

---

## 2. Usando via API REST

### 2.1 Executar Agente SDR

```bash
curl -X POST http://localhost:8001/mcp/run \
  -H "Content-Type: application/json" \
  -d '{
    "agent_type": "sdr",
    "tenant_id": "seu-tenant-id",
    "message": "Qualifique o lead 123 e sugira próximas ações"
  }'
```

**Resposta:**
```json
{
  "response": "Analisei o lead 123. Score: 78/100. Recomendo agendar uma reunião...",
  "tool_calls_made": [
    {"tool": "get_lead_context", "success": true},
    {"tool": "predict_lead_score", "success": true},
    {"tool": "select_sdr_action", "success": true}
  ],
  "iterations": 3,
  "finished": true
}
```

### 2.2 Executar Agente Ads

```bash
curl -X POST http://localhost:8001/mcp/run \
  -H "Content-Type: application/json" \
  -d '{
    "agent_type": "ads",
    "tenant_id": "seu-tenant-id",
    "message": "Analise as campanhas ativas e sugira otimizações"
  }'
```

### 2.3 Chamar Ferramenta Diretamente

```bash
# Predizer score de um lead
curl -X POST http://localhost:8001/mcp/tool \
  -H "Content-Type: application/json" \
  -d '{
    "tool_name": "predict_lead_score",
    "arguments": {
      "lead_id": "uuid-do-lead",
      "tenant_id": "seu-tenant-id"
    },
    "agent_type": "sdr"
  }'
```

### 2.4 Listar Ferramentas Disponíveis

```bash
# Todas as ferramentas
curl http://localhost:8001/mcp/tools

# Ferramentas do SDR
curl http://localhost:8001/mcp/tools?agent_type=sdr

# Ferramentas do Ads
curl http://localhost:8001/mcp/tools?agent_type=ads
```

### 2.5 Ver System Prompt

```bash
curl http://localhost:8001/mcp/system-prompt/sdr
```

---

## 3. Usando os Agentes Diretamente (Python)

### 3.1 SDR Agent

```python
import asyncio
from mcp.llm_integration import SDRAgent

async def main():
    # Inicializa agente
    agent = SDRAgent(tenant_id="seu-tenant-id")
    
    # Processa mensagem de um lead
    result = await agent.process_message(
        lead_id="uuid-do-lead",
        message="Olá, quero saber mais sobre o produto"
    )
    
    print(f"Resposta: {result['response']}")
    print(f"Ferramentas usadas: {len(result['tool_calls_made'])}")
    
    # Qualificar lead
    qualification = await agent.qualify_lead(lead_id="uuid-do-lead")
    print(f"Qualificação: {qualification}")

asyncio.run(main())
```

### 3.2 Ads Agent

```python
import asyncio
from mcp.llm_integration import AdsAgent

async def main():
    agent = AdsAgent(tenant_id="seu-tenant-id")
    
    # Otimizar campanhas existentes
    result = await agent.optimize_campaigns()
    print(f"Recomendações: {result['response']}")
    
    # Criar nova campanha
    result = await agent.create_campaign(
        objective="OUTCOME_SALES",
        product="Meu Produto",
        budget=100.0  # R$ 100/dia
    )
    print(f"Campanha: {result}")

asyncio.run(main())
```

---

## 4. Chamando Ferramentas Individualmente

### 4.1 Via MCP Server

```python
import asyncio
from mcp.server import get_mcp_server

async def main():
    server = get_mcp_server()
    
    # Chamar ferramenta
    result = await server.call_tool(
        name="predict_lead_score",
        arguments={
            "lead_id": "uuid-do-lead",
            "tenant_id": "seu-tenant-id"
        },
        tenant_id="seu-tenant-id",
        agent_type="sdr"
    )
    
    if result.success:
        print(f"Score: {result.result['score']}")
    else:
        print(f"Erro: {result.error}")

asyncio.run(main())
```

### 4.2 Ferramentas Mais Úteis

```python
# SDR Tools
await server.call_tool("predict_lead_score", {"lead_id": "...", "tenant_id": "..."})
await server.call_tool("get_lead_context", {"lead_id": "...", "tenant_id": "..."})
await server.call_tool("select_sdr_action", {"lead_id": "...", "tenant_id": "..."})
await server.call_tool("send_message", {"lead_id": "...", "tenant_id": "...", "message": "..."})
await server.call_tool("schedule_meeting", {"lead_id": "...", "tenant_id": "...", "datetime": "..."})

# Ads Tools
await server.call_tool("predict_campaign_performance", {"tenant_id": "...", "campaign_config": {...}})
await server.call_tool("create_campaign", {"tenant_id": "...", "ad_account_id": "...", "name": "...", "objective": "...", "daily_budget": 100})
await server.call_tool("optimize_campaign", {"campaign_id": "...", "tenant_id": "..."})

# RAG Tools
await server.call_tool("search_knowledge", {"query": "...", "tenant_id": "..."})
await server.call_tool("get_best_practices", {"tenant_id": "...", "context": "..."})

# RL Tools
await server.call_tool("get_rl_status", {"tenant_id": "..."})
await server.call_tool("record_experience", {"agent_type": "sdr", "tenant_id": "...", "state": {...}, "action": "...", "reward": 10})
```

---

## 5. Exemplos Práticos

### 5.1 Fluxo Completo de Atendimento SDR

```python
import asyncio
from mcp.server import get_mcp_server

async def handle_lead_message(lead_id: str, tenant_id: str, message: str):
    """Fluxo completo de processamento de mensagem de lead."""
    server = get_mcp_server()
    
    # 1. Buscar contexto do lead
    context = await server.call_tool(
        "get_lead_context",
        {"lead_id": lead_id, "tenant_id": tenant_id},
        tenant_id, "sdr"
    )
    print(f"Contexto: {context.result}")
    
    # 2. Classificar intenção da mensagem
    intent = await server.call_tool(
        "classify_intent",
        {"message": message, "tenant_id": tenant_id, "lead_id": lead_id},
        tenant_id, "sdr"
    )
    print(f"Intenção: {intent.result['intent']}")
    
    # 3. Calcular score do lead
    score = await server.call_tool(
        "predict_lead_score",
        {"lead_id": lead_id, "tenant_id": tenant_id},
        tenant_id, "sdr"
    )
    print(f"Score: {score.result['score']}")
    
    # 4. Selecionar melhor ação via RL
    action = await server.call_tool(
        "select_sdr_action",
        {
            "lead_id": lead_id,
            "tenant_id": tenant_id,
            "current_state": {
                "lead_score": score.result['score'],
                "intent": intent.result['intent'],
                "num_messages": len(context.result.get('messages', []))
            }
        },
        tenant_id, "sdr"
    )
    print(f"Ação sugerida: {action.result['action']}")
    print(f"Explicação: {action.result['explanation']}")
    
    # 5. Executar ação
    if action.result['action'] == 'SCHEDULE':
        # Verificar disponibilidade
        availability = await server.call_tool(
            "check_availability",
            {"tenant_id": tenant_id, "date": "2025-12-15"},
            tenant_id, "sdr"
        )
        print(f"Horários disponíveis: {availability.result['available_slots']}")
    
    # 6. Registrar experiência para RL
    await server.call_tool(
        "record_sdr_experience",
        {
            "tenant_id": tenant_id,
            "lead_id": lead_id,
            "state": {"score": score.result['score']},
            "action": action.result['action'],
            "reward": 5.0  # Reward será atualizado depois
        },
        tenant_id, "sdr"
    )
    
    return action.result

asyncio.run(handle_lead_message("lead-123", "tenant-abc", "Quero agendar uma demonstração"))
```

### 5.2 Criar e Otimizar Campanha Ads

```python
import asyncio
from mcp.server import get_mcp_server

async def create_optimized_campaign(tenant_id: str, product: str, budget: float):
    """Cria campanha com configurações otimizadas."""
    server = get_mcp_server()
    
    # 1. Buscar diretrizes da marca
    guidelines = await server.call_tool(
        "get_brand_guidelines",
        {"tenant_id": tenant_id},
        tenant_id, "ads"
    )
    print(f"Diretrizes: {guidelines.result}")
    
    # 2. Buscar melhores práticas
    practices = await server.call_tool(
        "get_best_practices",
        {"tenant_id": tenant_id, "context": "campanha de vendas"},
        tenant_id, "ads"
    )
    
    # 3. Obter recomendação de budget
    budget_rec = await server.call_tool(
        "get_budget_recommendation",
        {"tenant_id": tenant_id, "objective": "OUTCOME_SALES"},
        tenant_id, "ads"
    )
    print(f"Budget recomendado: R${budget_rec.result['recommended_daily_budget']}")
    
    # 4. Gerar copy do anúncio
    copy = await server.call_tool(
        "generate_ad_copy",
        {
            "tenant_id": tenant_id,
            "product_name": product,
            "objective": "OUTCOME_SALES",
            "tone": "casual"
        },
        tenant_id, "ads"
    )
    print(f"Variações de copy: {copy.result['variations']}")
    
    # 5. Obter sugestões de público
    audiences = await server.call_tool(
        "get_audience_suggestions",
        {"tenant_id": tenant_id, "objective": "OUTCOME_SALES"},
        tenant_id, "ads"
    )
    print(f"Públicos sugeridos: {audiences.result['suggestions']}")
    
    # 6. Predizer performance
    prediction = await server.call_tool(
        "predict_campaign_performance",
        {
            "tenant_id": tenant_id,
            "campaign_config": {
                "objective": "OUTCOME_SALES",
                "daily_budget": budget,
                "creative_type_index": 0,
                "audience_size": 100000
            }
        },
        tenant_id, "ads"
    )
    print(f"ROAS estimado: {prediction.result['predictions']['roas']}x")
    
    # 7. Validar criativo
    validation = await server.call_tool(
        "validate_creative",
        {
            "tenant_id": tenant_id,
            "creative_config": {
                "primary_text": copy.result['variations'][0],
                "headline": product,
                "media_type": "image"
            }
        },
        tenant_id, "ads"
    )
    print(f"Criativo válido: {validation.result['valid']}")
    
    return {
        "recommended_budget": budget_rec.result['recommended_daily_budget'],
        "predicted_roas": prediction.result['predictions']['roas'],
        "copy_variations": copy.result['variations'],
        "audiences": audiences.result['suggestions']
    }

asyncio.run(create_optimized_campaign("tenant-123", "CRM Pro", 150.0))
```

### 5.3 Monitorar Status do RL

```python
import asyncio
from mcp.server import get_mcp_server

async def check_rl_status(tenant_id: str):
    """Verifica status do sistema de Reinforcement Learning."""
    server = get_mcp_server()
    
    # Status geral
    status = await server.call_tool(
        "get_rl_status",
        {"tenant_id": tenant_id},
        tenant_id, "admin"
    )
    print(f"Status RL: {status.result}")
    
    # Estatísticas por ação (SDR)
    sdr_stats = await server.call_tool(
        "get_action_stats",
        {"agent_type": "sdr", "tenant_id": tenant_id},
        tenant_id, "admin"
    )
    print(f"\nEstatísticas SDR:")
    for stat in sdr_stats.result['stats']:
        print(f"  {stat['action']}: {stat['count']} vezes, reward médio: {stat['avg_reward']:.2f}")
    
    # Modo da política
    mode = await server.call_tool(
        "get_policy_mode",
        {"agent_type": "sdr", "tenant_id": tenant_id},
        tenant_id, "admin"
    )
    print(f"\nModo atual: {mode.result['mode']}")
    print(f"Descrição: {mode.result['description']}")

asyncio.run(check_rl_status("tenant-123"))
```

### 5.4 Integração com Laravel (via HTTP)

```php
<?php
// app/Services/MCPService.php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class MCPService
{
    protected string $baseUrl;
    
    public function __construct()
    {
        $this->baseUrl = config('services.ai.url', 'http://localhost:8001');
    }
    
    /**
     * Executa agente MCP
     */
    public function runAgent(string $agentType, string $tenantId, string $message): array
    {
        $response = Http::post("{$this->baseUrl}/mcp/run", [
            'agent_type' => $agentType,
            'tenant_id' => $tenantId,
            'message' => $message,
        ]);
        
        return $response->json();
    }
    
    /**
     * Chama ferramenta diretamente
     */
    public function callTool(string $toolName, array $arguments, string $tenantId, string $agentType = 'sdr'): array
    {
        $response = Http::post("{$this->baseUrl}/mcp/tool", [
            'tool_name' => $toolName,
            'arguments' => $arguments,
            'tenant_id' => $tenantId,
            'agent_type' => $agentType,
        ]);
        
        return $response->json();
    }
    
    /**
     * Prediz score de um lead
     */
    public function predictLeadScore(string $leadId, string $tenantId): array
    {
        return $this->callTool('predict_lead_score', [
            'lead_id' => $leadId,
            'tenant_id' => $tenantId,
        ], $tenantId, 'sdr');
    }
    
    /**
     * Qualifica lead com agente SDR
     */
    public function qualifyLead(string $leadId, string $tenantId): array
    {
        return $this->runAgent('sdr', $tenantId, "Qualifique o lead {$leadId} usando BANT");
    }
    
    /**
     * Otimiza campanhas com agente Ads
     */
    public function optimizeCampaigns(string $tenantId): array
    {
        return $this->runAgent('ads', $tenantId, 'Analise todas as campanhas e sugira otimizações');
    }
}
```

**Uso no Controller:**

```php
<?php
// app/Http/Controllers/LeadController.php

use App\Services\MCPService;

class LeadController extends Controller
{
    public function __construct(private MCPService $mcp) {}
    
    public function score(string $leadId)
    {
        $tenantId = auth()->user()->tenant_id;
        
        $result = $this->mcp->predictLeadScore($leadId, $tenantId);
        
        return response()->json([
            'score' => $result['result']['score'] ?? 0,
            'confidence' => $result['result']['confidence'] ?? 0,
        ]);
    }
    
    public function qualify(string $leadId)
    {
        $tenantId = auth()->user()->tenant_id;
        
        $result = $this->mcp->qualifyLead($leadId, $tenantId);
        
        return response()->json($result);
    }
}
```

---

## 📊 Endpoints Disponíveis

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/mcp/run` | POST | Executa agente MCP |
| `/mcp/tool` | POST | Chama ferramenta diretamente |
| `/mcp/tools` | GET | Lista ferramentas |
| `/mcp/stats` | GET | Estatísticas do servidor |
| `/mcp/system-prompt/{type}` | GET | System prompt do agente |

---

## 🔑 Variáveis de Ambiente Necessárias

```env
# Obrigatório (escolha um)
ANTHROPIC_API_KEY=sk-ant-xxx  # Recomendado
OPENAI_API_KEY=sk-xxx

# Database
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/crm

# Redis
REDIS_URL=redis://localhost:6379/0
```

---

## 🎯 Próximos Passos

1. Configure as variáveis de ambiente
2. Inicie o serviço: `python main.py`
3. Teste com: `curl http://localhost:8001/mcp/tools`
4. Execute seu primeiro agente!

