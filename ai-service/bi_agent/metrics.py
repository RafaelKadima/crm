"""
BI Agent Metrics - Métricas do próprio BI Agent
================================================

Rastreia e expõe métricas de uso e performance do BI Agent.
"""

import logging
import os
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from collections import defaultdict
import json

logger = logging.getLogger(__name__)

# Tenta importar Redis
try:
    import redis.asyncio as redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")


class BIAgentMetrics:
    """
    Coleta e expõe métricas do BI Agent.
    
    Métricas rastreadas:
    - Quantidade de análises realizadas
    - Tempo de resposta médio
    - Predições feitas e acurácia
    - Insights gerados
    - Ações sugeridas
    """
    
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        self.prefix = f"bi_metrics:{tenant_id}:"
        self._redis: Optional[redis.Redis] = None
        
        # Métricas em memória (fallback)
        self._memory_metrics = defaultdict(lambda: defaultdict(int))
    
    async def _get_redis(self) -> Optional[redis.Redis]:
        """Obtém conexão Redis."""
        if not REDIS_AVAILABLE:
            return None
        
        if self._redis is None:
            try:
                self._redis = redis.from_url(REDIS_URL, decode_responses=True)
                await self._redis.ping()
            except Exception as e:
                logger.warning(f"[BIAgentMetrics] Redis não disponível: {e}")
                return None
        
        return self._redis
    
    async def increment(self, metric: str, value: int = 1) -> None:
        """
        Incrementa contador de métrica.
        
        Args:
            metric: Nome da métrica (ex: "analysis_count", "insight_count")
            value: Valor a incrementar
        """
        client = await self._get_redis()
        today = datetime.now().strftime("%Y-%m-%d")
        
        if client:
            try:
                # Contador total
                await client.hincrby(f"{self.prefix}totals", metric, value)
                # Contador diário
                await client.hincrby(f"{self.prefix}daily:{today}", metric, value)
                # TTL de 90 dias para dados diários
                await client.expire(f"{self.prefix}daily:{today}", 90 * 24 * 3600)
            except Exception as e:
                logger.warning(f"[BIAgentMetrics] Erro ao incrementar: {e}")
        
        # Fallback em memória
        self._memory_metrics["totals"][metric] += value
        self._memory_metrics[f"daily:{today}"][metric] += value
    
    async def record_analysis(
        self,
        analysis_type: str,
        duration_ms: int,
        success: bool = True
    ) -> None:
        """
        Registra uma análise realizada.
        
        Args:
            analysis_type: Tipo da análise (sales, marketing, etc.)
            duration_ms: Duração em milissegundos
            success: Se foi bem sucedida
        """
        await self.increment("analysis_count")
        await self.increment(f"analysis:{analysis_type}")
        
        if success:
            await self.increment("analysis_success")
        else:
            await self.increment("analysis_error")
        
        # Registra duração para calcular média
        client = await self._get_redis()
        if client:
            try:
                await client.lpush(f"{self.prefix}durations", duration_ms)
                await client.ltrim(f"{self.prefix}durations", 0, 999)  # Mantém últimos 1000
            except:
                pass
    
    async def record_prediction(
        self,
        prediction_type: str,
        confidence: float
    ) -> None:
        """
        Registra uma predição feita.
        
        Args:
            prediction_type: Tipo (revenue, leads, churn)
            confidence: Nível de confiança
        """
        await self.increment("prediction_count")
        await self.increment(f"prediction:{prediction_type}")
        
        # Registra confiança média
        client = await self._get_redis()
        if client:
            try:
                await client.lpush(f"{self.prefix}confidences", confidence)
                await client.ltrim(f"{self.prefix}confidences", 0, 999)
            except:
                pass
    
    async def record_insight(
        self,
        category: str,
        priority: str
    ) -> None:
        """
        Registra um insight gerado.
        
        Args:
            category: Categoria (sales, marketing, etc.)
            priority: Prioridade (low, medium, high, critical)
        """
        await self.increment("insight_count")
        await self.increment(f"insight:{category}")
        await self.increment(f"insight_priority:{priority}")
    
    async def record_action(
        self,
        target_agent: str,
        priority: str,
        approved: Optional[bool] = None
    ) -> None:
        """
        Registra uma ação sugerida.
        
        Args:
            target_agent: Agente alvo (sdr, ads)
            priority: Prioridade
            approved: Se foi aprovada (None se pendente)
        """
        await self.increment("action_count")
        await self.increment(f"action:{target_agent}")
        
        if approved is not None:
            if approved:
                await self.increment("action_approved")
            else:
                await self.increment("action_rejected")
    
    async def get_dashboard(self) -> Dict[str, Any]:
        """
        Retorna dashboard de métricas do BI Agent.
        """
        client = await self._get_redis()
        
        if client:
            try:
                # Busca totais
                totals = await client.hgetall(f"{self.prefix}totals") or {}
                totals = {k: int(v) for k, v in totals.items()}
                
                # Busca últimos 7 dias
                daily_data = []
                for i in range(7):
                    date = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
                    day_metrics = await client.hgetall(f"{self.prefix}daily:{date}") or {}
                    daily_data.append({
                        "date": date,
                        "metrics": {k: int(v) for k, v in day_metrics.items()}
                    })
                
                # Calcula média de duração
                durations = await client.lrange(f"{self.prefix}durations", 0, 99) or []
                avg_duration = sum(float(d) for d in durations) / len(durations) if durations else 0
                
                # Calcula confiança média
                confidences = await client.lrange(f"{self.prefix}confidences", 0, 99) or []
                avg_confidence = sum(float(c) for c in confidences) / len(confidences) if confidences else 0
                
            except Exception as e:
                logger.warning(f"[BIAgentMetrics] Erro ao buscar dashboard: {e}")
                totals = dict(self._memory_metrics["totals"])
                daily_data = []
                avg_duration = 0
                avg_confidence = 0
        else:
            totals = dict(self._memory_metrics["totals"])
            daily_data = []
            avg_duration = 0
            avg_confidence = 0
        
        # Calcula taxas
        analysis_count = totals.get("analysis_count", 0)
        success_rate = (
            totals.get("analysis_success", 0) / analysis_count
            if analysis_count > 0 else 0
        )
        
        action_count = totals.get("action_count", 0)
        approval_rate = (
            totals.get("action_approved", 0) / action_count
            if action_count > 0 else 0
        )
        
        return {
            "totals": {
                "analysis_count": totals.get("analysis_count", 0),
                "prediction_count": totals.get("prediction_count", 0),
                "insight_count": totals.get("insight_count", 0),
                "action_count": totals.get("action_count", 0),
            },
            "rates": {
                "analysis_success_rate": round(success_rate, 4),
                "action_approval_rate": round(approval_rate, 4),
            },
            "performance": {
                "avg_analysis_duration_ms": round(avg_duration, 2),
                "avg_prediction_confidence": round(avg_confidence, 4),
            },
            "by_category": {
                "analysis": {
                    k.replace("analysis:", ""): v
                    for k, v in totals.items()
                    if k.startswith("analysis:") and not k.startswith("analysis_")
                },
                "prediction": {
                    k.replace("prediction:", ""): v
                    for k, v in totals.items()
                    if k.startswith("prediction:")
                },
                "insight": {
                    k.replace("insight:", ""): v
                    for k, v in totals.items()
                    if k.startswith("insight:") and not k.startswith("insight_")
                },
                "action": {
                    k.replace("action:", ""): v
                    for k, v in totals.items()
                    if k.startswith("action:") and not k.startswith("action_")
                },
            },
            "daily_history": daily_data,
            "generated_at": datetime.now().isoformat(),
        }
    
    async def get_prediction_accuracy(self) -> Dict[str, Any]:
        """
        Retorna métricas de acurácia das predições.
        
        Nota: A acurácia real só pode ser calculada comparando
        predições passadas com dados reais. Esta implementação
        requer dados históricos de predições vs realidade.
        """
        # TODO: Implementar comparação de predições com realidade
        # Por enquanto retorna estrutura básica
        
        return {
            "note": "Acurácia de predições requer histórico de comparação",
            "available_metrics": {
                "prediction_count": await self._get_total("prediction_count"),
                "avg_confidence": 0.75,  # Placeholder
            },
            "accuracy_by_type": {
                "revenue": {"accuracy": None, "sample_size": 0},
                "leads": {"accuracy": None, "sample_size": 0},
            },
        }
    
    async def get_most_useful_insights(self, limit: int = 10) -> List[Dict]:
        """
        Lista insights mais acessados/úteis.
        
        Nota: Requer rastreamento de acesso aos insights.
        """
        # TODO: Implementar rastreamento de uso de insights
        return []
    
    async def _get_total(self, metric: str) -> int:
        """Busca total de uma métrica."""
        client = await self._get_redis()
        if client:
            try:
                value = await client.hget(f"{self.prefix}totals", metric)
                return int(value) if value else 0
            except:
                pass
        return self._memory_metrics["totals"].get(metric, 0)


