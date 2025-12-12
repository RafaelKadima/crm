"""
Data Analyzer - Motor de Análise de Dados
==========================================

Responsável por coletar e analisar métricas de todas as áreas do sistema.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
import asyncio

logger = logging.getLogger(__name__)


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
    
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        self._db = None  # Será injetado
    
    async def collect_sales_metrics(self) -> Dict[str, Any]:
        """Coleta métricas de vendas."""
        # TODO: Implementar coleta real do banco
        return {
            "total_leads": 450,
            "leads_by_stage": {
                "novo": 120,
                "contato": 100,
                "qualificado": 80,
                "proposta": 50,
                "fechado": 40,
                "perdido": 60,
            },
            "conversion_rate": 0.18,
            "conversion_rate_change": -0.05,
            "avg_time_to_close_days": 12,
            "total_value": 150000,
            "avg_deal_size": 3750,
        }
    
    async def collect_support_metrics(self) -> Dict[str, Any]:
        """Coleta métricas de suporte."""
        return {
            "total_tickets": 230,
            "open_tickets": 45,
            "avg_response_time": 25,  # minutos
            "avg_resolution_time": 4.5,  # horas
            "satisfaction_score": 4.2,
            "fcr_rate": 0.72,  # First Contact Resolution
        }
    
    async def collect_marketing_metrics(self) -> Dict[str, Any]:
        """Coleta métricas de marketing."""
        return {
            "total_spend": 15000,
            "total_leads_generated": 280,
            "cpl": 53.57,
            "cac": 350,
            "roas": 3.2,
            "best_channel": "whatsapp",
            "campaigns_active": 8,
        }
    
    async def collect_financial_metrics(self) -> Dict[str, Any]:
        """Coleta métricas financeiras."""
        return {
            "revenue": 150000,
            "revenue_growth": 0.15,
            "ai_cost": 850,
            "gross_margin": 0.65,
            "ltv": 4500,
        }
    
    async def collect_ai_metrics(self) -> Dict[str, Any]:
        """Coleta métricas dos agentes IA."""
        return {
            "sdr_accuracy": 0.92,
            "ads_accuracy": 0.87,
            "total_decisions": 1250,
            "overrides": 42,
            "override_rate": 0.034,
            "policy_mode": "bandit",
        }
    
    async def analyze_sales_funnel(
        self,
        period: str = "30d",
        pipeline_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Analisa funil de vendas completo.
        
        Identifica:
        - Gargalos
        - Taxa de conversão por estágio
        - Tempo médio por estágio
        - Performance por canal
        """
        days = self._parse_period(period)
        
        # TODO: Implementar análise real
        stages = [
            {"name": "Novo", "count": 120, "conversion_to_next": 0.83, "avg_time_hours": 2},
            {"name": "Contato", "count": 100, "conversion_to_next": 0.80, "avg_time_hours": 24},
            {"name": "Qualificado", "count": 80, "conversion_to_next": 0.625, "avg_time_hours": 48},
            {"name": "Proposta", "count": 50, "conversion_to_next": 0.80, "avg_time_hours": 72},
            {"name": "Fechado", "count": 40, "conversion_to_next": 1.0, "avg_time_hours": 0},
        ]
        
        # Identifica gargalo (menor conversão)
        bottleneck = min(stages[:-1], key=lambda x: x["conversion_to_next"])
        
        return {
            "total_leads": 120,
            "stages": stages,
            "bottleneck": {
                "stage": bottleneck["name"],
                "conversion_rate": bottleneck["conversion_to_next"],
                "recommendation": f"Focar em melhorar conversão do estágio {bottleneck['name']}",
            },
            "conversion_rate": 0.33,  # 40/120
            "avg_time_per_stage": {s["name"]: s["avg_time_hours"] for s in stages},
            "conversion_by_channel": {
                "whatsapp": 0.38,
                "instagram": 0.25,
                "site": 0.30,
            },
            "trends": {
                "leads_trend": "growing",
                "conversion_trend": "stable",
            },
            "recommendations": [
                f"Gargalo identificado em '{bottleneck['name']}' com {bottleneck['conversion_to_next']*100:.0f}% de conversão",
                "Leads de WhatsApp convertem 52% mais que Instagram",
                "Tempo médio em 'Proposta' está 20% acima do benchmark",
            ],
        }
    
    async def analyze_support_metrics(self, period: str = "30d") -> Dict[str, Any]:
        """Analisa métricas de suporte/atendimento."""
        days = self._parse_period(period)
        
        return {
            "total_tickets": 230,
            "avg_response_time": 25,
            "avg_resolution_time": 4.5,
            "fcr_rate": 0.72,
            "satisfaction_score": 4.2,
            "by_channel": {
                "whatsapp": {"count": 150, "avg_response": 15},
                "instagram": {"count": 60, "avg_response": 35},
                "email": {"count": 20, "avg_response": 120},
            },
            "busiest_hours": [9, 10, 11, 14, 15],
            "agent_performance": [
                {"agent": "SDR Agent", "tickets": 180, "avg_response": 2, "satisfaction": 4.5},
                {"agent": "Manual", "tickets": 50, "avg_response": 45, "satisfaction": 3.8},
            ],
            "sla_compliance": 0.85,
            "recommendations": [
                "Tempo de resposta em Instagram 133% maior que WhatsApp",
                "Horários de pico: 9h-11h e 14h-15h",
                "SDR Agent resolve 78% dos tickets com satisfação alta",
            ],
        }
    
    async def analyze_marketing_performance(self, period: str = "30d") -> Dict[str, Any]:
        """Analisa performance de marketing e ads."""
        days = self._parse_period(period)
        
        campaigns = [
            {"id": "1", "name": "Retargeting Quente", "spend": 5000, "leads": 120, "roas": 4.5, "status": "active"},
            {"id": "2", "name": "Lookalike", "spend": 4000, "leads": 80, "roas": 3.2, "status": "active"},
            {"id": "3", "name": "Tráfego Frio", "spend": 3000, "leads": 50, "roas": 0.8, "status": "active"},
            {"id": "4", "name": "Stories", "spend": 3000, "leads": 30, "roas": 2.1, "status": "paused"},
        ]
        
        total_spend = sum(c["spend"] for c in campaigns)
        total_leads = sum(c["leads"] for c in campaigns)
        
        return {
            "total_spend": total_spend,
            "total_leads": total_leads,
            "cpl": total_spend / total_leads if total_leads > 0 else 0,
            "cac": 350,
            "roas": 3.2,
            "ltv": 4500,
            "campaigns": campaigns,
            "best_performing": campaigns[0],
            "worst_performing": campaigns[2],
            "channel_performance": {
                "facebook": {"spend": 8000, "leads": 150, "roas": 3.8},
                "instagram": {"spend": 5000, "leads": 100, "roas": 2.8},
                "google": {"spend": 2000, "leads": 30, "roas": 2.0},
            },
            "attribution": {
                "first_touch": {"whatsapp": 0.4, "instagram": 0.3, "site": 0.2, "outros": 0.1},
                "last_touch": {"whatsapp": 0.5, "instagram": 0.25, "site": 0.15, "outros": 0.1},
            },
            "recommendations": [
                "Campanha 'Tráfego Frio' com ROAS 0.8x - considerar pausar",
                "'Retargeting Quente' é 462% mais eficiente que 'Tráfego Frio'",
                "Facebook tem melhor ROAS (3.8x) - considerar realocar budget",
            ],
        }
    
    async def analyze_financial_metrics(self, period: str = "30d") -> Dict[str, Any]:
        """Analisa métricas financeiras."""
        days = self._parse_period(period)
        
        return {
            "revenue": 150000,
            "revenue_growth": 0.15,
            "deals_closed": 40,
            "avg_deal_size": 3750,
            "ai_cost": 850,
            "roi_on_ai": 15.2,
            "by_channel": {
                "whatsapp": 75000,
                "instagram": 45000,
                "site": 30000,
            },
            "by_product": {
                "Produto A": 80000,
                "Produto B": 50000,
                "Serviço C": 20000,
            },
            "forecast": {
                "next_month": 172500,
                "confidence": 0.82,
            },
            "recommendations": [
                "ROI de 15.2x no investimento em IA",
                "WhatsApp representa 50% da receita",
                "Ticket médio cresceu 12% vs mês anterior",
            ],
        }
    
    async def get_executive_summary(self, period: str = "30d") -> Dict[str, Any]:
        """Gera resumo executivo com principais KPIs."""
        days = self._parse_period(period)
        
        # Coleta dados de todas as áreas
        tasks = [
            self.collect_sales_metrics(),
            self.collect_marketing_metrics(),
            self.collect_financial_metrics(),
            self.collect_ai_metrics(),
        ]
        
        results = await asyncio.gather(*tasks)
        sales, marketing, financial, ai = results
        
        return {
            "revenue": {
                "current": financial.get("revenue", 0),
                "previous": financial.get("revenue", 0) / (1 + financial.get("revenue_growth", 0)),
                "growth": financial.get("revenue_growth", 0),
            },
            "leads": {
                "total": sales.get("total_leads", 0),
                "converted": sales.get("leads_by_stage", {}).get("fechado", 0),
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
                "best_campaign": marketing.get("best_channel", ""),
            },
            "highlights": [
                f"Receita cresceu {financial.get('revenue_growth', 0)*100:.0f}% vs período anterior",
                f"ROI de {financial.get('roi_on_ai', 0):.1f}x no investimento em IA",
                f"SDR Agent com {ai.get('sdr_accuracy', 0)*100:.0f}% de precisão",
            ],
            "alerts": self._generate_alerts(sales, marketing, financial),
            "top_channel": "whatsapp",
            "predictions": {
                "next_month_revenue": 175000,
                "leads_needed": 520,
            },
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
        
        if marketing.get("roas", 0) < 1.0:
            alerts.append({
                "type": "critical",
                "message": "ROAS abaixo de 1.0 - campanhas estão dando prejuízo",
                "severity": "critical",
            })
        
        return alerts
    
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
        """
        Gera insights a partir dos dados coletados.
        
        Combina métricas atuais, predições e anomalias para
        gerar insights acionáveis.
        """
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
            if data.get("roas", 1) < 1.0:
                insights.append({
                    "type": "warning",
                    "category": "marketing",
                    "title": "ROAS crítico",
                    "content": f"ROAS de {data.get('roas', 0):.2f}x está abaixo do mínimo",
                    "confidence": 0.95,
                    "priority": "critical",
                })
        
        return insights

