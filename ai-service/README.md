# 🤖 CRM AI Agent Service

Microserviço Python (FastAPI) responsável por:

- **RAG** - Retrieval-Augmented Generation com base de conhecimento vetorial
- **Memory** - Memória de curto prazo (PostgreSQL) e longo prazo (Supabase vectors)
- **ML** - Classificação de intenções, qualificação de leads, predições
- **Agent** - Orquestração de agentes SDR autônomos com function calling

## 🏛️ Arquitetura Consolidada

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ARQUITETURA DO AGENTE                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   WhatsApp → Laravel → ProcessAgentResponse.php                         │
│                              │                                          │
│                              ▼                                          │
│               ┌──────────────────────────────┐                          │
│               │  PythonAgentService.php      │                          │
│               │  (Cliente HTTP)               │                          │
│               └──────────────────────────────┘                          │
│                              │                                          │
│                    ┌────────┴────────┐                                  │
│                    ▼                 ▼                                  │
│            ┌─────────────┐    ┌─────────────────┐                       │
│            │   PYTHON    │    │ FALLBACK BÁSICO │                       │
│            │ ai-service  │    │  (AiService.php) │                       │
│            │ (PRINCIPAL) │    │   (OpenAI direta)│                       │
│            └─────────────┘    └─────────────────┘                       │
│                   │                                                     │
│    ┌──────────────┼──────────────┐                                      │
│    ▼              ▼              ▼                                      │
│ ┌──────┐    ┌──────────┐    ┌──────┐                                    │
│ │ RAG  │    │ Memory   │    │  ML  │                                    │
│ │      │    │ Curta+   │    │      │                                    │
│ │      │    │ Longa    │    │      │                                    │
│ └──────┘    └──────────┘    └──────┘                                    │
│                   │                                                     │
│                   ▼                                                     │
│         ┌─────────────────┐                                             │
│         │ Function Calling│  (9 ações)                                  │
│         │  - send_message │                                             │
│         │  - move_stage   │                                             │
│         │  - schedule_mtg │                                             │
│         │  - qualify_lead │                                             │
│         │  - etc...       │                                             │
│         └─────────────────┘                                             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Nota**: O fallback básico (PHP) só é usado se o Python estiver offline.
Ele faz uma chamada direta à OpenAI sem RAG, Memory ou Function Calling.

## 📋 Requisitos

- Python 3.11+
- PostgreSQL (mesmo banco do Laravel)
- Supabase (opcional, para vector store)
- OpenAI API Key

## 🚀 Instalação

### 1. Criar ambiente virtual

```bash
cd ai-service
python -m venv venv

# Windows
.\venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

### 2. Instalar dependências

```bash
pip install -r requirements.txt
```

### 3. Configurar variáveis de ambiente

```bash
# Copie o arquivo de exemplo
cp env.example .env

# Edite com suas configurações
notepad .env  # Windows
nano .env     # Linux
```

Variáveis importantes:
```env
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/crm
API_KEY=sua-chave-secreta-para-laravel
DEBUG=true
```

### 4. Iniciar o serviço

```bash
# Desenvolvimento
python main.py

# Ou com uvicorn
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

## 📡 Endpoints

### POST /agent/run
Endpoint principal - executa o agente SDR para uma mensagem.

```json
{
  "message": "Olá, tenho interesse no produto X",
  "message_id": "uuid",
  "lead": { "id": "uuid", "name": "João", "phone": "..." },
  "agent": { "id": "uuid", "name": "Gio", "prompt": "..." },
  "tenant": { "id": "uuid", "products": [...] },
  "history": [...]
}
```

Resposta:
```json
{
  "action": "send_message",
  "message": "Olá João! Que bom que tem interesse...",
  "qualification": {
    "temperature": "warm",
    "score": 65,
    "pain_points": ["preço"]
  },
  "intent": {
    "name": "interest",
    "confidence": 0.92
  },
  "decision": {
    "action": "send_message",
    "confidence": 0.95,
    "reasoning": "Lead demonstrou interesse, qualificando..."
  }
}
```

### POST /agent/classify-intent
Classifica a intenção de uma mensagem.

### POST /agent/qualify
Qualifica um lead baseado na conversa.

### GET /health
Health check do serviço.

## 🏗️ Arquitetura

```
ai-service/
├── app/
│   ├── config.py          # Configurações
│   ├── models/
│   │   └── schemas.py     # Modelos Pydantic
│   ├── services/
│   │   └── agent_service.py   # Orquestrador principal
│   ├── rag/
│   │   └── vector_store.py    # RAG com pgvector/Supabase
│   ├── memory/
│   │   └── memory_service.py  # Memória curta e longa
│   ├── ml/
│   │   └── classifier.py      # Classificação e ML
│   └── routers/
│       └── agent.py           # Endpoints FastAPI
├── main.py                # Entrada da aplicação
├── requirements.txt
└── Dockerfile
```

## 🔄 Fluxo de Processamento

1. **Laravel** recebe mensagem do WhatsApp
2. **Laravel** envia para `/agent/run`
3. **Python** carrega memória curta (últimas mensagens)
4. **Python** carrega memória longa (perfil do lead)
5. **Python** busca conhecimento relevante (RAG)
6. **Python** classifica intenção (ML)
7. **Python** qualifica o lead (ML)
8. **Python** gera resposta com function calling (LLM)
9. **Python** salva contexto na memória
10. **Python** retorna ação + resposta
11. **Laravel** executa a ação (envia msg, move funil, etc)

## 🐳 Docker

```bash
# Build
docker build -t crm-ai-agent .

# Run
docker run -p 8001:8001 --env-file .env crm-ai-agent
```

## 📊 Métricas

O serviço registra métricas de cada interação:
- Tempo de resposta
- Tokens usados
- Custo estimado
- Chunks de RAG utilizados
- Acurácia de classificação

## 🔐 Segurança

- Todas as requisições devem incluir header `X-API-Key`
- Configure `API_KEY` no .env do Python e `AI_AGENT_API_KEY` no .env do Laravel
- Em produção, use HTTPS

## 📝 Logs

```bash
# Ver logs estruturados
tail -f logs/agent.log
```

## 🧪 Testes

```bash
# Executar testes
pytest

# Com coverage
pytest --cov=app
```

