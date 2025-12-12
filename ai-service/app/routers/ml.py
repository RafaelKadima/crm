"""
Router para endpoints de Machine Learning.

Fornece endpoints para:
- Status de modelos por tenant
- Predições de LeadScoreNet e CampaignPredictorNet
- Trigger de treinamento
"""
from fastapi import APIRouter, HTTPException, status, BackgroundTasks
from typing import Dict, Any, Optional, List
from pydantic import BaseModel
import structlog

from app.ml.model_registry import get_model_registry
from app.ml.models.lead_score_net import LeadScoreNet
from app.ml.models.campaign_predictor import CampaignPredictorNet
from app.ml.training.training_job import get_training_job

logger = structlog.get_logger()
router = APIRouter(prefix="/ml", tags=["Machine Learning"])


# ============================================
# Request/Response Models
# ============================================

class LeadScoreRequest(BaseModel):
    tenant_id: str
    lead_data: Dict[str, Any]


class LeadScoreResponse(BaseModel):
    conversion_probability: float
    score_normalized: int  # 0-100
    confidence: str  # low, medium, high
    feature_importance: Optional[Dict[str, float]] = None


class CampaignPredictionRequest(BaseModel):
    tenant_id: str
    campaign_data: Dict[str, Any]
    historical_data: Optional[Dict[str, Any]] = None


class CampaignPredictionResponse(BaseModel):
    predicted_roas: float
    predicted_ctr: float
    predicted_conversion_rate: float
    confidence: str


class ModelInfoResponse(BaseModel):
    has_model: bool
    is_global: bool
    version: Optional[int] = None
    metrics: Optional[Dict[str, float]] = None
    training_samples: Optional[int] = None
    trained_at: Optional[str] = None


class TrainModelRequest(BaseModel):
    tenant_id: str
    model_types: List[str] = ['lead_score', 'campaign_predictor']


# ============================================
# Endpoints
# ============================================

@router.get("/models/{tenant_id}")
async def get_models_status(tenant_id: str):
    """
    Retorna status dos modelos ML para um tenant.
    """
    registry = get_model_registry()
    
    lead_score_info = await registry.get_model_info('lead_score', tenant_id)
    campaign_info = await registry.get_model_info('campaign_predictor', tenant_id)
    
    # Verifica se deveria treinar
    should_train_lead = await registry.should_train_tenant_model('lead_score', tenant_id)
    should_train_campaign = await registry.should_train_tenant_model('campaign_predictor', tenant_id)
    
    return {
        'tenant_id': tenant_id,
        'lead_score': {
            'has_model': lead_score_info is not None,
            'is_global': lead_score_info.get('is_global', True) if lead_score_info else True,
            'version': lead_score_info.get('version') if lead_score_info else None,
            'metrics': lead_score_info.get('metrics') if lead_score_info else None,
            'training_samples': lead_score_info.get('training_samples') if lead_score_info else None,
            'trained_at': lead_score_info.get('trained_at') if lead_score_info else None,
            'should_train': should_train_lead,
        },
        'campaign_predictor': {
            'has_model': campaign_info is not None,
            'is_global': campaign_info.get('is_global', True) if campaign_info else True,
            'version': campaign_info.get('version') if campaign_info else None,
            'metrics': campaign_info.get('metrics') if campaign_info else None,
            'training_samples': campaign_info.get('training_samples') if campaign_info else None,
            'trained_at': campaign_info.get('trained_at') if campaign_info else None,
            'should_train': should_train_campaign,
        }
    }


