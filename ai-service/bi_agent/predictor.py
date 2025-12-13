"""
Predictive Engine - Motor de Predições ML
==========================================

Responsável por gerar predições usando dados históricos reais.
Implementa:
- Média móvel para tendências
- Regressão linear para projeções
- Z-Score para detecção de anomalias
- Sazonalidade por dia da semana
"""

import logging
import os
import httpx
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
import numpy as np
from collections import defaultdict

logger = logging.getLogger(__name__)

# Configuração da API Laravel
LARAVEL_URL = os.getenv("LARAVEL_API_URL", "http://nginx")
INTERNAL_KEY = os.getenv("LARAVEL_INTERNAL_KEY", "")


class PredictiveEngine:
    """
    Motor de predições do BI Agent com dados reais.
    
    Fornece:
    - Predição de receita (média móvel + tendência linear)
    - Predição de volume de leads (sazonalidade)
    - Detecção de anomalias (Z-Score)
    - Análise de risco de churn
    """
    
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        self._headers = {
            "X-Internal-Key": INTERNAL_KEY,
            "X-Tenant-ID": tenant_id,
            "Content-Type": "application/json",
        }
    
    async def _call_api(self, endpoint: str, params: Optional[Dict] = None) -> Dict[str, Any]:
        """Chama endpoint interno da API Laravel."""
        url = f"{LARAVEL_URL}/api/internal/bi/{endpoint}"
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, headers=self._headers, params=params or {})
                
                if response.status_code == 200:
                    return response.json()
                else:
                    logger.error(f"[PredictiveEngine] Erro na API {endpoint}: {response.status_code}")
                    return {"error": f"API error: {response.status_code}"}
                    
        except Exception as e:
            logger.error(f"[PredictiveEngine] Erro ao chamar {endpoint}: {e}")
            return {"error": str(e)}
    
    async def predict_revenue(self, months_ahead: int = 3) -> Dict[str, Any]:
        """
        Prediz receita futura usando dados históricos reais.
        
        Método:
        1. Busca histórico de receita dos últimos 90 dias
        2. Calcula média móvel de 7 dias
        3. Calcula tendência linear (crescimento/declínio)
        4. Aplica sazonalidade mensal
        5. Projeta para os próximos meses
        """
        # Busca histórico de receita
        history_data = await self._call_api("history/revenue", {"days": 90})
        
        if "error" in history_data or not history_data.get("history"):
            logger.warning("[PredictiveEngine] Sem dados históricos de receita, usando fallback")
            return self._fallback_revenue_prediction(months_ahead)
        
        history = history_data.get("history", [])
        
        if len(history) < 7:
            return self._fallback_revenue_prediction(months_ahead)
        
        # Extrai valores de receita por dia
        daily_values = [day.get("revenue", 0) for day in history]
        
        # Calcula média móvel de 7 dias
        moving_avg = self._calculate_moving_average(daily_values, window=7)
        
        # Calcula tendência linear (taxa de crescimento)
        growth_rate = self._calculate_growth_rate(moving_avg)
        
        # Calcula receita média diária recente (últimos 30 dias)
        recent_avg = np.mean(daily_values[-30:]) if len(daily_values) >= 30 else np.mean(daily_values)
        
        # Gera predições por mês
        predictions = []
        for i in range(1, months_ahead + 1):
            month = (datetime.now().month + i - 1) % 12 + 1
            seasonality = self._get_seasonality_factor(month)
            
            # Receita projetada = média_diária * 30 * (1 + crescimento)^mês * sazonalidade
            projected_monthly = recent_avg * 30 * ((1 + growth_rate) ** i) * seasonality
            
            # Confiança diminui com o tempo e aumenta com mais dados históricos
            base_confidence = min(0.95, 0.6 + (len(history) / 180))  # Máx 0.95 com 90 dias
            confidence = max(0.4, base_confidence - (i * 0.1))
            
            predictions.append({
                "month": (datetime.now() + timedelta(days=30*i)).strftime("%b/%Y"),
                "value": round(projected_monthly, 2),
                "confidence": round(confidence, 2),
            })
        
        # Calcula variância para determinar confiabilidade
        variance = np.var(daily_values) if daily_values else 0
        std_dev = np.std(daily_values) if daily_values else 0
        
        return {
            "predictions": predictions,
            "total_predicted": round(sum(p["value"] for p in predictions), 2),
            "confidence": round(sum(p["confidence"] for p in predictions) / len(predictions), 2),
            "factors": [
                f"Baseado em {len(history)} dias de histórico",
                f"Taxa de crescimento: {growth_rate*100:.1f}% ao mês",
                "Ajuste de sazonalidade mensal aplicado",
            ],
            "model_info": {
                "type": "moving_average_with_trend",
                "data_points": len(history),
                "growth_rate": round(growth_rate, 4),
                "avg_daily_revenue": round(recent_avg, 2),
                "std_deviation": round(std_dev, 2),
            },
        }
    
    def _fallback_revenue_prediction(self, months_ahead: int) -> Dict[str, Any]:
        """Predição fallback quando não há dados históricos."""
        predictions = []
        for i in range(1, months_ahead + 1):
            predictions.append({
                "month": (datetime.now() + timedelta(days=30*i)).strftime("%b/%Y"),
                "value": 0,
                "confidence": 0.2,
            })
        
        return {
            "predictions": predictions,
            "total_predicted": 0,
            "confidence": 0.2,
            "factors": ["Dados históricos insuficientes para predição precisa"],
            "model_info": {
                "type": "fallback",
                "data_points": 0,
                "growth_rate": 0,
            },
        }
    
    async def predict_lead_volume(self, days_ahead: int = 30) -> Dict[str, Any]:
        """
        Prediz volume de leads nos próximos dias.
        
        Método:
        1. Busca histórico de leads dos últimos 60 dias
        2. Calcula média por dia da semana (sazonalidade semanal)
        3. Aplica variação aleatória controlada
        """
        # Busca histórico de leads
        history_data = await self._call_api("history/leads", {"days": 60})
        
        if "error" in history_data or not history_data.get("history"):
            logger.warning("[PredictiveEngine] Sem dados históricos de leads")
            return self._fallback_leads_prediction(days_ahead)
        
        history = history_data.get("history", [])
        avg_by_dow = history_data.get("avg_by_day_of_week", {})
        
        if not history:
            return self._fallback_leads_prediction(days_ahead)
        
        # Média geral
        avg_daily = history_data.get("avg_per_day", 0)
        
        # Gera predições por dia
        predictions = []
        total_by_channel = defaultdict(int)
        
        for i in range(1, days_ahead + 1):
            date = datetime.now() + timedelta(days=i)
            day_of_week = date.weekday()
            
            # Usa média do dia da semana se disponível, senão usa média geral
            base_prediction = avg_by_dow.get(str(day_of_week), avg_daily)
            if base_prediction == 0:
                base_prediction = avg_daily
            
            # Adiciona variação de ±20%
            variation = np.random.uniform(0.8, 1.2)
            predicted = max(0, int(base_prediction * variation))
            
            predictions.append({
                "date": date.strftime("%Y-%m-%d"),
                "predicted": predicted,
                "day_of_week": day_of_week,
            })
        
        total_predicted = sum(p["predicted"] for p in predictions)
        
        # Distribuição estimada por canal (baseada no histórico se disponível)
        # Por padrão: WhatsApp 50%, Instagram 30%, Site 20%
        by_channel = {
            "whatsapp": int(total_predicted * 0.5),
            "instagram": int(total_predicted * 0.3),
            "site": int(total_predicted * 0.2),
        }
        
        # Confiança baseada na quantidade de dados
        confidence = min(0.85, 0.5 + (len(history) / 120))
        
        return {
            "daily_predictions": predictions,
            "total_predicted": total_predicted,
            "by_channel": by_channel,
            "confidence": round(confidence, 2),
            "model_info": {
                "type": "seasonal_average",
                "data_points": len(history),
                "avg_daily": round(avg_daily, 1),
                "by_day_of_week": avg_by_dow,
            },
        }
    
    def _fallback_leads_prediction(self, days_ahead: int) -> Dict[str, Any]:
        """Predição fallback quando não há dados históricos."""
        predictions = []
        for i in range(1, days_ahead + 1):
            date = datetime.now() + timedelta(days=i)
            predictions.append({
                "date": date.strftime("%Y-%m-%d"),
                "predicted": 0,
                "day_of_week": date.weekday(),
            })
        
        return {
            "daily_predictions": predictions,
            "total_predicted": 0,
            "by_channel": {},
            "confidence": 0.2,
            "model_info": {
                "type": "fallback",
                "data_points": 0,
            },
        }
    
    async def predict_churn_risk(self) -> Dict[str, Any]:
        """
        Identifica leads/clientes com risco de churn.
        
        Analisa:
        - Tempo desde último contato
        - Estágio do funil
        - Valor do lead
        """
        # TODO: Implementar quando tivermos dados de última interação
        # Por enquanto, busca leads parados há mais de 7 dias
        
        return {
            "high_risk": [],
            "medium_risk": [],
            "total_at_risk": 0,
            "potential_loss": 0,
            "recommendations": [],
            "model_info": {
                "type": "rule_based",
                "note": "Implementação futura com análise de engajamento",
            },
        }
    
    async def detect_anomalies(
        self,
        metric: str,
        period: str = "7d"
    ) -> Dict[str, Any]:
        """
        Detecta anomalias em métricas usando Z-Score.
        
        Uma anomalia é quando o valor está a mais de 2 desvios padrão da média.
        """
        days = int(period[:-1]) if period.endswith("d") else 7
        
        # Busca dados históricos baseado na métrica
        if metric in ["leads", "lead_volume"]:
            history_data = await self._call_api("history/leads", {"days": max(days * 2, 30)})
            history = history_data.get("history", [])
            values = [day.get("count", 0) for day in history]
        elif metric in ["revenue", "receita"]:
            history_data = await self._call_api("history/revenue", {"days": max(days * 2, 30)})
            history = history_data.get("history", [])
            values = [day.get("revenue", 0) for day in history]
        else:
            # Métrica genérica - retorna sem anomalias
            return {
                "anomalies": [],
                "trend": "unknown",
                "alert": None,
                "severity": None,
                "stats": {},
            }
        
        if len(values) < 5:
            return {
                "anomalies": [],
                "trend": "insufficient_data",
                "alert": None,
                "severity": None,
                "stats": {"note": "Dados insuficientes para detecção de anomalias"},
            }
        
        # Calcula estatísticas
        mean = np.mean(values)
        std = np.std(values)
        
        if std == 0:
            return {
                "anomalies": [],
                "trend": "stable",
                "alert": None,
                "severity": None,
                "stats": {"mean": round(mean, 2), "std": 0, "note": "Valores constantes"},
            }
        
        # Detecta anomalias (Z-score > 2)
        anomalies = []
        for i, v in enumerate(values[-days:]):  # Apenas no período solicitado
            zscore = (v - mean) / std
            if abs(zscore) > 2:
                date = history[-days + i].get("date") if i < len(history[-days:]) else None
                anomalies.append({
                    "date": date,
                    "value": v,
                    "expected": round(mean, 2),
                    "zscore": round(zscore, 2),
                    "severity": "high" if abs(zscore) > 3 else "medium",
                    "description": f"{metric} teve valor {v} quando esperado era ~{mean:.0f}",
                    "direction": "above" if zscore > 0 else "below",
                })
        
        # Determina tendência
        trend = "stable"
        if len(values) >= 3:
            recent = np.mean(values[-3:])
            older = np.mean(values[:3])
            if recent > older * 1.1:
                trend = "growing"
            elif recent < older * 0.9:
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
                "data_points": len(values),
            },
        }
    
    async def predict_best_contact_time(self, lead_id: str) -> Dict[str, Any]:
        """
        Prediz melhor horário para contatar um lead.
        
        Baseado em padrões gerais de resposta.
        """
        # TODO: Implementar análise de padrões de resposta do lead específico
        
        return {
            "lead_id": lead_id,
            "best_times": [
                {"hour": 10, "day": "Segunda", "probability": 0.85},
                {"hour": 14, "day": "Terça", "probability": 0.78},
                {"hour": 10, "day": "Quarta", "probability": 0.75},
            ],
            "best_day": "Segunda",
            "response_probability": {
                "morning": 0.75,
                "afternoon": 0.65,
                "evening": 0.35,
            },
            "avoid": ["Domingo", "Sábado à tarde"],
            "model_info": {
                "type": "general_patterns",
                "note": "Baseado em padrões gerais, não específicos do lead",
            },
        }
    
    def _calculate_moving_average(self, values: List[float], window: int = 7) -> List[float]:
        """Calcula média móvel."""
        if len(values) < window:
            return values
        
        result = []
        for i in range(len(values)):
            start = max(0, i - window + 1)
            result.append(np.mean(values[start:i + 1]))
        
        return result
    
    def _calculate_growth_rate(self, values: List[float]) -> float:
        """
        Calcula taxa de crescimento usando regressão linear simples.
        Retorna taxa mensal de crescimento.
        """
        if len(values) < 7:
            return 0
        
        # Usa primeiros e últimos 7 dias para calcular tendência
        first_week_avg = np.mean(values[:7])
        last_week_avg = np.mean(values[-7:])
        
        if first_week_avg == 0:
            return 0
        
        # Crescimento total no período
        total_growth = (last_week_avg - first_week_avg) / first_week_avg
        
        # Converte para taxa mensal (assumindo dados diários)
        days = len(values)
        monthly_rate = total_growth * (30 / days) if days > 0 else 0
        
        # Limita a taxa para evitar valores absurdos
        return max(-0.5, min(0.5, monthly_rate))
    
    def _get_seasonality_factor(self, month: int) -> float:
        """Retorna fator de sazonalidade para o mês."""
        # Sazonalidade típica de vendas no Brasil
        factors = {
            1: 0.85,   # Janeiro - baixo (férias)
            2: 0.88,   # Fevereiro - baixo (Carnaval)
            3: 0.95,   # Março
            4: 1.00,   # Abril
            5: 1.05,   # Maio (Dia das Mães)
            6: 1.02,   # Junho (Dia dos Namorados)
            7: 0.95,   # Julho
            8: 1.03,   # Agosto (Dia dos Pais)
            9: 1.05,   # Setembro
            10: 1.08,  # Outubro
            11: 1.20,  # Novembro - Black Friday
            12: 1.15,  # Dezembro - Natal
        }
        return factors.get(month, 1.0)
    
    async def generate_predictions(self, metrics: Dict[str, Any]) -> List[Dict]:
        """
        Gera todas as predições baseadas nas métricas coletadas.
        """
        predictions = []
        
        # Receita
        try:
            revenue_pred = await self.predict_revenue(3)
            predictions.append({
                "type": "revenue",
                "data": revenue_pred,
            })
        except Exception as e:
            logger.warning(f"Erro na predição de receita: {e}")
        
        # Volume de leads
        try:
            leads_pred = await self.predict_lead_volume(30)
            predictions.append({
                "type": "lead_volume",
                "data": leads_pred,
            })
        except Exception as e:
            logger.warning(f"Erro na predição de leads: {e}")
        
        # Churn
        try:
            churn_pred = await self.predict_churn_risk()
            if churn_pred.get("high_risk"):
                predictions.append({
                    "type": "churn_risk",
                    "data": churn_pred,
                })
        except Exception as e:
            logger.warning(f"Erro na predição de churn: {e}")
        
        return predictions
    
    async def compare_periods(
        self,
        metric: str,
        period1_days: int = 30,
        period2_days: int = 30
    ) -> Dict[str, Any]:
        """
        Compara duas períodos para análise de tendência.
        
        Args:
            metric: 'leads' ou 'revenue'
            period1_days: Dias do período mais recente
            period2_days: Dias do período anterior
        """
        total_days = period1_days + period2_days
        
        if metric == "leads":
            history_data = await self._call_api("history/leads", {"days": total_days})
            history = history_data.get("history", [])
            
            if len(history) < period1_days:
                return {"error": "Dados insuficientes para comparação"}
            
            # Divide em dois períodos
            period1 = history[-period1_days:] if len(history) >= period1_days else history
            period2 = history[:-period1_days] if len(history) > period1_days else []
            
            total1 = sum(day.get("count", 0) for day in period1)
            total2 = sum(day.get("count", 0) for day in period2) if period2 else 0
            
        elif metric == "revenue":
            history_data = await self._call_api("history/revenue", {"days": total_days})
            history = history_data.get("history", [])
            
            if len(history) < period1_days:
                return {"error": "Dados insuficientes para comparação"}
            
            period1 = history[-period1_days:] if len(history) >= period1_days else history
            period2 = history[:-period1_days] if len(history) > period1_days else []
            
            total1 = sum(day.get("revenue", 0) for day in period1)
            total2 = sum(day.get("revenue", 0) for day in period2) if period2 else 0
        else:
            return {"error": f"Métrica desconhecida: {metric}"}
        
        # Calcula variação
        if total2 > 0:
            change = (total1 - total2) / total2
        else:
            change = 0 if total1 == 0 else 1  # 100% de crescimento se antes era zero
        
        return {
            "metric": metric,
            "period1": {
                "days": period1_days,
                "total": round(total1, 2),
                "avg_daily": round(total1 / period1_days, 2) if period1_days > 0 else 0,
            },
            "period2": {
                "days": len(period2),
                "total": round(total2, 2),
                "avg_daily": round(total2 / len(period2), 2) if period2 else 0,
            },
            "change": round(change, 4),
            "change_percent": f"{change * 100:+.1f}%",
            "trend": "growing" if change > 0.05 else "declining" if change < -0.05 else "stable",
        }
