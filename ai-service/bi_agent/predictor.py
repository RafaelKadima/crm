"""
Predictive Engine - Motor de Predições ML
==========================================

Responsável por gerar predições usando modelos de Machine Learning.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
import numpy as np

logger = logging.getLogger(__name__)


class PredictiveEngine:
    """
    Motor de predições do BI Agent.
    
    Fornece:
    - Predição de receita
    - Predição de volume de leads
    - Detecção de anomalias
    - Análise de risco de churn
    """
    
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        self._model_registry = None  # Será injetado
    
    async def predict_revenue(self, months_ahead: int = 3) -> Dict[str, Any]:
        """
        Prediz receita futura.
        
        Usa modelo de séries temporais com:
        - Tendência histórica
        - Sazonalidade
        - Pipeline atual
        """
        # TODO: Implementar modelo real
        base_revenue = 150000
        growth_rate = 0.15
        
        predictions = []
        for i in range(1, months_ahead + 1):
            # Modelo simplificado: crescimento + sazonalidade
            month = (datetime.now().month + i - 1) % 12 + 1
            seasonality = self._get_seasonality_factor(month)
            
            predicted = base_revenue * (1 + growth_rate) ** i * seasonality
            confidence = max(0.5, 0.95 - (i * 0.08))  # Confiança diminui com o tempo
            
            predictions.append({
                "month": (datetime.now() + timedelta(days=30*i)).strftime("%b/%Y"),
                "value": round(predicted, 2),
                "confidence": round(confidence, 2),
            })
        
        return {
            "predictions": predictions,
            "total_predicted": sum(p["value"] for p in predictions),
            "confidence": round(sum(p["confidence"] for p in predictions) / len(predictions), 2),
            "factors": [
                "Tendência histórica (+15% ao mês)",
                "Sazonalidade mensal",
                "Pipeline atual",
            ],
            "model_info": {
                "type": "time_series",
                "last_trained": datetime.now().isoformat(),
                "accuracy": 0.85,
            },
        }
    
    async def predict_lead_volume(self, days_ahead: int = 30) -> Dict[str, Any]:
        """
        Prediz volume de leads nos próximos dias.
        """
        # TODO: Implementar modelo real
        base_daily = 15
        
        predictions = []
        for i in range(1, days_ahead + 1):
            date = datetime.now() + timedelta(days=i)
            # Ajusta por dia da semana (menos leads no fim de semana)
            weekday_factor = 0.6 if date.weekday() >= 5 else 1.0
            
            predicted = int(base_daily * weekday_factor * np.random.uniform(0.8, 1.2))
            predictions.append({
                "date": date.strftime("%Y-%m-%d"),
                "predicted": predicted,
            })
        
        return {
            "daily_predictions": predictions,
            "total_predicted": sum(p["predicted"] for p in predictions),
            "by_channel": {
                "whatsapp": int(sum(p["predicted"] for p in predictions) * 0.5),
                "instagram": int(sum(p["predicted"] for p in predictions) * 0.3),
                "site": int(sum(p["predicted"] for p in predictions) * 0.2),
            },
            "confidence": 0.78,
        }
    
    async def predict_churn_risk(self) -> Dict[str, Any]:
        """
        Identifica leads/clientes com risco de churn.
        
        Analisa:
        - Tempo desde último contato
        - Engajamento
        - Padrão de comportamento
        """
        # TODO: Implementar modelo real
        high_risk = [
            {"lead_id": "lead_1", "name": "João Silva", "risk_score": 0.85, "last_contact_days": 15},
            {"lead_id": "lead_2", "name": "Maria Santos", "risk_score": 0.78, "last_contact_days": 12},
        ]
        
        medium_risk = [
            {"lead_id": "lead_3", "name": "Pedro Costa", "risk_score": 0.55, "last_contact_days": 8},
        ]
        
        return {
            "high_risk": high_risk,
            "medium_risk": medium_risk,
            "total_at_risk": len(high_risk) + len(medium_risk),
            "potential_loss": 15000,  # Valor potencial perdido
            "recommendations": [
                {"lead_id": "lead_1", "action": "Contatar urgente", "priority": "high"},
                {"lead_id": "lead_2", "action": "Enviar oferta especial", "priority": "high"},
            ],
        }
    
    async def detect_anomalies(
        self,
        metric: str,
        period: str = "7d"
    ) -> Dict[str, Any]:
        """
        Detecta anomalias em métricas usando Z-Score.
        
        Uma anomalia é quando o valor está a mais de 2 desvios
        padrão da média.
        """
        # TODO: Implementar detecção real
        days = int(period[:-1]) if period.endswith("d") else 7
        
        # Dados simulados
        values = [45, 48, 42, 50, 15, 47, 44]  # Dia 5 tem anomalia
        
        mean = np.mean(values)
        std = np.std(values)
        
        anomalies = []
        for i, v in enumerate(values):
            zscore = (v - mean) / std if std > 0 else 0
            if abs(zscore) > 2:
                anomalies.append({
                    "date": (datetime.now() - timedelta(days=len(values)-i-1)).strftime("%Y-%m-%d"),
                    "value": v,
                    "expected": round(mean, 2),
                    "zscore": round(zscore, 2),
                    "severity": "high" if abs(zscore) > 3 else "medium",
                    "description": f"{metric} teve valor {v} quando esperado era ~{mean:.0f}",
                })
        
        trend = "stable"
        if len(values) >= 3:
            if values[-1] > values[0] * 1.1:
                trend = "growing"
            elif values[-1] < values[0] * 0.9:
                trend = "declining"
        
        return {
            "anomalies": anomalies,
            "trend": trend,
            "alert": f"Detectada(s) {len(anomalies)} anomalia(s) em {metric}" if anomalies else None,
            "severity": anomalies[0]["severity"] if anomalies else None,
            "stats": {
                "mean": round(mean, 2),
                "std": round(std, 2),
                "min": min(values),
                "max": max(values),
            },
        }
    
    async def predict_best_contact_time(self, lead_id: str) -> Dict[str, Any]:
        """
        Prediz melhor horário para contatar um lead.
        
        Analisa:
        - Histórico de respostas do lead
        - Padrão geral de respostas
        - Dia da semana
        """
        # TODO: Implementar modelo real baseado no histórico do lead
        return {
            "lead_id": lead_id,
            "best_times": [
                {"hour": 10, "day": "Segunda", "probability": 0.85},
                {"hour": 14, "day": "Segunda", "probability": 0.78},
                {"hour": 10, "day": "Terça", "probability": 0.75},
            ],
            "best_day": "Segunda",
            "response_probability": {
                "morning": 0.75,
                "afternoon": 0.65,
                "evening": 0.35,
            },
            "avoid": ["Domingo", "Sábado à tarde"],
        }
    
    def _get_seasonality_factor(self, month: int) -> float:
        """Retorna fator de sazonalidade para o mês."""
        # Sazonalidade típica de vendas
        factors = {
            1: 0.85,   # Janeiro - baixo
            2: 0.90,   # Fevereiro
            3: 0.95,   # Março
            4: 1.00,   # Abril
            5: 1.05,   # Maio
            6: 1.00,   # Junho
            7: 0.95,   # Julho
            8: 1.00,   # Agosto
            9: 1.05,   # Setembro
            10: 1.10,  # Outubro
            11: 1.20,  # Novembro - Black Friday
            12: 1.15,  # Dezembro
        }
        return factors.get(month, 1.0)
    
    async def generate_predictions(self, metrics: Dict[str, Any]) -> List[Dict]:
        """
        Gera todas as predições baseadas nas métricas coletadas.
        """
        predictions = []
        
        # Receita
        revenue_pred = await self.predict_revenue(3)
        predictions.append({
            "type": "revenue",
            "data": revenue_pred,
        })
        
        # Volume de leads
        leads_pred = await self.predict_lead_volume(30)
        predictions.append({
            "type": "lead_volume",
            "data": leads_pred,
        })
        
        # Churn
        churn_pred = await self.predict_churn_risk()
        if churn_pred.get("high_risk"):
            predictions.append({
                "type": "churn_risk",
                "data": churn_pred,
            })
        
        return predictions

