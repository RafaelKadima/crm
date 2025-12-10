"""
Router para endpoints do Agente
"""
from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Optional
import structlog

from app.config import get_settings
from app.models.schemas import (
    AgentRunRequest, AgentRunResponse,
    LeadInfo, IntentClassification, Qualification
)
from app.services.agent_service import agent_service
from app.ml.classifier import ml_classifier

logger = structlog.get_logger()
router = APIRouter(prefix="/agent", tags=["Agent"])
settings = get_settings()


async def verify_api_key(x_api_key: str = Header(...)):
    """Verifica API key do Laravel"""
    if settings.api_key and x_api_key != settings.api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return x_api_key


@router.post("/run", response_model=AgentRunResponse)
async def run_agent(
    request: AgentRunRequest,
    api_key: str = Depends(verify_api_key)
):
    """
    Endpoint principal - Executa o agente SDR IA.
    
    Recebe a mensagem do lead + contexto e retorna:
    - Ação a ser tomada
    - Mensagem de resposta (se aplicável)
    - Qualificação do lead
    - Decisão e reasoning
    """
    try:
        response = await agent_service.run(request)
        return response
        
    except Exception as e:
        logger.error("agent_run_endpoint_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/classify-intent", response_model=IntentClassification)
async def classify_intent(
    message: str,
    history: Optional[list] = None,
    api_key: str = Depends(verify_api_key)
):
    """
    Classifica a intenção de uma mensagem.
    """
    try:
        result = await ml_classifier.classify_intent(message, history)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/qualify", response_model=Qualification)
async def qualify_lead(
    lead: LeadInfo,
    messages: list,
    api_key: str = Depends(verify_api_key)
):
    """
    Qualifica um lead baseado na conversa.
    """
    try:
        result = await ml_classifier.qualify_lead(lead, messages)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """Health check do serviço"""
    return {
        "status": "healthy",
        "service": "CRM AI Agent Service",
        "version": "1.0.0"
    }


@router.get("/cache/stats")
async def cache_stats():
    """
    Retorna estatísticas do cache Redis.
    Útil para monitorar economia de tokens.
    """
    from app.cache import response_cache
    
    # Força conexão antes de buscar stats
    await response_cache.connect()
    stats = await response_cache.get_stats()
    return {
        "cache": stats,
        "info": {
            "cached_responses": "Respostas salvas (evita chamar LLM)",
            "cached_embeddings": "Embeddings salvos (evita recalcular)",
            "hits": "Cache hits (economia de tokens)",
            "misses": "Cache misses (precisou chamar LLM)"
        }
    }

