"""
Neural Network Models para ML.

Contém:
- LeadScoreNet: Predição de probabilidade de conversão de leads
- CampaignPredictorNet: Predição de métricas de campanhas de Ads
"""

from app.ml.models.lead_score_net import LeadScoreNet
from app.ml.models.campaign_predictor import CampaignPredictorNet

__all__ = ['LeadScoreNet', 'CampaignPredictorNet']