@router.post("/predict/lead-score", response_model=LeadScoreResponse)
async def predict_lead_score(request: LeadScoreRequest):
    """
    Prediz probabilidade de conversão de um lead.
    """
    registry = get_model_registry()
    
    model = await registry.get_model('lead_score', request.tenant_id)
    
    if model is None:
        # Retorna score baseado em heurística simples
        lead_score = request.lead_data.get('lead_score', 50)
        prob = lead_score / 100
        
        return LeadScoreResponse(
            conversion_probability=prob,
            score_normalized=int(prob * 100),
            confidence='low',
            feature_importance=None
        )
    
    # Extrai features
    features = LeadScoreNet.extract_features(request.lead_data)
    
    # Prediz
    prob = model.predict(features)
    
    # Calcula confiança baseada no modelo
    model_info = await registry.get_model_info('lead_score', request.tenant_id)
    if model_info:
        samples = model_info.get('training_samples', 0)
        if samples > 500:
            confidence = 'high'
        elif samples > 100:
            confidence = 'medium'
        else:
            confidence = 'low'
    else:
        confidence = 'low'
    
    # Feature importance
    importance = model.get_feature_importance() if hasattr(model, 'get_feature_importance') else None
    
    return LeadScoreResponse(
        conversion_probability=prob,
        score_normalized=int(prob * 100),
        confidence=confidence,
        feature_importance=importance
    )


@router.post("/predict/campaign", response_model=CampaignPredictionResponse)
async def predict_campaign_performance(request: CampaignPredictionRequest):
    """
    Prediz performance de uma campanha de Ads.
    """
    registry = get_model_registry()
    
    model = await registry.get_model('campaign_predictor', request.tenant_id)
    
    if model is None:
        # Retorna predição baseada em médias históricas
        historical = request.historical_data or {}
        
        return CampaignPredictionResponse(
            predicted_roas=historical.get('avg_roas', 1.5),
            predicted_ctr=historical.get('avg_ctr', 1.0),
            predicted_conversion_rate=0.02,
            confidence='low'
        )
    
    # Extrai features
    features = CampaignPredictorNet.extract_features(
        request.campaign_data,
        request.historical_data or {}
    )
    
    # Prediz
    prediction = model.predict(features)
    
    # Calcula confiança
    model_info = await registry.get_model_info('campaign_predictor', request.tenant_id)
    if model_info:
        samples = model_info.get('training_samples', 0)
        r2 = model_info.get('metrics', {}).get('r2_roas', 0)
        
        if samples > 200 and r2 > 0.7:
            confidence = 'high'
        elif samples > 50 and r2 > 0.5:
            confidence = 'medium'
        else:
            confidence = 'low'
    else:
        confidence = 'low'
    
    return CampaignPredictionResponse(
        predicted_roas=prediction['predicted_roas'],
        predicted_ctr=prediction['predicted_ctr'],
        predicted_conversion_rate=prediction['predicted_conversion_rate'],
        confidence=confidence
    )


@router.post("/train")
async def train_models(
    request: TrainModelRequest,
    background_tasks: BackgroundTasks
):
    """
    Trigger treinamento de modelos para um tenant.
    
    Executa em background.
    """
    training_job = get_training_job()
    
    # Verifica se há dados suficientes
    registry = get_model_registry()
    can_train = {}
    
    for model_type in request.model_types:
        can_train[model_type] = await registry.should_train_tenant_model(
            model_type, request.tenant_id
        )
    
    # Se não pode treinar nenhum
    if not any(can_train.values()):
        return {
            'status': 'insufficient_data',
            'can_train': can_train,
            'message': 'Dados insuficientes para treinamento'
        }
    
    # Agenda treinamento em background
    async def run_training():
        await training_job.run(request.tenant_id)
    
    background_tasks.add_task(run_training)
    
    return {
        'status': 'training_scheduled',
        'tenant_id': request.tenant_id,
        'model_types': request.model_types,
        'can_train': can_train
    }


@router.post("/train/global")
async def train_global_models(background_tasks: BackgroundTasks):
    """
    Trigger treinamento de modelos globais.
    
    Usa dados de todos os tenants (anonimizados).
    """
    training_job = get_training_job()
    
    async def run_global_training():
        await training_job.train_global_models()
    
    background_tasks.add_task(run_global_training)
    
    return {
        'status': 'global_training_scheduled',
        'message': 'Treinamento global agendado'
    }


@router.delete("/cache/{tenant_id}")
async def clear_model_cache(tenant_id: str, model_type: Optional[str] = None):
    """
    Limpa cache de modelos para um tenant.
    
    Útil após retreinamento.
    """
    registry = get_model_registry()
    registry.clear_cache(tenant_id, model_type)
    
    return {'status': 'cache_cleared'}

