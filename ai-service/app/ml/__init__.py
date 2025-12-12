"""
Machine Learning Module para Agentes SDR e Ads.

Este módulo implementa:
- LeadScoreNet: Rede neural para prever probabilidade de conversão de leads
- CampaignPredictorNet: Rede neural para prever performance de campanhas
- ModelRegistry: Gerenciamento e versionamento de modelos
- Training Jobs: Treinamento periódico por tenant
"""

from app.ml.model_registry import ModelRegistry, get_model_registry
from app.ml.models.lead_score_net import LeadScoreNet
from app.ml.models.campaign_predictor import CampaignPredictorNet

__all__ = [
    'LeadScoreNet',
    'CampaignPredictorNet',
    'ModelRegistry',
    'get_model_registry',
]
