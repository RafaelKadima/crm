"""
Router para endpoints de Aprendizado
"""
from fastapi import APIRouter, HTTPException
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
import structlog

from app.learning import learning_service, question_detector, pattern_analyzer

logger = structlog.get_logger()
router = APIRouter(prefix="/learning", tags=["Learning"])


class FeedbackRequest(BaseModel):
    feedback_id: str
    rating: str  # positive, negative, neutral
    original_response: str
    corrected_response: Optional[str] = None
    lead_message: str
    detected_intent: Optional[str] = None
    agent_id: str
    tenant_id: str


class ConversationAnalysisRequest(BaseModel):
    messages: List[Dict[str, Any]]
    outcome: str  # scheduled, purchased, lost, etc
    agent_id: str
    tenant_id: str
    lead_id: str


class LeadMemoryUpdateRequest(BaseModel):
    lead_id: str
    tenant_id: str
    conversation_data: Dict[str, Any]


@router.post("/process-feedback")
async def process_feedback(request: FeedbackRequest):
    """
    Processa um feedback de mensagem do agente.
    Chamado pelo Laravel quando usuário clica 👍/👎
    """
    try:
        result = await learning_service.process_feedback({
            "feedback_id": request.feedback_id,
            "rating": request.rating,
            "original_response": request.original_response,
            "corrected_response": request.corrected_response,
            "lead_message": request.lead_message,
            "detected_intent": request.detected_intent,
            "agent_id": request.agent_id,
            "tenant_id": request.tenant_id,
        })
        
        return {
            "success": True,
            "result": result
        }
        
    except Exception as e:
        logger.error("process_feedback_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze-conversation")
async def analyze_conversation(request: ConversationAnalysisRequest):
    """
    Analisa uma conversa para extrair padrões.
    Chamado quando uma conversa é finalizada.
    """
    try:
        # Analisa padrões
        patterns = await pattern_analyzer.analyze_conversation(
            messages=request.messages,
            outcome=request.outcome,
            agent_id=request.agent_id,
            tenant_id=request.tenant_id
        )
        
        # Atualiza memória do lead
        memory_result = await learning_service.update_lead_memory(
            lead_id=request.lead_id,
            tenant_id=request.tenant_id,
            conversation_data={
                "messages": request.messages,
                "outcome": request.outcome
            }
        )
        
        return {
            "success": True,
            "patterns": patterns,
            "memory_updated": memory_result.get("success", False),
            "lead_insights": memory_result.get("insights")
        }
        
    except Exception as e:
        logger.error("analyze_conversation_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/detect-question")
async def detect_question(
    message: str,
    agent_id: str,
    tenant_id: str,
    ticket_id: str
):
    """
    Detecta se uma mensagem é uma pergunta frequente.
    """
    try:
        result = await question_detector.analyze_message(
            message=message,
            agent_id=agent_id,
            tenant_id=tenant_id,
            ticket_id=ticket_id
        )
        
        return {
            "is_question": result is not None,
            "question_data": result
        }
        
    except Exception as e:
        logger.error("detect_question_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/update-lead-memory")
async def update_lead_memory(request: LeadMemoryUpdateRequest):
    """
    Atualiza a memória de longo prazo do lead.
    """
    try:
        result = await learning_service.update_lead_memory(
            lead_id=request.lead_id,
            tenant_id=request.tenant_id,
            conversation_data=request.conversation_data
        )
        
        return result
        
    except Exception as e:
        logger.error("update_lead_memory_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats/{agent_id}")
async def get_learning_stats(agent_id: str):
    """
    Retorna estatísticas de aprendizado do agente.
    """
    # Por enquanto retorna estatísticas básicas
    # Em produção, buscaria do banco
    return {
        "agent_id": agent_id,
        "total_feedbacks_processed": 0,
        "positive_patterns_learned": 0,
        "corrections_applied": 0,
        "questions_detected": 0,
        "patterns_identified": 0
    }

