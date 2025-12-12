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

# URL do banco de dados (asyncpg usa 'postgresql://' sem '+asyncpg')
_raw_db_url = os.getenv("DATABASE_URL", "postgresql://crm:crm@postgres:5432/crm")
DATABASE_URL = _raw_db_url.replace("postgresql+asyncpg://", "postgresql://")


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
        self.ad_account_id = ad_account_id  # Filtro opcional para conta de anúncios
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
                # Monta query com filtro opcional de ad_account_id
                if self.ad_account_id:
                    # Total gasto em campanhas (filtrado por conta)
                    total_spend = await conn.fetchval("""
                        SELECT COALESCE(SUM(
                            COALESCE((performance->>'spend')::numeric, 0)
                        ), 0) FROM ad_campaigns WHERE tenant_id = $1 AND ad_account_id = $2
                    """, self.tenant_id, self.ad_account_id) or 0
                    
                    # Campanhas ativas (filtrado por conta)
                    campaigns_active = await conn.fetchval("""
                        SELECT COUNT(*) FROM ad_campaigns 
                        WHERE tenant_id = $1 AND status = 'active' AND ad_account_id = $2
                    """, self.tenant_id, self.ad_account_id)
                else:
                    # Total gasto em campanhas (todas as contas)
                    total_spend = await conn.fetchval("""
                        SELECT COALESCE(SUM(
                            COALESCE((performance->>'spend')::numeric, 0)
                        ), 0) FROM ad_campaigns WHERE tenant_id = $1
                    """, self.tenant_id) or 0
                    
                    # Campanhas ativas (todas as contas)
                    campaigns_active = await conn.fetchval("""
                        SELECT COUNT(*) FROM ad_campaigns 
                        WHERE tenant_id = $1 AND status = 'active'
                    """, self.tenant_id)
                
                # Leads gerados por canal (não filtrado por conta de anúncios)
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
                    "filtered_by_account": self.ad_account_id is not None,
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
        Analisa funil de vendas completo com dados reais.
        """
        days = self._parse_period(period)
        pool = await self._get_pool()
        
        if not pool:
            return self._empty_funnel_analysis()
        
        try:
            async with pool.acquire() as conn:
                # Busca estágios com contagem de leads
                stages_query = """
                    SELECT s.name, s.order_position, COUNT(l.id) as count, s.is_won
                    FROM stages s
                    LEFT JOIN leads l ON l.stage_id = s.id AND l.tenant_id = $1
                    WHERE s.tenant_id = $1 OR s.tenant_id IS NULL
                    GROUP BY s.id, s.name, s.order_position, s.is_won
                    ORDER BY s.order_position
                """
                stages_rows = await conn.fetch(stages_query, self.tenant_id)
                
                if not stages_rows:
                    return self._empty_funnel_analysis()
                
                stages = []
                total_leads = 0
                won_leads = 0
                
                for i, row in enumerate(stages_rows):
                    count = row['count'] or 0
                    total_leads += count
                    if row['is_won']:
                        won_leads = count
                    
                    # Calcula conversão para próximo estágio
                    next_count = stages_rows[i + 1]['count'] if i + 1 < len(stages_rows) else count
                    conversion = next_count / count if count > 0 else 0
                    
                    stages.append({
                        "name": row['name'],
                        "count": count,
                        "conversion_to_next": min(conversion, 1.0),
                    })
                
                # Leads por canal
                channel_query = """
                    SELECT channel, COUNT(*) as count FROM leads
                    WHERE tenant_id = $1 AND channel IS NOT NULL
                    GROUP BY channel
                """
                channel_rows = await conn.fetch(channel_query, self.tenant_id)
                conversion_by_channel = {row['channel']: row['count'] for row in channel_rows}
                
                # Identifica gargalo (menor conversão)
                bottleneck = None
                if stages and len(stages) > 1:
                    non_final_stages = [s for s in stages[:-1] if s['count'] > 0]
                    if non_final_stages:
                        bottleneck = min(non_final_stages, key=lambda x: x["conversion_to_next"])
                
                conversion_rate = won_leads / total_leads if total_leads > 0 else 0
                
                recommendations = []
                if bottleneck and bottleneck['conversion_to_next'] < 0.5:
                    recommendations.append(f"Gargalo em '{bottleneck['name']}' com {bottleneck['conversion_to_next']*100:.0f}% de conversão")
                if total_leads == 0:
                    recommendations.append("Nenhum lead cadastrado ainda. Comece a captar leads!")
                
                return {
                    "total_leads": total_leads,
                    "stages": stages,
                    "bottleneck": {
                        "stage": bottleneck["name"] if bottleneck else None,
                        "conversion_rate": bottleneck["conversion_to_next"] if bottleneck else 0,
                        "recommendation": f"Focar em melhorar conversão do estágio {bottleneck['name']}" if bottleneck else None,
                    } if bottleneck else None,
                    "conversion_rate": conversion_rate,
                    "conversion_by_channel": conversion_by_channel,
                    "recommendations": recommendations,
                }
        except Exception as e:
            logger.error(f"Erro ao analisar funil: {e}")
            return self._empty_funnel_analysis()
    
    def _empty_funnel_analysis(self) -> Dict[str, Any]:
        return {
            "total_leads": 0,
            "stages": [],
            "bottleneck": None,
            "conversion_rate": 0,
            "conversion_by_channel": {},
            "recommendations": ["Sem dados suficientes para análise de funil."],
        }
    
    async def analyze_support_metrics(self, period: str = "30d") -> Dict[str, Any]:
        """Analisa métricas de suporte/atendimento com dados reais."""
        days = self._parse_period(period)
        pool = await self._get_pool()
        
        if not pool:
            return self._empty_support_analysis()
        
        try:
            async with pool.acquire() as conn:
                # Total de tickets
                total_tickets = await conn.fetchval(
                    "SELECT COUNT(*) FROM tickets WHERE tenant_id = $1",
                    self.tenant_id
                ) or 0
                
                # Tickets por status
                status_query = """
                    SELECT status, COUNT(*) as count FROM tickets
                    WHERE tenant_id = $1
                    GROUP BY status
                """
                status_rows = await conn.fetch(status_query, self.tenant_id)
                by_status = {row['status']: row['count'] for row in status_rows}
                
                # Tickets por canal
                channel_query = """
                    SELECT c.type as channel, COUNT(t.id) as count FROM tickets t
                    JOIN channels c ON t.channel_id = c.id
                    WHERE t.tenant_id = $1
                    GROUP BY c.type
                """
                channel_rows = await conn.fetch(channel_query, self.tenant_id)
                by_channel = {row['channel']: {"count": row['count']} for row in channel_rows}
                
                recommendations = []
                if total_tickets == 0:
                    recommendations.append("Nenhum ticket registrado ainda.")
                
                return {
                    "total_tickets": total_tickets,
                    "by_status": by_status,
                    "by_channel": by_channel,
                    "recommendations": recommendations,
                }
        except Exception as e:
            logger.error(f"Erro ao analisar suporte: {e}")
            return self._empty_support_analysis()
    
    def _empty_support_analysis(self) -> Dict[str, Any]:
        return {
            "total_tickets": 0,
            "by_status": {},
            "by_channel": {},
            "recommendations": ["Sem dados de suporte para análise."],
        }
    
    async def analyze_marketing_performance(self, period: str = "30d") -> Dict[str, Any]:
        """Analisa performance de marketing com dados reais."""
        days = self._parse_period(period)
        pool = await self._get_pool()
        
        if not pool:
            return self._empty_marketing_analysis()
        
        try:
            async with pool.acquire() as conn:
                # Monta query com filtro opcional de ad_account_id
                if self.ad_account_id:
                    campaigns_query = """
                        SELECT c.id, c.name, c.status, 
                               COALESCE((c.performance->>'spend')::numeric, 0) as spend,
                               COALESCE((c.performance->>'leads')::numeric, 0) as leads,
                               a.name as account_name
                        FROM ad_campaigns c
                        JOIN ad_accounts a ON c.ad_account_id = a.id
                        WHERE c.tenant_id = $1 AND c.ad_account_id = $2
                        ORDER BY c.created_at DESC
                        LIMIT 10
                    """
                    campaigns_rows = await conn.fetch(campaigns_query, self.tenant_id, self.ad_account_id)
                    
                    # Busca nome da conta selecionada
                    account_name = await conn.fetchval(
                        "SELECT name FROM ad_accounts WHERE id = $1",
                        self.ad_account_id
                    )
                else:
                    campaigns_query = """
                        SELECT c.id, c.name, c.status, 
                               COALESCE((c.performance->>'spend')::numeric, 0) as spend,
                               COALESCE((c.performance->>'leads')::numeric, 0) as leads,
                               a.name as account_name
                        FROM ad_campaigns c
                        LEFT JOIN ad_accounts a ON c.ad_account_id = a.id
                        WHERE c.tenant_id = $1
                        ORDER BY c.created_at DESC
                        LIMIT 10
                    """
                    campaigns_rows = await conn.fetch(campaigns_query, self.tenant_id)
                    account_name = None
                
                campaigns = [
                    {
                        "id": str(row['id']),
                        "name": row['name'],
                        "status": row['status'],
                        "spend": float(row['spend']),
                        "leads": int(row['leads']),
                        "account_name": row.get('account_name'),
                    }
                    for row in campaigns_rows
                ]
                
                total_spend = sum(c['spend'] for c in campaigns)
                total_leads = sum(c['leads'] for c in campaigns)
                cpl = total_spend / total_leads if total_leads > 0 else 0
                
                recommendations = []
                if not campaigns:
                    if self.ad_account_id:
                        recommendations.append(f"Nenhuma campanha encontrada para a conta selecionada.")
                    else:
                        recommendations.append("Nenhuma campanha cadastrada. Configure o Ads Intelligence.")
                elif total_spend == 0:
                    recommendations.append("Nenhum gasto registrado nas campanhas.")
                
                result = {
                    "total_spend": total_spend,
                    "total_leads": total_leads,
                    "cpl": cpl,
                    "campaigns_count": len(campaigns),
                    "campaigns": campaigns[:5],  # Top 5
                    "recommendations": recommendations,
                }
                
                # Adiciona info da conta filtrada se aplicável
                if self.ad_account_id:
                    result["filtered_account"] = {
                        "id": self.ad_account_id,
                        "name": account_name,
                    }
                
                return result
        except Exception as e:
            logger.error(f"Erro ao analisar marketing: {e}")
            return self._empty_marketing_analysis()
    
    def _empty_marketing_analysis(self) -> Dict[str, Any]:
        return {
            "total_spend": 0,
            "total_leads": 0,
            "cpl": 0,
            "campaigns_count": 0,
            "campaigns": [],
            "recommendations": ["Sem dados de marketing para análise."],
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

