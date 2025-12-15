"""
CRM AI Agent Service - FastAPI
Microserviço de IA para agentes SDR autônomos
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import structlog
import uvicorn

from app.config import get_settings
from app.routers import agent
from app.routers import queue as queue_router
from app.routers import learning as learning_router
from app.routers import ads as ads_router
from app.routers import orchestrator as orchestrator_router
from app.routers import ads_learning as ads_learning_router
from app.routers import knowledge_upload as knowledge_upload_router
from app.routers import rl as rl_router
from app.routers import ml as ml_router
from mcp.llm_integration import create_mcp_router
from app.queue.worker import queue_worker
from app.queue.message_queue import message_queue
from app.routers import bi as bi_router
from app.routers import content as content_router
from bi_agent.scheduler import bi_scheduler

# Configuração de logging estruturado
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()
settings = get_settings()

# Cria app FastAPI
app = FastAPI(
    title=settings.app_name,
    description="""
    ## CRM AI Agent Service
    
    Microserviço responsável por:
    - **RAG**: Busca em base de conhecimento vetorial
    - **Memory**: Memória de curto e longo prazo
    - **ML**: Classificação e predição de leads (LeadScoreNet, CampaignPredictorNet)
    - **RL**: Reinforcement Learning para decisões autônomas
    - **MCP**: Model Context Protocol - ferramentas para agentes LLM
    - **Agent**: Orquestração de agentes SDR e Ads autônomos
    - **Content**: Geração de conteúdo viral para redes sociais
    
    ### Endpoints principais:
    - `POST /agent/run` - Executa o agente para uma mensagem
    - `POST /agent/classify-intent` - Classifica intenção
    - `POST /agent/qualify` - Qualifica lead
    - `POST /mcp/run` - Executa agente MCP com LLM
    - `POST /mcp/tool` - Chama ferramenta MCP diretamente
    - `GET /mcp/tools` - Lista ferramentas disponíveis
    - `POST /content/analyze-viral` - Analisa estrutura viral
    - `POST /content/generate-viral-script` - Cria roteiro viral
    """,
    version="1.0.0",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, especificar domínios
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(agent.router)
app.include_router(queue_router.router)
app.include_router(learning_router.router)
app.include_router(ads_router.router)
app.include_router(orchestrator_router.router)
app.include_router(ads_learning_router.router)
app.include_router(knowledge_upload_router.router)
app.include_router(rl_router.router)
app.include_router(ml_router.router)
app.include_router(bi_router.router)
app.include_router(content_router.router)
app.include_router(create_mcp_router())


@app.on_event("startup")
async def startup_event():
    """Executado ao iniciar o serviço"""
    logger.info(
        "service_started",
        app_name=settings.app_name,
        debug=settings.debug
    )
    
    # Conecta ao Redis e inicia o worker de fila
    try:
        await message_queue.connect()
        await queue_worker.start()
        logger.info("queue_worker_initialized")
    except Exception as e:
        logger.warning("queue_worker_init_failed", error=str(e))
    
    # Inicia o scheduler do BI Agent
    try:
        await bi_scheduler.start()
        logger.info("bi_scheduler_started")
    except Exception as e:
        logger.warning("bi_scheduler_init_failed", error=str(e))


@app.on_event("shutdown")
async def shutdown_event():
    """Executado ao parar o serviço"""
    # Para o worker e desconecta do Redis
    try:
        await queue_worker.stop()
        await message_queue.disconnect()
    except Exception:
        pass
    
    # Para o scheduler do BI Agent
    try:
        await bi_scheduler.stop()
    except Exception:
        pass
    
    logger.info("service_stopped")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": settings.app_name,
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs" if settings.debug else "disabled"
    }


@app.get("/health")
async def health():
    """Health check"""
    return {"status": "healthy"}


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=settings.debug
    )

