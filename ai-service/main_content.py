"""
AI Service - Content Creator Only
Versão simplificada para o módulo de criação de conteúdo
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import structlog
import uvicorn

from app.config import get_settings
from app.routers import content as content_router

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
    title="Content Creator Service",
    description="Serviço de criação de conteúdo viral",
    version="1.0.0",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Router de Content
app.include_router(content_router.router)


@app.on_event("startup")
async def startup_event():
    logger.info("content_service_started", debug=settings.debug)


@app.on_event("shutdown")
async def shutdown_event():
    logger.info("content_service_stopped")


@app.get("/")
async def root():
    return {
        "service": "Content Creator Service",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    uvicorn.run(
        "main_content:app",
        host="0.0.0.0",
        port=8001,
        reload=settings.debug
    )
