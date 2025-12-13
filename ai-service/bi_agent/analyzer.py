"""
Data Analyzer - Motor de Análise de Dados
==========================================

Responsável por coletar e analisar métricas de todas as áreas do sistema.
Usa API interna do Laravel para acessar dados.
"""

import logging
import os
import httpx
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)

# Configuração da API Laravel
LARAVEL_URL = os.getenv("LARAVEL_API_URL", "http://nginx")
INTERNAL_KEY = os.getenv("LARAVEL_INTERNAL_KEY", "")


class DataAnalyzer:
    """
    Motor de análise de dados do BI Agent.
    
    Coleta métricas de:
    - Vendas (leads, funil, conversão)
    - Suporte (tickets, tempo de resposta)
    - Marketing (campanhas, ROAS, CPL)
    - Financeiro (receita, custos)
    - IA (performance dos agentes)
    """
    
    def __init__(self, tenant_id: str, ad_account_id: Optional[str] = None):
        self.tenant_id = tenant_id
        self.ad_account_id = ad_account_id
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
                    logger.error(f"[DataAnalyzer] Erro na API {endpoint}: {response.status_code} - {response.text}")
                    return {"error": f"API error: {response.status_code}"}
                    
        except Exception as e:
            logger.error(f"[DataAnalyzer] Erro ao chamar {endpoint}: {e}")
            return {"error": str(e)}
    
    async def collect_sales_metrics(self, period: str = "30d") -> Dict[str, Any]:
        """Coleta métricas de vendas via API Laravel."""
        result = await self._call_api("metrics/sales", {"period": period})
        
        if "error" in result:
            return self._empty_sales_metrics()
        
        return {
            "total_leads": result.get("total_leads", 0),
            "leads_in_period": result.get("leads_in_period", 0),
            "leads_by_stage": result.get("leads_by_stage", {}),
            "leads_by_channel": result.get("leads_by_channel", {}),
            "conversion_rate": result.get("conversion_rate", 0),
            "conversion_rate_change": 0,  # Calculado separadamente
            "avg_time_to_close_days": result.get("avg_time_to_close_days", 0),
            "total_value": result.get("total_value", 0),
            "avg_deal_size": result.get("avg_deal_size", 0),
            "closed_leads": result.get("closed_leads", 0),
        }
    
    def _empty_sales_metrics(self) -> Dict[str, Any]:
        """Retorna métricas de vendas vazias."""
        return {
            "total_leads": 0,
            "leads_in_period": 0,
            "leads_by_stage": {},
            "leads_by_channel": {},
            "conversion_rate": 0,
            "conversion_rate_change": 0,
            "avg_time_to_close_days": 0,
            "total_value": 0,
            "avg_deal_size": 0,
            "closed_leads": 0,
        }
    
    async def collect_support_metrics(self, period: str = "30d") -> Dict[str, Any]:
        """Coleta métricas de suporte via API Laravel."""
        result = await self._call_api("metrics/support", {"period": period})
        
        if "error" in result:
            return self._empty_support_metrics()
        
        return {
            "total_tickets": result.get("total_tickets", 0),
            "tickets_in_period": result.get("tickets_in_period", 0),
            "open_tickets": result.get("open_tickets", 0),
            "resolved_in_period": result.get("resolved_in_period", 0),
            "by_status": result.get("by_status", {}),
            "by_channel": result.get("by_channel", {}),
            "avg_response_time": result.get("avg_response_time_minutes", 0),
            "avg_resolution_time": result.get("avg_resolution_time_hours", 0),
            "satisfaction_score": result.get("satisfaction_score"),
            "fcr_rate": 0,
        }
    
    def _empty_support_metrics(self) -> Dict[str, Any]:
        """Retorna métricas de suporte vazias."""
        return {
            "total_tickets": 0,
            "tickets_in_period": 0,
            "open_tickets": 0,
            "resolved_in_period": 0,
            "by_status": {},
            "by_channel": {},
            "avg_response_time": 0,
            "avg_resolution_time": 0,
            "satisfaction_score": None,
            "fcr_rate": 0,
        }
    
    async def collect_marketing_metrics(self, period: str = "30d") -> Dict[str, Any]:
        """Coleta métricas de marketing via API Laravel."""
        params = {"period": period}
        if self.ad_account_id:
            params["ad_account_id"] = self.ad_account_id
            
        result = await self._call_api("metrics/marketing", params)
        
        if "error" in result:
            return self._empty_marketing_metrics()
        
        return {
            "total_spend": result.get("total_spend", 0),
            "total_impressions": result.get("total_impressions", 0),
            "total_clicks": result.get("total_clicks", 0),
            "total_conversions": result.get("total_conversions", 0),
            "total_leads_generated": sum(result.get("leads_by_channel", {}).values()),
            "cpl": result.get("cpl", 0),
            "cac": 0,
            "roas": result.get("avg_roas", 0),
            "best_channel": list(result.get("leads_by_channel", {}).keys())[0] if result.get("leads_by_channel") else None,
            "campaigns_active": result.get("active_campaigns", 0),
            "best_campaign": result.get("best_campaign"),
            "filtered_by_account": result.get("filtered_by_account", False),
        }
    
    def _empty_marketing_metrics(self) -> Dict[str, Any]:
        """Retorna métricas de marketing vazias."""
        return {
            "total_spend": 0,
            "total_impressions": 0,
            "total_clicks": 0,
            "total_conversions": 0,
            "total_leads_generated": 0,
            "cpl": 0,
            "cac": 0,
            "roas": 0,
            "best_channel": None,
            "campaigns_active": 0,
            "best_campaign": None,
            "filtered_by_account": False,
        }
    
    async def collect_financial_metrics(self, period: str = "30d") -> Dict[str, Any]:
        """Coleta métricas financeiras via API Laravel."""
        result = await self._call_api("metrics/financial", {"period": period})
        
        if "error" in result:
            return self._empty_financial_metrics()
        
        return {
            "revenue": result.get("revenue_current", 0),
            "revenue_previous": result.get("revenue_previous", 0),
            "revenue_growth": result.get("revenue_growth", 0),
            "ai_cost": result.get("ai_cost", 0),
            "ai_actions_count": result.get("ai_actions_count", 0),
            "gross_margin": 0,
            "ltv": 0,
            "roi_on_ai": result.get("roi_on_ai", 0),
            "marketing_spend": result.get("marketing_spend", 0),
        }
    
    def _empty_financial_metrics(self) -> Dict[str, Any]:
        """Retorna métricas financeiras vazias."""
        return {
            "revenue": 0,
            "revenue_previous": 0,
            "revenue_growth": 0,
            "ai_cost": 0,
            "ai_actions_count": 0,
            "gross_margin": 0,
            "ltv": 0,
            "roi_on_ai": 0,
            "marketing_spend": 0,
        }
    
    async def collect_ai_metrics(self, period: str = "30d") -> Dict[str, Any]:
        """Coleta métricas dos agentes IA via API Laravel."""
        result = await self._call_api("metrics/ai", {"period": period})
        
        if "error" in result:
            return self._empty_ai_metrics()
        
        return {
            "total_decisions": result.get("total_decisions", 0),
            "overrides": result.get("overrides", 0),
            "override_rate": result.get("override_rate", 0),
            "sdr_accuracy": result.get("accuracy", 0),
            "ads_accuracy": result.get("accuracy", 0),
            "by_agent_type": result.get("by_agent_type", {}),
            "by_action_type": result.get("by_action_type", {}),
            "policy_mode": "rule_based",
        }
    
    def _empty_ai_metrics(self) -> Dict[str, Any]:
        """Retorna métricas de IA vazias."""
        return {
            "total_decisions": 0,
            "overrides": 0,
            "override_rate": 0,
            "sdr_accuracy": 0,
            "ads_accuracy": 0,
            "by_agent_type": {},
            "by_action_type": {},
            "policy_mode": "rule_based",
        }
    
    async def analyze_sales_funnel(
        self,
        period: str = "30d",
        pipeline_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Analisa funil de vendas completo."""
        params = {}
        if pipeline_id:
            params["pipeline_id"] = pipeline_id
            
        result = await self._call_api("funnel", params)
        
        if "error" in result or not result.get("stages"):
            return self._empty_funnel_analysis()
        
        stages = result.get("stages", [])
        bottleneck = result.get("bottleneck")
        
        # Gera recomendações
        recommendations = []
        if bottleneck and bottleneck.get("conversion_to_next", 1) < 0.5:
            recommendations.append(
                f"Gargalo em '{bottleneck.get('name')}' com {bottleneck.get('conversion_to_next', 0)*100:.0f}% de conversão"
            )
        if result.get("total_leads", 0) == 0:
            recommendations.append("Nenhum lead cadastrado ainda. Comece a captar leads!")
        
        return {
            "pipeline_name": result.get("pipeline_name"),
            "total_leads": result.get("total_leads", 0),
            "won_leads": result.get("won_leads", 0),
            "stages": stages,
            "bottleneck": {
                "stage": bottleneck.get("name") if bottleneck else None,
                "conversion_rate": bottleneck.get("conversion_to_next", 0) if bottleneck else 0,
                "recommendation": f"Focar em melhorar conversão do estágio {bottleneck.get('name')}" if bottleneck else None,
            } if bottleneck else None,
            "conversion_rate": result.get("conversion_rate", 0),
            "conversion_by_channel": {},  # TODO: Adicionar no endpoint
            "recommendations": recommendations,
        }
    
    def _empty_funnel_analysis(self) -> Dict[str, Any]:
        return {
            "pipeline_name": None,
            "total_leads": 0,
            "won_leads": 0,
            "stages": [],
            "bottleneck": None,
            "conversion_rate": 0,
            "conversion_by_channel": {},
            "recommendations": ["Sem dados suficientes para análise de funil."],
        }
    
    async def analyze_support_metrics(self, period: str = "30d") -> Dict[str, Any]:
        """Analisa métricas de suporte/atendimento."""
        result = await self._call_api("metrics/support", {"period": period})
        
        if "error" in result:
            return self._empty_support_analysis()
        
        recommendations = []
        if result.get("total_tickets", 0) == 0:
            recommendations.append("Nenhum ticket registrado ainda.")
        if result.get("open_tickets", 0) > 10:
            recommendations.append(f"Atenção: {result.get('open_tickets')} tickets abertos aguardando atendimento.")
        
        return {
            "total_tickets": result.get("total_tickets", 0),
            "tickets_in_period": result.get("tickets_in_period", 0),
            "open_tickets": result.get("open_tickets", 0),
            "resolved_in_period": result.get("resolved_in_period", 0),
            "by_status": result.get("by_status", {}),
            "by_channel": result.get("by_channel", {}),
            "recommendations": recommendations,
        }
    
    def _empty_support_analysis(self) -> Dict[str, Any]:
        return {
            "total_tickets": 0,
            "tickets_in_period": 0,
            "open_tickets": 0,
            "resolved_in_period": 0,
            "by_status": {},
            "by_channel": {},
            "recommendations": ["Sem dados de suporte para análise."],
        }
    
    async def analyze_marketing_performance(self, period: str = "30d") -> Dict[str, Any]:
        """Analisa performance de marketing."""
        params = {"period": period}
        if self.ad_account_id:
            params["ad_account_id"] = self.ad_account_id
            
        result = await self._call_api("metrics/marketing", params)
        
        if "error" in result:
            return self._empty_marketing_analysis()
        
        recommendations = []
        if result.get("total_campaigns", 0) == 0:
            if self.ad_account_id:
                recommendations.append("Nenhuma campanha encontrada para a conta selecionada.")
            else:
                recommendations.append("Nenhuma campanha cadastrada. Configure o Ads Intelligence.")
        elif result.get("total_spend", 0) == 0:
            recommendations.append("Nenhum gasto registrado nas campanhas.")
        elif result.get("avg_roas", 0) < 1.0:
            recommendations.append("ROAS abaixo de 1.0 - revise as campanhas.")
        
        response = {
            "total_spend": result.get("total_spend", 0),
            "total_leads": sum(result.get("leads_by_channel", {}).values()),
            "cpl": result.get("cpl", 0),
            "roas": result.get("avg_roas", 0),
            "campaigns_count": result.get("total_campaigns", 0),
            "active_campaigns": result.get("active_campaigns", 0),
            "best_campaign": result.get("best_campaign"),
            "campaigns": [],  # Seria preenchido com lista de campanhas
            "recommendations": recommendations,
        }
        
        if self.ad_account_id:
            response["filtered_account"] = {
                "id": self.ad_account_id,
            }
        
        return response
    
    def _empty_marketing_analysis(self) -> Dict[str, Any]:
        return {
            "total_spend": 0,
            "total_leads": 0,
            "cpl": 0,
            "roas": 0,
            "campaigns_count": 0,
            "active_campaigns": 0,
            "best_campaign": None,
            "campaigns": [],
            "recommendations": ["Sem dados de marketing para análise."],
        }
    
    async def analyze_financial_metrics(self, period: str = "30d") -> Dict[str, Any]:
        """Analisa métricas financeiras."""
        return await self.collect_financial_metrics(period)
    
    async def get_executive_summary(self, period: str = "30d") -> Dict[str, Any]:
        """Gera resumo executivo com principais KPIs."""
        # Coleta dados de todas as áreas em paralelo
        import asyncio
        
        results = await asyncio.gather(
            self.collect_sales_metrics(period),
            self.collect_marketing_metrics(period),
            self.collect_financial_metrics(period),
            self.collect_ai_metrics(period),
        )
        
        sales, marketing, financial, ai = results
        
        # Gera highlights apenas se há dados
        highlights = []
        has_data = sales.get("total_leads", 0) > 0 or financial.get("revenue", 0) > 0
        
        if has_data:
            if financial.get("revenue_growth", 0) > 0:
                highlights.append(f"Receita cresceu {financial.get('revenue_growth', 0)*100:.0f}% vs período anterior")
            elif financial.get("revenue_growth", 0) < 0:
                highlights.append(f"Receita caiu {abs(financial.get('revenue_growth', 0))*100:.0f}% vs período anterior")
            
            if financial.get("roi_on_ai", 0) > 0:
                highlights.append(f"ROI de {financial.get('roi_on_ai', 0):.1f}x no investimento em IA")
            
            if ai.get("sdr_accuracy", 0) > 0:
                highlights.append(f"SDR Agent com {ai.get('sdr_accuracy', 0)*100:.0f}% de precisão")
        
        # Predições baseadas nos dados reais
        revenue = financial.get("revenue", 0)
        total_leads = sales.get("total_leads", 0)
        conversion_rate = sales.get("conversion_rate", 0)
        avg_deal_size = sales.get("avg_deal_size", 0)
        
        # Previsão simples: crescimento baseado na taxa atual
        growth_rate = financial.get("revenue_growth", 0) if financial.get("revenue_growth", 0) > 0 else 0.15
        next_month_revenue = revenue * (1 + growth_rate) if revenue > 0 else 0
        
        # Leads necessários para atingir meta
        leads_needed = 0
        if avg_deal_size > 0 and conversion_rate > 0:
            leads_needed = int(next_month_revenue / (avg_deal_size * conversion_rate))
        
        return {
            "revenue": {
                "current": financial.get("revenue", 0),
                "previous": financial.get("revenue_previous", 0),
                "growth": financial.get("revenue_growth", 0),
            },
            "leads": {
                "total": sales.get("total_leads", 0),
                "converted": sales.get("closed_leads", 0),
                "rate": sales.get("conversion_rate", 0),
            },
            "conversion_rate": {
                "current": sales.get("conversion_rate", 0),
                "change": sales.get("conversion_rate_change", 0),
            },
            "ai_cost": {
                "current": financial.get("ai_cost", 0),
                "roi": financial.get("roi_on_ai", 0),
            },
            "roas": {
                "current": marketing.get("roas", 0),
                "best_campaign": marketing.get("best_campaign", {}).get("name") if marketing.get("best_campaign") else "",
            },
            "highlights": highlights,
            "alerts": self._generate_alerts(sales, marketing, financial) if has_data else [],
            "top_channel": marketing.get("best_channel"),
            "predictions": {
                "next_month_revenue": next_month_revenue,
                "leads_needed": leads_needed,
            } if has_data else {},
        }
    
    def _generate_alerts(
        self,
        sales: Dict,
        marketing: Dict,
        financial: Dict
    ) -> List[Dict]:
        """Gera alertas baseados nos dados."""
        alerts = []
        
        if sales.get("conversion_rate_change", 0) < -0.1:
            alerts.append({
                "type": "warning",
                "message": "Taxa de conversão caiu mais de 10%",
                "severity": "high",
            })
        
        if marketing.get("roas", 1) < 1.0 and marketing.get("total_spend", 0) > 0:
            alerts.append({
                "type": "critical",
                "message": "ROAS abaixo de 1.0 - campanhas estão dando prejuízo",
                "severity": "critical",
            })
        
        return alerts
    
    async def get_leads_history(self, days: int = 30) -> Dict[str, Any]:
        """Obtém histórico de leads para predições."""
        result = await self._call_api("history/leads", {"days": days})
        
        if "error" in result:
            return {"history": [], "total": 0, "avg_per_day": 0}
        
        return result
    
    async def get_revenue_history(self, days: int = 90) -> Dict[str, Any]:
        """Obtém histórico de receita para predições."""
        result = await self._call_api("history/revenue", {"days": days})
        
        if "error" in result:
            return {"history": [], "total_revenue": 0, "avg_daily_revenue": 0}
        
        return result
    
    def _parse_period(self, period: str) -> int:
        """Converte string de período para número de dias."""
        if period.endswith("d"):
            return int(period[:-1])
        elif period.endswith("w"):
            return int(period[:-1]) * 7
        elif period.endswith("m"):
            return int(period[:-1]) * 30
        return 30
    
    async def generate_insights(
        self,
        metrics: Dict[str, Any],
        predictions: List[Dict],
        anomalies: List[Dict]
    ) -> List[Dict]:
        """Gera insights a partir dos dados coletados."""
        insights = []
        
        # Analisa cada área
        for area, data in metrics.items():
            area_insights = self._analyze_area(area, data)
            insights.extend(area_insights)
        
        # Adiciona insights de anomalias
        for anomaly in anomalies:
            insights.append({
                "type": "anomaly",
                "category": anomaly.get("area", "general"),
                "title": f"Anomalia em {anomaly.get('metric', 'métrica')}",
                "content": anomaly.get("description", ""),
                "confidence": 0.85,
                "priority": anomaly.get("severity", "medium"),
            })
        
        # Ordena por prioridade
        priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        insights.sort(key=lambda x: priority_order.get(x.get("priority", "low"), 3))
        
        return insights
    
    def _analyze_area(self, area: str, data: Dict) -> List[Dict]:
        """Analisa uma área específica e gera insights."""
        insights = []
        
        if area == "sales":
            if data.get("conversion_rate_change", 0) < -0.1:
                insights.append({
                    "type": "warning",
                    "category": "sales",
                    "title": "Queda na taxa de conversão",
                    "content": f"Taxa caiu {abs(data.get('conversion_rate_change', 0)*100):.1f}%",
                    "confidence": 0.9,
                    "priority": "high",
                })
        
        elif area == "marketing":
            if data.get("roas", 1) < 1.0 and data.get("total_spend", 0) > 0:
                insights.append({
                    "type": "warning",
                    "category": "marketing",
                    "title": "ROAS crítico",
                    "content": f"ROAS de {data.get('roas', 0):.2f}x está abaixo do mínimo",
                    "confidence": 0.95,
                    "priority": "critical",
                })
        
        return insights
