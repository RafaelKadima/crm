"""
Router para endpoints de Reinforcement Learning.

Fornece endpoints para:
- Status do modo de RL por tenant
- Seleção de ações
- Registro de experiências
- Adição de rewards
"""
from fastapi import APIRouter, HTTPException, status
from typing import Dict, Any, Optional, List
from pydantic import BaseModel
import structlog

from app.rl.policy_engine import get_policy_engine
from app.rl.mode_manager import get_mode_manager
from app.rl.experience_buffer import get_experience_buffer
from app.rl.safety_guard import get_ads_safety_guard, get_sdr_safety_guard
from app.rl.explainability import get_action_explainer
from app.rl.states import SDRState, AdsState
from app.rl.actions import SDRAction, AdsAction

logger = structlog.get_logger()
router = APIRouter(prefix="/rl", tags=["Reinforcement Learning"])


# ============================================
# Request/Response Models
# ============================================

class SDRStateRequest(BaseModel):
    lead_id: str
    tenant_id: str
    lead_score: float = 0.0
    temperature: str = 'unknown'
    stage_index: int = 0
    stage_name: str = ''
    intent: str = 'unclear'
    intent_confidence: float = 0.0
    num_messages: int = 0
    num_lead_messages: int = 0
    time_since_last_msg: int = 0
    avg_response_time: float = 0.0
    sentiment: float = 0.0
    has_objection: bool = False
    objection_count: int = 0
    budget_mentioned: bool = False
    timeline_mentioned: bool = False
    decision_maker: bool = False
    rag_context_relevance: float = 0.0


class AdsStateRequest(BaseModel):
    campaign_id: str
    tenant_id: str
    objective: str = ''
    daily_budget: float = 0.0
    creative_type: str = 'image'
    impressions: int = 0
    clicks: int = 0
    conversions: int = 0
    spend: float = 0.0
    current_ctr: float = 0.0
    current_cpc: float = 0.0
    current_cpa: float = 0.0
    current_roas: float = 0.0
    days_running: int = 0
    historical_ctr_avg: float = 0.0
    historical_roas_avg: float = 0.0
    status: str = 'PAUSED'
    is_learning: bool = True


class ActionResponse(BaseModel):
    action: int
    action_name: str
    confidence: float
    mode: str
    explanation: Dict[str, Any]
    is_allowed: bool
    safety_message: Optional[str] = None


class AddExperienceRequest(BaseModel):
    tenant_id: str
    agent_type: str
    entity_id: str
    state: Dict[str, Any]
    action: int
    policy_mode: str = 'RULE_BASED'
    action_confidence: float = 1.0


class AddRewardRequest(BaseModel):
    experience_id: str
    reward: float
    next_state: Optional[Dict[str, Any]] = None
    is_terminal: bool = False


# ============================================
# Endpoints
# ============================================

@router.get("/status/{tenant_id}")
async def get_rl_status(tenant_id: str):
    """
    Retorna status do RL para um tenant.
    
    Inclui modo atual, experiências e progresso para cada agente.
    """
    mode_manager = get_mode_manager()
    
    status = await mode_manager.get_all_modes_status(tenant_id)
    
    return {
        'tenant_id': tenant_id,
        'sdr': {
            'mode': status['sdr'].current_mode.value,
            'experiences': status['sdr'].experiences_count,
            'next_mode': status['sdr'].next_mode.value if status['sdr'].next_mode else None,
            'experiences_to_next': status['sdr'].experiences_to_next_mode,
            'progress_percent': status['sdr'].progress_percent,
            'ready_for_upgrade': status['sdr'].is_ready_for_upgrade,
        },
        'ads': {
            'mode': status['ads'].current_mode.value,
            'experiences': status['ads'].experiences_count,
            'next_mode': status['ads'].next_mode.value if status['ads'].next_mode else None,
            'experiences_to_next': status['ads'].experiences_to_next_mode,
            'progress_percent': status['ads'].progress_percent,
            'ready_for_upgrade': status['ads'].is_ready_for_upgrade,
        }
    }


@router.post("/sdr/select-action", response_model=ActionResponse)
async def select_sdr_action(request: SDRStateRequest):
    """
    Seleciona a melhor ação para o SDR Agent.
    
    Retorna ação, confiança e explicação.
    """
    policy_engine = get_policy_engine()
    explainer = get_action_explainer()
    safety_guard = get_sdr_safety_guard()
    
    # Cria estado
    state = SDRState(
        lead_id=request.lead_id,
        tenant_id=request.tenant_id,
        lead_score=request.lead_score,
        temperature=request.temperature,
        stage_index=request.stage_index,
        stage_name=request.stage_name,
        intent=request.intent,
        intent_confidence=request.intent_confidence,
        num_messages=request.num_messages,
        num_lead_messages=request.num_lead_messages,
        time_since_last_msg=request.time_since_last_msg,
        avg_response_time=request.avg_response_time,
        sentiment=request.sentiment,
        has_objection=request.has_objection,
        objection_count=request.objection_count,
        budget_mentioned=request.budget_mentioned,
        timeline_mentioned=request.timeline_mentioned,
        decision_maker=request.decision_maker,
        rag_context_relevance=request.rag_context_relevance,
    )
    
    # Seleciona ação
    action, confidence, mode = await policy_engine.select_action(
        state, 'sdr', request.tenant_id
    )
    
    sdr_action = SDRAction(action)
    
    # Valida segurança
    safety_result = await safety_guard.validate_action(state, sdr_action, request.tenant_id)
    
    # Se não permitido, usa ação sugerida
    if not safety_result.allowed and safety_result.suggested_action is not None:
        action = safety_result.suggested_action
        sdr_action = SDRAction(action)
        confidence = 0.7
    
    # Gera explicação
    explanation = explainer.explain_sdr_action(state, sdr_action, confidence, mode)
    
    return ActionResponse(
        action=action,
        action_name=sdr_action.name,
        confidence=confidence,
        mode=mode.value,
        explanation={
            'reasons': explanation.reasons,
            'contributing_factors': explanation.contributing_factors,
            'alternatives': explanation.alternative_actions,
        },
        is_allowed=safety_result.allowed,
        safety_message=safety_result.reason if not safety_result.allowed else None
    )


