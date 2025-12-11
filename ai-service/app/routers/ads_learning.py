"""
Router para endpoints de aprendizado de Ads
Recebe notificações do Laravel sobre conversões e feedback
"""
from fastapi import APIRouter, HTTPException, Header, Depends
from typing import Optional, List
from pydantic import BaseModel
import structlog

from app.config import get_settings
from app.learning.ads_learning_service import (
    get_ads_learning_service,
    ConversionEvent,
    CampaignFeedback
)
from app.learning.ads_pattern_analyzer import get_ads_pattern_analyzer
from app.rag.ads_knowledge import get_ads_knowledge_service

logger = structlog.get_logger()
router = APIRouter()
settings = get_settings()


# ==========================================
# SCHEMAS
# ==========================================

class ConversionPayload(BaseModel):
    """Payload de conversão recebido do Laravel"""
    type: str = "ads_conversion"
    tenant_id: str
    data: dict


class FeedbackPayload(BaseModel):
    """Payload de feedback recebido do Laravel"""
    type: str = "campaign_feedback"
    tenant_id: str
    data: dict


class KnowledgeCreateRequest(BaseModel):
    """Request para criar conhecimento"""
    title: str
    content: str
    category: str
    priority: int = 0
    tags: Optional[List[str]] = None


class InsightsResponse(BaseModel):
    """Response de insights consolidados"""
    period_days: int
    winning_campaigns: dict
    creative_performance: dict
    audience_insights: dict
    generated_at: str


# ==========================================
# DEPENDENCY
# ==========================================

async def verify_internal_api_key(x_internal_key: str = Header(None)):
    """Verifica chave de API interna"""
    if x_internal_key and x_internal_key == settings.api_key:
        return True
    # Em dev, permite sem chave
    if settings.debug:
        return True
    raise HTTPException(status_code=401, detail="Unauthorized")


# ==========================================
# ENDPOINTS DE CONVERSÃO
# ==========================================

@router.post("/learning/ads/conversion")
async def receive_conversion(
    payload: ConversionPayload,
    _: bool = Depends(verify_internal_api_key)
):
    """
    Recebe notificação de conversão do Laravel
    Processa e atualiza sistema de aprendizado
    """
    try:
        data = payload.data
        
        event = ConversionEvent(
            conversion_id=data.get('conversion_id', ''),
            campaign_id=data.get('campaign_id', ''),
            adset_id=data.get('adset_id'),
            ad_id=data.get('ad_id'),
            event_type=data.get('event_type', ''),
            value=float(data.get('value', 0)),
            lead_id=data.get('lead_id', ''),
            stage_from=data.get('stage_from'),
            stage_to=data.get('stage_to', ''),
            days_to_convert=data.get('days_to_convert'),
            utm_data=data.get('utm_data', {})
        )
        
        learning_service = get_ads_learning_service()
        result = await learning_service.record_conversion(event)
        
        logger.info("conversion_processed",
            conversion_id=event.conversion_id,
            campaign_id=event.campaign_id,
            event_type=event.event_type
        )
        
        return {
            "status": "success",
            "message": "Conversão processada",
            **result
        }
        
    except Exception as e:
        logger.error("conversion_processing_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/learning/ads/feedback")