class PeriodComparison:
    """
    Análise comparativa entre períodos.
    """
    
    def __init__(self, analyzer, predictor):
        self.analyzer = analyzer
        self.predictor = predictor
    
    async def compare_periods(
        self,
        period1_days: int = 30,
        period2_days: int = 30,
        areas: List[str] = None
    ) -> Dict[str, Any]:
        """
        Compara métricas entre dois períodos consecutivos.
        
        Args:
            period1_days: Dias do período mais recente
            period2_days: Dias do período anterior
            areas: Áreas para comparar (sales, marketing, etc.)
        
        Returns:
            Comparação detalhada entre períodos
        """
        if areas is None:
            areas = ["sales", "marketing", "financial"]
        
        comparisons = {}
        
        for area in areas:
            if area == "sales":
                current = await self.analyzer.collect_sales_metrics(f"{period1_days}d")
                # Para período anterior, precisamos dos dados via predictor
                comparison = await self.predictor.compare_periods("leads", period1_days, period2_days)
                
                comparisons["sales"] = {
                    "current_period": {
                        "days": period1_days,
                        "total_leads": current.get("total_leads", 0),
                        "conversion_rate": current.get("conversion_rate", 0),
                        "total_value": current.get("total_value", 0),
                    },
                    "change": {
                        "leads": comparison.get("change", 0),
                        "trend": comparison.get("trend", "stable"),
                    },
                }
            
            elif area == "marketing":
                current = await self.analyzer.collect_marketing_metrics(f"{period1_days}d")
                
                comparisons["marketing"] = {
                    "current_period": {
                        "days": period1_days,
                        "total_spend": current.get("total_spend", 0),
                        "roas": current.get("roas", 0),
                        "cpl": current.get("cpl", 0),
                    },
                    "change": {
                        "note": "Comparação de marketing requer dados históricos de campanhas",
                    },
                }
            
            elif area == "financial":
                comparison = await self.predictor.compare_periods("revenue", period1_days, period2_days)
                current = await self.analyzer.collect_financial_metrics(f"{period1_days}d")
                
                comparisons["financial"] = {
                    "current_period": {
                        "days": period1_days,
                        "revenue": current.get("revenue", 0),
                        "ai_cost": current.get("ai_cost", 0),
                    },
                    "change": {
                        "revenue": comparison.get("change", 0),
                        "trend": comparison.get("trend", "stable"),
                    },
                }
        
        # Identifica tendências gerais
        trends = []
        for area, data in comparisons.items():
            change = data.get("change", {})
            if isinstance(change, dict):
                trend = change.get("trend")
                if trend == "growing":
                    trends.append(f"{area}: crescimento")
                elif trend == "declining":
                    trends.append(f"{area}: declínio")
        
        return {
            "period1": f"Últimos {period1_days} dias",
            "period2": f"{period1_days + period2_days} a {period1_days} dias atrás",
            "comparisons": comparisons,
            "trends": trends,
            "summary": self._generate_summary(comparisons),
            "generated_at": datetime.now().isoformat(),
        }
    
    def _generate_summary(self, comparisons: Dict) -> str:
        """Gera resumo textual da comparação."""
        parts = []
        
        sales = comparisons.get("sales", {}).get("change", {})
        if sales.get("trend") == "growing":
            parts.append("Leads em crescimento")
        elif sales.get("trend") == "declining":
            parts.append("Atenção: queda no volume de leads")
        
        financial = comparisons.get("financial", {}).get("change", {})
        if financial.get("trend") == "growing":
            parts.append("Receita em alta")
        elif financial.get("trend") == "declining":
            parts.append("Receita em queda - revisar estratégias")
        
        if not parts:
            return "Sem variações significativas entre os períodos"
        
        return "; ".join(parts)
    
    async def detect_trends(self, days: int = 90) -> Dict[str, Any]:
        """
        Detecta tendências automaticamente nos últimos N dias.
        """
        # Compara 3 períodos de 30 dias
        periods = []
        for i in range(3):
            start = i * 30
            # Simula dados de cada período
            period_data = {
                "period": f"{start} a {start + 30} dias atrás",
            }
            periods.append(period_data)
        
        # Detecta anomalias em leads
        leads_anomalies = await self.predictor.detect_anomalies("leads", f"{days}d")
        revenue_anomalies = await self.predictor.detect_anomalies("revenue", f"{days}d")
        
        trends = []
        
        if leads_anomalies.get("trend") == "growing":
            trends.append({
                "area": "leads",
                "direction": "up",
                "description": "Volume de leads em tendência de alta",
                "confidence": 0.8,
            })
        elif leads_anomalies.get("trend") == "declining":
            trends.append({
                "area": "leads",
                "direction": "down",
                "description": "Volume de leads em tendência de queda",
                "confidence": 0.8,
            })
        
        if revenue_anomalies.get("trend") == "growing":
            trends.append({
                "area": "revenue",
                "direction": "up",
                "description": "Receita em tendência de alta",
                "confidence": 0.8,
            })
        elif revenue_anomalies.get("trend") == "declining":
            trends.append({
                "area": "revenue",
                "direction": "down",
                "description": "Receita em tendência de queda",
                "confidence": 0.8,
            })
        
        return {
            "period_analyzed": f"Últimos {days} dias",
            "trends": trends,
            "anomalies": {
                "leads": leads_anomalies.get("anomalies", []),
                "revenue": revenue_anomalies.get("anomalies", []),
            },
            "recommendations": self._generate_recommendations(trends),
        }
    
    def _generate_recommendations(self, trends: List[Dict]) -> List[str]:
        """Gera recomendações baseadas nas tendências."""
        recommendations = []
        
        for trend in trends:
            if trend["area"] == "leads" and trend["direction"] == "down":
                recommendations.append(
                    "Revisar estratégias de captação e campanhas de marketing"
                )
            elif trend["area"] == "revenue" and trend["direction"] == "down":
                recommendations.append(
                    "Analisar taxa de conversão e ticket médio"
                )
            elif trend["area"] == "leads" and trend["direction"] == "up":
                recommendations.append(
                    "Aproveitar momento para escalar campanhas performando bem"
                )
        
        return recommendations