@router.post("/ads/select-action", response_model=ActionResponse)
async def select_ads_action(request: AdsStateRequest):
    """
    Seleciona a melhor ação para o Ads Agent.
    
    Retorna ação, confiança e explicação.
    """
    policy_engine = get_policy_engine()
    explainer = get_action_explainer()
    safety_guard = get_ads_safety_guard()
    
    # Normaliza budget (assume limite de R$ 5000)
    budget_normalized = min(request.daily_budget / 5000, 1.0)
    
    # Cria estado
    state = AdsState(
        campaign_id=request.campaign_id,
        tenant_id=request.tenant_id,
        objective=request.objective,
        daily_budget=request.daily_budget,
        budget_normalized=budget_normalized,
        creative_type=request.creative_type,
        impressions=request.impressions,
        clicks=request.clicks,
        conversions=request.conversions,
        spend=request.spend,
        current_ctr=request.current_ctr,
        current_cpc=request.current_cpc,
        current_cpa=request.current_cpa,
        current_roas=request.current_roas,
        days_running=request.days_running,
        historical_ctr_avg=request.historical_ctr_avg,
        historical_roas_avg=request.historical_roas_avg,
        status=request.status,
        is_learning=request.is_learning,
    )
    
    # Seleciona ação
    action, confidence, mode = await policy_engine.select_action(
        state, 'ads', request.tenant_id
    )
    
    ads_action = AdsAction(action)
    
    # Valida segurança
    safety_result = await safety_guard.validate_action(state, ads_action, request.tenant_id)
    
    # Se não permitido, usa ação sugerida
    if not safety_result.allowed and safety_result.suggested_action is not None:
        action = safety_result.suggested_action
        ads_action = AdsAction(action)
        confidence = 0.7
    
    # Gera explicação
    explanation = explainer.explain_ads_action(state, ads_action, confidence, mode)
    
    return ActionResponse(
        action=action,
        action_name=ads_action.name,
        confidence=confidence,
        mode=mode.value,
        explanation={
            'reasons': explanation.reasons,
            'contributing_factors': explanation.contributing_factors,
            'alternatives': explanation.alternative_actions,
        },
        is_allowed=safety_result.allowed,
        safety_message=safety_result.reason if not safety_result.allowed else None
    )


@router.post("/experience/add")
async def add_experience(request: AddExperienceRequest):
    """
    Registra uma experiência de RL.
    
    Reward pode ser adicionado depois via /experience/add-reward.
    """
    buffer = get_experience_buffer()
    
    experience_id = await buffer.add(
        tenant_id=request.tenant_id,
        agent_type=request.agent_type,
        entity_id=request.entity_id,
        state=request.state,
        action=request.action,
        policy_mode=request.policy_mode,
        action_confidence=request.action_confidence
    )
    
    return {'experience_id': experience_id}


@router.post("/experience/add-reward")
async def add_reward(request: AddRewardRequest):
    """
    Adiciona reward a uma experiência existente.
    """
    buffer = get_experience_buffer()
    
    success = await buffer.add_reward(
        experience_id=request.experience_id,
        reward=request.reward,
        next_state=request.next_state,
        is_terminal=request.is_terminal
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Experience not found"
        )
    
    return {'success': True}


@router.get("/stats/{agent_type}/{tenant_id}")
async def get_action_stats(agent_type: str, tenant_id: str, days: int = 30):
    """
    Retorna estatísticas de ações para um agente/tenant.
    """
    buffer = get_experience_buffer()
    
    stats = await buffer.get_action_stats(agent_type, tenant_id, days)
    
    # Adiciona nomes das ações
    if agent_type == 'sdr':
        action_names = {str(a.value): a.name for a in SDRAction}
    else:
        action_names = {str(a.value): a.name for a in AdsAction}
    
    enriched_stats = {}
    for action_id, action_stats in stats.items():
        enriched_stats[action_id] = {
            **action_stats,
            'name': action_names.get(action_id, f'Action_{action_id}')
        }
    
    return {'stats': enriched_stats}


@router.get("/recommendations/{agent_type}/{tenant_id}")
async def get_training_recommendations(agent_type: str, tenant_id: str):
    """
    Retorna recomendações para melhorar o treinamento.
    """
    mode_manager = get_mode_manager()
    
    recommendations = await mode_manager.get_training_recommendation(agent_type, tenant_id)
    
    return recommendations