async def receive_feedback(
    payload: FeedbackPayload,
    _: bool = Depends(verify_internal_api_key)
):
    """
    Recebe feedback do marketer sobre campanha
    Processa e extrai aprendizados
    """
    try:
        data = payload.data
        
        feedback = CampaignFeedback(
            campaign_id=data.get('campaign_id', ''),
            rating=data.get('rating', 'neutral'),
            score=data.get('score'),
            feedback=data.get('feedback', ''),
            categories=data.get('categories', [])
        )
        
        learning_service = get_ads_learning_service()
        result = await learning_service.process_marketer_feedback(feedback)
        
        logger.info("feedback_processed",
            campaign_id=feedback.campaign_id,
            rating=feedback.rating
        )
        
        return {
            "status": "success",
            "message": "Feedback processado",
            **result
        }
        
    except Exception as e:
        logger.error("feedback_processing_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# ENDPOINTS DE ANÁLISE
# ==========================================

@router.get("/learning/ads/insights/{tenant_id}")
async def get_insights(
    tenant_id: str,
    days: int = 30,
    _: bool = Depends(verify_internal_api_key)
):
    """
    Retorna insights consolidados para um tenant
    """
    try:
        analyzer = get_ads_pattern_analyzer()
        insights = await analyzer.get_consolidated_insights(tenant_id, days)
        
        return {
            "status": "success",
            **insights
        }
        
    except Exception as e:
        logger.error("get_insights_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/learning/ads/patterns/{tenant_id}")
async def get_winning_patterns(
    tenant_id: str,
    min_roas: float = 2.0,
    min_conversions: int = 5,
    days: int = 60,
    _: bool = Depends(verify_internal_api_key)
):
    """
    Retorna padrões de campanhas vencedoras
    """
    try:
        analyzer = get_ads_pattern_analyzer()
        patterns = await analyzer.analyze_winning_campaigns(
            tenant_id=tenant_id,
            min_roas=min_roas,
            min_conversions=min_conversions,
            days=days
        )
        
        return {
            "status": "success",
            "patterns": [
                {
                    "id": p.id,
                    "name": p.name,
                    "objective": p.objective,
                    "avg_roas": p.avg_roas,
                    "total_conversions": p.total_conversions,
                    "budget_range": p.budget_range,
                    "recommendations": p.recommendations,
                    "confidence": p.confidence
                }
                for p in patterns
            ]
        }
        
    except Exception as e:
        logger.error("get_patterns_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/learning/ads/creatives/{tenant_id}")
async def get_creative_analysis(
    tenant_id: str,
    days: int = 30,
    _: bool = Depends(verify_internal_api_key)
):
    """
    Retorna análise de performance de criativos
    """
    try:
        analyzer = get_ads_pattern_analyzer()
        analysis = await analyzer.compare_creative_performance(tenant_id, days)
        
        return {
            "status": "success",
            "total_creatives": analysis.total_creatives,
            "by_type": analysis.by_type,
            "top_performers": analysis.top_performers,
            "recommendations": analysis.recommendations
        }
        
    except Exception as e:
        logger.error("get_creative_analysis_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/learning/ads/learn/{tenant_id}")
async def trigger_learning(
    tenant_id: str,
    min_roas: float = 2.0,
    min_conversions: int = 10,
    _: bool = Depends(verify_internal_api_key)
):
    """
    Dispara aprendizado manual de campanhas bem-sucedidas
    """
    try:
        learning_service = get_ads_learning_service()
        patterns_saved = await learning_service.learn_from_successful_campaigns(
            tenant_id=tenant_id,
            min_roas=min_roas,
            min_conversions=min_conversions
        )
        
        return {
            "status": "success",
            "message": f"{patterns_saved} padrões aprendidos",
            "patterns_saved": patterns_saved
        }
        
    except Exception as e:
        logger.error("trigger_learning_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# ENDPOINTS DE KNOWLEDGE BASE
# ==========================================

@router.get("/learning/ads/knowledge/{tenant_id}")
async def list_knowledge(
    tenant_id: str,
    category: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    _: bool = Depends(verify_internal_api_key)
):
    """
    Lista conhecimento de Ads do tenant
    """
    try:
        knowledge_service = get_ads_knowledge_service()
        result = await knowledge_service.list_knowledge(
            tenant_id=tenant_id,
            category=category,
            page=page,
            limit=limit
        )
        
        return {
            "status": "success",
            **result
        }
        
    except Exception as e:
        logger.error("list_knowledge_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/learning/ads/knowledge/{tenant_id}")
async def create_knowledge(
    tenant_id: str,
    request: KnowledgeCreateRequest,
    _: bool = Depends(verify_internal_api_key)
):
    """
    Adiciona novo conhecimento à base
    """
    try:
        knowledge_service = get_ads_knowledge_service()
        knowledge_id = await knowledge_service.add_knowledge(
            tenant_id=tenant_id,
            title=request.title,
            content=request.content,
            category=request.category,
            priority=request.priority,
            tags=request.tags,
            source='manual'
        )
        
        if not knowledge_id:
            raise HTTPException(status_code=500, detail="Falha ao criar conhecimento")
        
        return {
            "status": "success",
            "id": knowledge_id,
            "message": "Conhecimento criado"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("create_knowledge_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/learning/ads/knowledge/{tenant_id}/{knowledge_id}")
async def delete_knowledge(
    tenant_id: str,
    knowledge_id: str,
    _: bool = Depends(verify_internal_api_key)
):
    """
    Remove conhecimento (soft delete)
    """
    try:
        knowledge_service = get_ads_knowledge_service()
        success = await knowledge_service.delete_knowledge(knowledge_id, tenant_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Conhecimento não encontrado")
        
        return {
            "status": "success",
            "message": "Conhecimento removido"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("delete_knowledge_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/learning/ads/search/{tenant_id}")
async def search_knowledge(
    tenant_id: str,
    query: str,
    top_k: int = 5,
    _: bool = Depends(verify_internal_api_key)
):
    """
    Busca semântica no knowledge base
    """
    try:
        knowledge_service = get_ads_knowledge_service()
        results = await knowledge_service.search_ads_rules(
            query=query,
            tenant_id=tenant_id,
            top_k=top_k
        )
        
        return {
            "status": "success",
            "query": query,
            "results": [
                {
                    "id": r.id,
                    "title": r.title,
                    "content": r.content,
                    "category": r.category,
                    "similarity": r.similarity
                }
                for r in results
            ]
        }
        
    except Exception as e:
        logger.error("search_knowledge_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

