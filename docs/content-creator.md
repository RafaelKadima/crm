# Content Creator - Agente de Criacao de Conteudo Viral

Sistema de IA para criacao de roteiros de Reels, TikToks e Shorts, modelando o estilo de criadores de referencia.

## Visao Geral

O Content Creator e um agente de IA que:
1. Pesquisa informacoes sobre um tema (via Tavily)
2. Analisa o estilo de criadores de conteudo atraves de transcricoes
3. Gera hooks e roteiros no estilo do criador selecionado

## Arquitetura

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Frontend     │────>│     Laravel     │────>│   AI-Service    │
│    (React)      │     │     (Proxy)     │     │    (Python)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                              ┌─────────────────────────┼─────────────────────────┐
                              │                         │                         │
                              v                         v                         v
                        ┌──────────┐             ┌──────────┐             ┌──────────┐
                        │  OpenAI  │             │  Tavily  │             │   Groq   │
                        │ GPT-4o   │             │  Search  │             │ Whisper  │
                        └──────────┘             └──────────┘             └──────────┘
```

## Componentes

### Frontend (React)
- `frontend/src/pages/content/ContentAgentChat.tsx` - Chat com o agente
- `frontend/src/pages/content/ContentCreators.tsx` - Gerenciamento de criadores
- `frontend/src/pages/content/ViralVideoSearch.tsx` - Busca de videos virais
- `frontend/src/api/content.ts` - Cliente API

### Backend Laravel (Proxy)
- `app/Http/Controllers/AIContentProxyController.php` - Proxy para ai-service
- `routes/api.php` - Rotas `/api/ai/content/*`

### AI-Service (Python)
- `ai-service/app/routers/content.py` - Endpoints FastAPI
- `ai-service/app/services/copywriter_agent_service.py` - Logica do agente
- `ai-service/app/services/transcription_service.py` - Transcricao com Groq Whisper
- `ai-service/app/services/creators_storage.py` - Persistencia no PostgreSQL

## Fluxo de Criacao de Conteudo

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FLUXO DO AGENTE                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. IDLE                                                                    │
│     │                                                                       │
│     │  Usuario: "Crie um Reel sobre produtividade"                         │
│     v                                                                       │
│  2. RESEARCH                                                                │
│     │  - Agente pesquisa na web (Tavily)                                   │
│     │  - Gera relatorio com fatos curiosos                                 │
│     │  - Usuario aprova ou pede ajustes                                    │
│     v                                                                       │
│  3. SELECT_CREATOR                                                          │
│     │  - Lista criadores disponiveis                                       │
│     │  - Usuario escolhe criador para modelar                              │
│     v                                                                       │
│  4. GENERATE_HOOKS                                                          │
│     │  - Agente le transcricoes do criador                                 │
│     │  - Gera 10 hooks no estilo do criador                                │
│     │  - Usuario escolhe o melhor hook                                     │
│     v                                                                       │
│  5. WRITE_REEL                                                              │
│     │  - Agente escreve roteiro completo (150-250 palavras)                │
│     │  - Imita estilo do criador                                           │
│     │  - Usuario pode pedir ajustes                                        │
│     v                                                                       │
│  6. COMPLETED                                                               │
│     └  Roteiro finalizado!                                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Banco de Dados

### Tabela: content_creators
```sql
CREATE TABLE content_creators (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    transcriptions JSONB DEFAULT '[]',  -- Array de transcricoes
    video_count INTEGER DEFAULT 0,
    style_summary TEXT,                  -- Resumo do estilo (futuro)
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### Tabela: content_sessions
```sql
CREATE TABLE content_sessions (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    messages JSONB DEFAULT '[]',         -- Historico do chat
    current_step VARCHAR(50),            -- Estado atual do fluxo
    topic VARCHAR(500),                  -- Tema do conteudo
    research_data JSONB,                 -- Dados da pesquisa
    selected_creator VARCHAR(255),       -- Criador escolhido
    generated_hooks JSONB,               -- Hooks gerados
    selected_hook VARCHAR(500),          -- Hook escolhido
    final_reel TEXT,                     -- Roteiro final
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### Estrutura de uma Transcricao
```json
{
    "video_url": "https://youtube.com/watch?v=...",
    "video_title": "Como ser mais produtivo",
    "transcription": "Voce sabia que 90% das pessoas...",
    "duration_seconds": 45,
    "platform": "youtube",
    "created_at": "2025-01-15T10:30:00"
}
```

## APIs

### Endpoints do Laravel (Proxy)

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| POST | `/api/ai/content/chat` | Chat com o agente |
| GET | `/api/ai/content/sessions` | Listar sessoes do usuario |
| GET | `/api/ai/content/sessions/{id}` | Detalhes de uma sessao |
| GET | `/api/ai/content/creators` | Listar criadores |
| POST | `/api/ai/content/creators` | Criar criador |
| DELETE | `/api/ai/content/creators/{id}` | Deletar criador |
| POST | `/api/ai/content/creators/{id}/videos` | Adicionar video ao criador |
| POST | `/api/ai/content/search-viral` | Buscar videos virais |
| POST | `/api/ai/content/transcribe` | Transcrever video |

### Exemplo: Chat com Agente
```bash
POST /api/ai/content/chat
Authorization: Bearer {token}

{
    "message": "Crie um Reel sobre marketing digital",
    "session_id": null  // ou UUID de sessao existente
}
```

### Exemplo: Adicionar Video a Criador
```bash
POST /api/ai/content/creators/{creator_id}/videos
Authorization: Bearer {token}

{
    "video_url": "https://www.instagram.com/reel/ABC123/"
}
```

## Como as Transcricoes sao Usadas

### 1. Geracao de Hooks
O agente usa ate 3 transcricoes como referencia para gerar hooks no estilo do criador:

```python
prompt = f"""
ESTILO DO CRIADOR ({creator_name}):
{transcricoes_do_criador}

REGRAS:
- Gere 10 hooks diferentes
- Imite o estilo do criador: vocabulario, tom, estrutura de frases
- Hooks devem gerar curiosidade imediata
"""
```

### 2. Escrita do Roteiro
As transcricoes sao incluidas como exemplos para o agente imitar:

```python
prompt = f"""
EXEMPLOS DO CRIADOR ({creator_name}):
{transcricoes_do_criador}

REGRAS:
- Imite o estilo do criador
- Comprimento das frases
- Vocabulario
- Tom de voz
- Transicoes
"""
```

## Configuracao

### Variaveis de Ambiente (ai-service/.env)

```env
# OpenAI - Modelo principal do agente
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# Tavily - Pesquisa na web
TAVILY_API_KEY=tvly-...

# Groq - Transcricao de videos
GROQ_API_KEY=gsk_...
GROQ_WHISPER_MODEL=whisper-large-v3

# Banco de dados
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/db
```

### Iniciar o AI-Service

```bash
cd ai-service
cp env.example .env
# Edite o .env com suas credenciais
python main_content.py
```

O servico roda em `http://localhost:8001`

## Plataformas Suportadas para Transcricao

O sistema usa `yt-dlp` para download de audio, que suporta:

- YouTube (videos e Shorts)
- Instagram (Reels)
- TikTok
- Twitter/X
- Facebook
- E mais de 1000 sites

## Fluxo Recomendado para Usuarios

1. **Encontre criadores que voce admira** (Instagram, TikTok, YouTube)
2. **Copie URLs dos melhores videos** desses criadores
3. **Adicione os criadores** na aba "Criadores de Conteudo"
4. **Cole as URLs** para transcrever os videos
5. **Use o chat** para criar conteudo no estilo deles

Quanto mais videos de um criador voce adicionar, melhor o agente vai entender e imitar o estilo!

## Limitacoes

- Busca viral funciona apenas via YouTube (APIs do Instagram/TikTok sao restritas)
- Transcricao depende da disponibilidade do video para download
- Qualidade da imitacao depende da quantidade de transcricoes

## Troubleshooting

### Erro 500 no Chat
- Verifique se o ai-service esta rodando (`http://localhost:8001/health`)
- Verifique as credenciais no `.env`

### Transcricao Falhando
- Verifique se a URL do video e valida
- Alguns videos privados nao podem ser transcritos
- Verifique a GROQ_API_KEY

### Agente nao Imita o Estilo
- Adicione mais videos do criador (minimo 3 recomendado)
- Certifique-se que as transcricoes foram salvas corretamente
