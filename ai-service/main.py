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
from app.queue.worker import queue_worker
from app.queue.message_queue import message_queue

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
    - **ML**: Classificação e predição de leads
    - **Agent**: Orquestração de agentes SDR autônomos
    
    ### Endpoints principais:
    - `POST /agent/run` - Executa o agente para uma mensagem
    - `POST /agent/classify-intent` - Classifica intenção
    - `POST /agent/qualify` - Qualifica lead
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


@app.on_event("shutdown")
async def shutdown_event():
    """Executado ao parar o serviço"""
    # Para o worker e desconecta do Redis
    try:
        await queue_worker.stop()
        await message_queue.disconnect()
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

