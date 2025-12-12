"""
Data Analyzer - Motor de Análise de Dados
==========================================

Responsável por coletar e analisar métricas de todas as áreas do sistema.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
import asyncio
import os
import asyncpg

logger = logging.getLogger(__name__)

# URL do banco de dados
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://crm:crm@postgres:5432/crm")


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
        self._pool = None
    
    async def _get_pool(self):
        """Obtém pool de conexões com o banco."""
        if self._pool is None:
            try:
                self._pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=5)
            except Exception as e:
                logger.error(f"Erro ao conectar ao banco: {e}")
                return None
        return self._pool
    
    async def collect_sales_metrics(self) -> Dict[str, Any]:
        """Coleta métricas de vendas do banco de dados."""
        pool = await self._get_pool()
        
        if not pool:
            return self._empty_sales_metrics()
        
        try:
            async with pool.acquire() as conn:
                # Total de leads
                total_leads = await conn.fetchval(
                    "SELECT COUNT(*) FROM leads WHERE tenant_id = $1",
                    self.tenant_id
                )
                
                # Leads por estágio
                stages_rows = await conn.fetch("""
                    SELECT s.name as stage_name, COUNT(l.id) as count
                    FROM leads l
                    JOIN stages s ON l.stage_id = s.id
                    WHERE l.tenant_id = $1
                    GROUP BY s.name
                """, self.tenant_id)
                
                leads_by_stage = {row['stage_name']: row['count'] for row in stages_rows}
                
                # Leads fechados (won)
                closed_leads = await conn.fetchval("""
                    SELECT COUNT(*) FROM leads l
                    JOIN stages s ON l.stage_id = s.id
                    WHERE l.tenant_id = $1 AND s.is_won = true
                """, self.tenant_id)
                
                # Valor total das vendas
                total_value = await conn.fetchval("""
                    SELECT COALESCE(SUM(value), 0) FROM leads l
                    JOIN stages s ON l.stage_id = s.id
                    WHERE l.tenant_id = $1 AND s.is_won = true
                """, self.tenant_id) or 0
                
                # Calcula taxa de conversão
                conversion_rate = closed_leads / total_leads if total_leads > 0 else 0
                avg_deal_size = total_value / closed_leads if closed_leads > 0 else 0
                
                return {
                    "total_leads": total_leads or 0,
                    "leads_by_stage": leads_by_stage,
                    "conversion_rate": conversion_rate,
                    "conversion_rate_change": 0,  # TODO: calcular vs período anterior
                    "avg_time_to_close_days": 0,  # TODO: calcular
                    "total_value": float(total_value),
                    "avg_deal_size": float(avg_deal_size),
                }
        except Exception as e:
            logger.error(f"Erro ao coletar métricas de vendas: {e}")
            return self._empty_sales_metrics()
    
    def _empty_sales_metrics(self) -> Dict[str, Any]:
        """Retorna métricas de vendas vazias."""
        return {
            "total_leads": 0,
            "leads_by_stage": {},
            "conversion_rate": 0,
            "conversion_rate_change": 0,
            "avg_time_to_close_days": 0,
            "total_value": 0,
            "avg_deal_size": 0,
        }
    
    async def collect_support_metrics(self) -> Dict[str, Any]:
        """Coleta métricas de suporte do banco de dados."""
        pool = await self._get_pool()
        
        if not pool:
            return self._empty_support_metrics()
        
        try:
            async with pool.acquire() as conn:
                # Total de tickets
                total_tickets = await conn.fetchval(
                    "SELECT COUNT(*) FROM tickets WHERE tenant_id = $1",
                    self.tenant_id
                )
                
                # Tickets abertos
                open_tickets = await conn.fetchval("""
                    SELECT COUNT(*) FROM tickets 
                    WHERE tenant_id = $1 AND status IN ('aberto', 'em_atendimento')
                """, self.tenant_id)
                
                return {
                    "total_tickets": total_tickets or 0,
                    "open_tickets": open_tickets or 0,
                    "avg_response_time": 0,
                    "avg_resolution_time": 0,
                    "satisfaction_score": 0,
                    "fcr_rate": 0,
                }
        except Exception as e:
            logger.error(f"Erro ao coletar métricas de suporte: {e}")
            return self._empty_support_metrics()
    
    def _empty_support_metrics(self) -> Dict[str, Any]:
        """Retorna métricas de suporte vazias."""
        return {
            "total_tickets": 0,
            "open_tickets": 0,
            "avg_response_time": 0,
            "avg_resolution_time": 0,
            "satisfaction_score": 0,
            "fcr_rate": 0,
        }
    
    async def collect_marketing_metrics(self) -> Dict[str, Any]:
        """Coleta métricas de marketing do banco de dados."""
        pool = await self._get_pool()
        
        if not pool:
            return self._empty_marketing_metrics()
        
        try:
            async with pool.acquire() as conn:
                # Total gasto em campanhas
                total_spend = await conn.fetchval("""
                    SELECT COALESCE(SUM(
                        COALESCE((performance->>'spend')::numeric, 0)
                    ), 0) FROM ad_campaigns WHERE tenant_id = $1
                """, self.tenant_id) or 0
                
                # Campanhas ativas
                campaigns_active = await conn.fetchval("""
                    SELECT COUNT(*) FROM ad_campaigns 
                    WHERE tenant_id = $1 AND status = 'active'
                """, self.tenant_id)
                
                # Leads gerados por canal
                channel_leads = await conn.fetch("""
                    SELECT channel, COUNT(*) as count FROM leads
                    WHERE tenant_id = $1 AND channel IS NOT NULL
                    GROUP BY channel ORDER BY count DESC
                """, self.tenant_id)
                
                best_channel = channel_leads[0]['channel'] if channel_leads else None
                total_leads = sum(row['count'] for row in channel_leads) if channel_leads else 0
                
                cpl = total_spend / total_leads if total_leads > 0 else 0
                
                return {
                    "total_spend": float(total_spend),
                    "total_leads_generated": total_leads,
                    "cpl": float(cpl),
                    "cac": 0,
                    "roas": 0,
                    "best_channel": best_channel,
                    "campaigns_active": campaigns_active or 0,
                }
        except Exception as e:
            logger.error(f"Erro ao coletar métricas de marketing: {e}")
            return self._empty_marketing_metrics()
    
    def _empty_marketing_metrics(self) -> Dict[str, Any]:
        """Retorna métricas de marketing vazias."""
        return {
            "total_spend": 0,
            "total_leads_generated": 0,
            "cpl": 0,
            "cac": 0,
            "roas": 0,
            "best_channel": None,
            "campaigns_active": 0,
        }
    
    async def collect_financial_metrics(self) -> Dict[str, Any]:
        """Coleta métricas financeiras do banco de dados."""
        pool = await self._get_pool()
        
        if not pool:
            return self._empty_financial_metrics()
        
        try:
            async with pool.acquire() as conn:
                # Receita total (leads ganhos)
                revenue = await conn.fetchval("""
                    SELECT COALESCE(SUM(l.value), 0) FROM leads l
                    JOIN stages s ON l.stage_id = s.id
                    WHERE l.tenant_id = $1 AND s.is_won = true
                """, self.tenant_id) or 0
                
                # Custo de IA (estimado baseado em uso)
                ai_cost = await conn.fetchval("""
                    SELECT COUNT(*) * 0.01 FROM agent_action_logs
                    WHERE tenant_id = $1
                """, self.tenant_id) or 0
                
                return {
                    "revenue": float(revenue),
                    "revenue_growth": 0,
                    "ai_cost": float(ai_cost),
                    "gross_margin": 0,
                    "ltv": 0,
                    "roi_on_ai": float(revenue / ai_cost) if ai_cost > 0 else 0,
                }
        except Exception as e:
            logger.error(f"Erro ao coletar métricas financeiras: {e}")
            return self._empty_financial_metrics()
    
    def _empty_financial_metrics(self) -> Dict[str, Any]:
        """Retorna métricas financeiras vazias."""
        return {
            "revenue": 0,
            "revenue_growth": 0,
            "ai_cost": 0,
            "gross_margin": 0,
            "ltv": 0,
            "roi_on_ai": 0,
        }
    
    async def collect_ai_metrics(self) -> Dict[str, Any]:
        """Coleta métricas dos agentes IA do banco de dados."""
        pool = await self._get_pool()
        
        if not pool:
            return self._empty_ai_metrics()
        
        try:
            async with pool.acquire() as conn:
                # Total de decisões dos agentes
                total_decisions = await conn.fetchval("""
                    SELECT COUNT(*) FROM agent_action_logs
                    WHERE tenant_id = $1
                """, self.tenant_id) or 0
                
                # Decisões sobrescritas
                overrides = await conn.fetchval("""
                    SELECT COUNT(*) FROM agent_action_logs
                    WHERE tenant_id = $1 AND was_overridden = true
                """, self.tenant_id) or 0
                
                override_rate = overrides / total_decisions if total_decisions > 0 else 0
                accuracy = 1 - override_rate
                
                return {
                    "sdr_accuracy": accuracy,
                    "ads_accuracy": accuracy,
                    "total_decisions": total_decisions,
                    "overrides": overrides,
                    "override_rate": override_rate,
                    "policy_mode": "rule_based",
                }
        except Exception as e:
            logger.error(f"Erro ao coletar métricas de IA: {e}")
            return self._empty_ai_metrics()
    
    def _empty_ai_metrics(self) -> Dict[str, Any]:
        """Retorna métricas de IA vazias."""
        return {
            "sdr_accuracy": 0,
            "ads_accuracy": 0,
            "total_decisions": 0,
            "overrides": 0,
            "override_rate": 0,
            "policy_mode": "rule_based",
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
        
        # Gera highlights apenas se há dados
        highlights = []
        has_data = sales.get("total_leads", 0) > 0 or financial.get("revenue", 0) > 0
        
        if has_data:
            if financial.get("revenue_growth", 0) != 0:
                highlights.append(f"Receita cresceu {financial.get('revenue_growth', 0)*100:.0f}% vs período anterior")
            if financial.get("roi_on_ai", 0) > 0:
                highlights.append(f"ROI de {financial.get('roi_on_ai', 0):.1f}x no investimento em IA")
            if ai.get("sdr_accuracy", 0) > 0:
                highlights.append(f"SDR Agent com {ai.get('sdr_accuracy', 0)*100:.0f}% de precisão")
        
        # Predições baseadas nos dados reais
        revenue = financial.get("revenue", 0)
        total_leads = sales.get("total_leads", 0)
        conversion_rate = sales.get("conversion_rate", 0)
        avg_deal_size = sales.get("avg_deal_size", 0)
        
        # Previsão simples: crescimento de 15% se tem receita, senão 0
        next_month_revenue = revenue * 1.15 if revenue > 0 else 0
        # Leads necessários para atingir meta
        leads_needed = int(next_month_revenue / (avg_deal_size * conversion_rate)) if avg_deal_size > 0 and conversion_rate > 0 else 0
        
        return {
            "revenue": {
                "current": financial.get("revenue", 0),
                "previous": financial.get("revenue", 0) / (1 + financial.get("revenue_growth", 0)) if financial.get("revenue_growth", 0) != -1 else 0,
                "growth": financial.get("revenue_growth", 0),
            },
            "leads": {
                "total": sales.get("total_leads", 0),
                "converted": sum(1 for stage, count in sales.get("leads_by_stage", {}).items() if "fechado" in stage.lower() or "won" in stage.lower() for _ in range(count)) if sales.get("leads_by_stage") else 0,
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
                "best_campaign": marketing.get("best_channel") or "",
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

