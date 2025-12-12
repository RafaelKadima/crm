"""
Report Generator - Gerador de Relatórios
=========================================

Responsável por gerar relatórios em diversos formatos.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
import io

logger = logging.getLogger(__name__)


class ReportGenerator:
    """
    Gerador de relatórios do BI Agent.
    
    Formatos suportados:
    - JSON (padrão)
    - PDF
    - Excel
    - API (dados formatados para integração)
    """
    
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        self._storage = None  # Será injetado
    
    async def generate_executive_report(
        self,
        period: str = "30d",
        format: str = "json"
    ) -> Dict[str, Any]:
        """
        Gera relatório executivo completo.
        """
        days = self._parse_period(period)
        
        # Coleta dados
        data = await self._collect_executive_data(days)
        
        report = {
            "type": "executive",
            "period": {
                "days": days,
                "start": (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d"),
                "end": datetime.now().strftime("%Y-%m-%d"),
            },
            "generated_at": datetime.now().isoformat(),
            "kpis": data.get("kpis", {}),
            "highlights": data.get("highlights", []),
            "alerts": data.get("alerts", []),
            "trends": data.get("trends", {}),
            "predictions": data.get("predictions", {}),
            "recommendations": data.get("recommendations", []),
        }
        
        if format == "pdf":
            return await self._generate_pdf(report, "executive")
        elif format == "excel":
            return await self._generate_excel(report, "executive")
        
        return report
    
    async def generate_sales_report(
        self,
        period: str = "30d",
        format: str = "json"
    ) -> Dict[str, Any]:
        """
        Gera relatório de vendas/funil.
        """
        days = self._parse_period(period)
        
        report = {
            "type": "sales",
            "period": {
                "days": days,
                "start": (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d"),
                "end": datetime.now().strftime("%Y-%m-%d"),
            },
            "generated_at": datetime.now().isoformat(),
            "summary": {
                "total_leads": 450,
                "converted": 89,
                "conversion_rate": 0.198,
                "total_value": 334125,
            },
            "funnel": {
                "stages": [
                    {"name": "Novo", "count": 450, "value": 0},
                    {"name": "Contato", "count": 380, "value": 0},
                    {"name": "Qualificado", "count": 250, "value": 0},
                    {"name": "Proposta", "count": 150, "value": 562500},
                    {"name": "Fechado", "count": 89, "value": 334125},
                ],
                "bottleneck": "Qualificado → Proposta",
            },
            "by_channel": {
                "whatsapp": {"leads": 250, "converted": 58, "rate": 0.232},
                "instagram": {"leads": 120, "converted": 18, "rate": 0.150},
                "site": {"leads": 80, "converted": 13, "rate": 0.163},
            },
            "by_seller": [
                {"name": "Ana", "leads": 150, "converted": 35, "value": 131250},
                {"name": "Bruno", "leads": 140, "converted": 28, "value": 105000},
                {"name": "Carla", "leads": 160, "converted": 26, "value": 97875},
            ],
            "trends": {
                "leads": "+12%",
                "conversion": "-3%",
                "ticket_medio": "+8%",
            },
        }
        
        if format == "pdf":
            return await self._generate_pdf(report, "sales")
        elif format == "excel":
            return await self._generate_excel(report, "sales")
        
        return report
    
    async def generate_marketing_report(
        self,
        period: str = "30d",
        format: str = "json"
    ) -> Dict[str, Any]:
        """
        Gera relatório de marketing/ads.
        """
        days = self._parse_period(period)
        
        report = {
            "type": "marketing",
            "period": {
                "days": days,
                "start": (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d"),
                "end": datetime.now().strftime("%Y-%m-%d"),
            },
            "generated_at": datetime.now().isoformat(),
            "summary": {
                "total_spend": 15000,
                "total_leads": 280,
                "cpl": 53.57,
                "cac": 168.54,
                "roas": 3.2,
            },
            "campaigns": [
                {
                    "name": "Retargeting Quente",
                    "spend": 5000,
                    "leads": 120,
                    "cpl": 41.67,
                    "roas": 4.5,
                    "status": "active",
                },
                {
                    "name": "Lookalike",
                    "spend": 4000,
                    "leads": 80,
                    "cpl": 50.00,
                    "roas": 3.2,
                    "status": "active",
                },
                {
                    "name": "Tráfego Frio",
                    "spend": 3000,
                    "leads": 50,
                    "cpl": 60.00,
                    "roas": 0.8,
                    "status": "active",
                },
            ],
            "by_platform": {
                "facebook": {"spend": 8000, "leads": 150, "roas": 3.8},
                "instagram": {"spend": 5000, "leads": 100, "roas": 2.8},
                "google": {"spend": 2000, "leads": 30, "roas": 2.0},
            },
            "recommendations": [
                "Pausar campanha 'Tráfego Frio' - ROAS negativo",
                "Aumentar budget de 'Retargeting Quente' em 20%",
                "Testar novos criativos em Instagram",
            ],
        }
        
        if format == "pdf":
            return await self._generate_pdf(report, "marketing")
        elif format == "excel":
            return await self._generate_excel(report, "marketing")
        
        return report
    
    async def generate_ai_performance_report(
        self,
        period: str = "30d"
    ) -> Dict[str, Any]:
        """
        Gera relatório de performance dos agentes IA.
        """
        days = self._parse_period(period)
        
        return {
            "type": "ai_performance",
            "period": {
                "days": days,
                "start": (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d"),
                "end": datetime.now().strftime("%Y-%m-%d"),
            },
            "generated_at": datetime.now().isoformat(),
            "sdr": {
                "total_decisions": 1250,
                "accuracy": 0.942,
                "overrides": 42,
                "override_rate": 0.034,
                "avg_response_time_ms": 850,
                "policy_mode": "bandit",
                "top_actions": [
                    {"action": "RESPOND_NORMAL", "count": 680, "success_rate": 0.95},
                    {"action": "QUALIFY", "count": 320, "success_rate": 0.88},
                    {"action": "SCHEDULE", "count": 180, "success_rate": 0.92},
                ],
            },
            "ads": {
                "total_decisions": 450,
                "accuracy": 0.875,
                "overrides": 28,
                "override_rate": 0.062,
                "campaigns_managed": 8,
                "budget_optimized": 15000,
                "roas_improvement": "+18%",
            },
            "bi": {
                "analyses_run": 30,
                "insights_generated": 85,
                "actions_suggested": 23,
                "actions_approved": 18,
                "actions_executed": 15,
                "knowledge_added": 45,
            },
            "overall_accuracy": 0.91,
            "total_decisions": 1700,
            "overrides": {
                "total": 70,
                "rate": 0.041,
                "top_reasons": [
                    {"reason": "Contexto específico", "count": 30},
                    {"reason": "Cliente VIP", "count": 20},
                    {"reason": "Erro de interpretação", "count": 20},
                ],
            },
            "learning_progress": {
                "sdr_mode": "bandit",
                "sdr_progress_to_dqn": 0.78,
                "ads_mode": "rule_based",
                "ads_progress_to_bandit": 0.45,
            },
        }
    
    async def export_pdf(
        self,
        report_type: str,
        period: str = "30d"
    ) -> Dict[str, Any]:
        """
        Exporta relatório em PDF.
        """
        # Gera o relatório
        if report_type == "executive":
            report = await self.generate_executive_report(period)
        elif report_type == "sales":
            report = await self.generate_sales_report(period)
        elif report_type == "marketing":
            report = await self.generate_marketing_report(period)
        else:
            raise ValueError(f"Tipo de relatório inválido: {report_type}")
        
        # Gera PDF
        return await self._generate_pdf(report, report_type)
    
    async def export_excel(
        self,
        data_type: str,
        period: str = "30d",
        filters: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Exporta dados em Excel.
        """
        days = self._parse_period(period)
        
        # Coleta dados
        if data_type == "leads":
            data = await self._get_leads_data(days, filters)
        elif data_type == "campaigns":
            data = await self._get_campaigns_data(days, filters)
        elif data_type == "tickets":
            data = await self._get_tickets_data(days, filters)
        else:
            raise ValueError(f"Tipo de dados inválido: {data_type}")
        
        # Gera Excel
        return await self._generate_excel_file(data, data_type)
    
    async def get_api_data(
        self,
        endpoint: str,
        params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Retorna dados formatados para API de integração.
        """
        period = params.get("period", "30d")
        
        if endpoint == "kpis":
            return await self._get_kpis_api_data(period)
        elif endpoint == "funnel":
            return await self._get_funnel_api_data(period)
        elif endpoint == "campaigns":
            return await self._get_campaigns_api_data(period)
        else:
            return {
                "error": f"Endpoint desconhecido: {endpoint}",
                "available": ["kpis", "funnel", "campaigns"],
            }
    
    async def _collect_executive_data(self, days: int) -> Dict[str, Any]:
        """Coleta dados para relatório executivo."""
        return {
            "kpis": {
                "revenue": {"current": 150000, "previous": 130000, "change": 0.154},
                "leads": {"total": 450, "converted": 89, "rate": 0.198},
                "ai_cost": {"current": 850, "roi": 15.2},
                "roas": {"current": 3.2, "target": 3.0},
            },
            "highlights": [
                "Receita cresceu 15.4% vs período anterior",
                "SDR Agent com 94.2% de precisão",
                "ROAS acima da meta (3.2x vs 3.0x)",
            ],
            "alerts": [
                {"type": "warning", "message": "Taxa de conversão caiu 3%"},
            ],
            "trends": {
                "revenue": "growing",
                "leads": "stable",
                "conversion": "declining",
            },
            "predictions": {
                "next_month_revenue": 172500,
                "confidence": 0.82,
            },
            "recommendations": [
                "Focar em melhorar conversão no estágio Qualificação",
                "Aumentar investimento em Retargeting",
            ],
        }
    
    async def _generate_pdf(
        self,
        report: Dict,
        report_type: str
    ) -> Dict[str, Any]:
        """Gera PDF do relatório."""
        # TODO: Implementar geração real de PDF com weasyprint
        filename = f"report_{report_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        
        logger.info(f"[ReportGenerator] PDF gerado: {filename}")
        
        return {
            "format": "pdf",
            "url": f"/reports/{self.tenant_id}/{filename}",
            "filename": filename,
            "size_kb": 250,
            "generated_at": datetime.now().isoformat(),
        }
    
    async def _generate_excel(
        self,
        report: Dict,
        report_type: str
    ) -> Dict[str, Any]:
        """Gera Excel do relatório."""
        # TODO: Implementar geração real de Excel com openpyxl
        filename = f"report_{report_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        
        logger.info(f"[ReportGenerator] Excel gerado: {filename}")
        
        return {
            "format": "excel",
            "url": f"/reports/{self.tenant_id}/{filename}",
            "filename": filename,
            "size_kb": 150,
            "generated_at": datetime.now().isoformat(),
        }
    
    async def _generate_excel_file(
        self,
        data: List[Dict],
        data_type: str
    ) -> Dict[str, Any]:
        """Gera arquivo Excel com dados."""
        filename = f"export_{data_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        
        return {
            "url": f"/exports/{self.tenant_id}/{filename}",
            "filename": filename,
            "rows": len(data),
            "size_kb": len(data) * 0.5,
            "generated_at": datetime.now().isoformat(),
        }
    
    async def _get_leads_data(
        self,
        days: int,
        filters: Optional[Dict]
    ) -> List[Dict]:
        """Obtém dados de leads para exportação."""
        # TODO: Implementar busca real
        return []
    
    async def _get_campaigns_data(
        self,
        days: int,
        filters: Optional[Dict]
    ) -> List[Dict]:
        """Obtém dados de campanhas para exportação."""
        # TODO: Implementar busca real
        return []
    
    async def _get_tickets_data(
        self,
        days: int,
        filters: Optional[Dict]
    ) -> List[Dict]:
        """Obtém dados de tickets para exportação."""
        # TODO: Implementar busca real
        return []
    
    async def _get_kpis_api_data(self, period: str) -> Dict[str, Any]:
        """Retorna KPIs para API."""
        return {
            "data": {
                "revenue": 150000,
                "leads": 450,
                "conversion_rate": 0.198,
                "roas": 3.2,
            },
            "generated_at": datetime.now().isoformat(),
            "cache_ttl": 300,
        }
    
    async def _get_funnel_api_data(self, period: str) -> Dict[str, Any]:
        """Retorna dados do funil para API."""
        return {
            "data": {
                "stages": [
                    {"name": "Novo", "count": 450},
                    {"name": "Contato", "count": 380},
                    {"name": "Qualificado", "count": 250},
                    {"name": "Proposta", "count": 150},
                    {"name": "Fechado", "count": 89},
                ],
            },
            "generated_at": datetime.now().isoformat(),
            "cache_ttl": 300,
        }
    
    async def _get_campaigns_api_data(self, period: str) -> Dict[str, Any]:
        """Retorna dados de campanhas para API."""
        return {
            "data": {
                "total_spend": 15000,
                "total_leads": 280,
                "roas": 3.2,
            },
            "generated_at": datetime.now().isoformat(),
            "cache_ttl": 300,
        }
    
    def _parse_period(self, period: str) -> int:
        """Converte string de período para dias."""
        if period.endswith("d"):
            return int(period[:-1])
        elif period.endswith("w"):
            return int(period[:-1]) * 7
        elif period.endswith("m"):
            return int(period[:-1]) * 30
        return 30

