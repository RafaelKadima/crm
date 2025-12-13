"""
BI Agent Router - Endpoints para análises de BI
================================================

Endpoints para:
- Executar análise manual
- Ver status do scheduler
- Gerar relatórios
"""

import logging
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

from bi_agent.scheduler import bi_scheduler
from bi_agent.agent import BIAgent

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/bi", tags=["BI Agent"])


class ManualAnalysisRequest(BaseModel):
    """Request para análise manual."""
    ad_account_ids: Optional[List[str]] = None


class ManualAnalysisResponse(BaseModel):
    """Response da análise manual."""
    success: bool
    message: str
    result: Optional[dict] = None


@router.post("/run-analysis", response_model=ManualAnalysisResponse)
async def run_manual_analysis(
    request: ManualAnalysisRequest,
    x_tenant_id: str = Header(..., alias="X-Tenant-ID"),
    x_internal_key: str = Header(..., alias="X-Internal-Key")
):
    """
    Executa análise manual do BI Agent.
    
    Útil para gerar insights e ações urgentes.
    """
    try:
        logger.info(f"[BI Router] Análise manual solicitada - Tenant: {x_tenant_id}")
        
        result = await bi_scheduler.run_manual_analysis(
            tenant_id=x_tenant_id,
            ad_account_ids=request.ad_account_ids
        )
        
        return ManualAnalysisResponse(
            success=True,
            message=f"Análise concluída. {result.get('total_insights', 0)} insights e {result.get('total_actions_suggested', 0)} ações geradas.",
            result=result
        )
        
    except Exception as e:
        logger.error(f"[BI Router] Erro na análise manual: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/scheduler/status")
async def get_scheduler_status():
    """
    Retorna status do scheduler do BI Agent.
    """
    next_run = bi_scheduler.get_next_run()
    
    return {
        "running": bi_scheduler.is_running(),
        "next_run": next_run.isoformat() if next_run else None,
        "schedule": "Daily at 06:00",
    }


@router.post("/scheduler/trigger")
async def trigger_scheduled_analysis(
    x_internal_key: str = Header(..., alias="X-Internal-Key")
):
    """
    Dispara manualmente a análise agendada (para todos os tenants configurados).
    
    Útil para testes ou execução fora do horário.
    """
    try:
        results = await bi_scheduler.run_scheduled_analysis()
        
        return {
            "success": True,
            "message": f"Análise disparada para {len(results) if results else 0} tenants",
            "results": results,
        }
        
    except Exception as e:
        logger.error(f"[BI Router] Erro ao disparar análise: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-report")
async def generate_report(
    report_type: str = "executive_summary",
    period: str = "30d",
    formats: List[str] = ["pdf"],
    x_tenant_id: str = Header(..., alias="X-Tenant-ID"),
    x_internal_key: str = Header(..., alias="X-Internal-Key")
):
    """
    Gera relatório em PDF/Excel.
    
    Args:
        report_type: executive_summary, sales, marketing
        period: 7d, 30d, 90d
        formats: ["pdf"], ["excel"], ["pdf", "excel"]
    """
    try:
        agent = BIAgent(x_tenant_id)
        result = await agent.generate_report(report_type, period, formats)
        
        return {
            "success": result.get("success", False),
            "formats": result.get("formats", {}),
            "generated_at": result.get("generated_at"),
        }
        
    except Exception as e:
        logger.error(f"[BI Router] Erro ao gerar relatório: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dashboard")
async def get_bi_dashboard(
    x_tenant_id: str = Header(..., alias="X-Tenant-ID"),
    x_internal_key: str = Header(..., alias="X-Internal-Key")
):
    """
    Retorna dashboard de métricas do BI Agent.
    """
    try:
        agent = BIAgent(x_tenant_id)
        metrics = await agent.get_dashboard_metrics()
        
        return {
            "success": True,
            "metrics": metrics,
        }
        
    except Exception as e:
        logger.error(f"[BI Router] Erro ao buscar dashboard: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/compare-periods")
async def compare_periods(
    period1_days: int = 30,
    period2_days: int = 30,
    areas: Optional[List[str]] = None,
    x_tenant_id: str = Header(..., alias="X-Tenant-ID"),
    x_internal_key: str = Header(..., alias="X-Internal-Key")
):
    """
    Compara métricas entre dois períodos.
    """
    try:
        agent = BIAgent(x_tenant_id)
        comparison = await agent.compare_periods(period1_days, period2_days, areas)
        
        return {
            "success": True,
            "comparison": comparison,
        }
        
    except Exception as e:
        logger.error(f"[BI Router] Erro na comparação: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trends")
async def detect_trends(
    days: int = 90,
    x_tenant_id: str = Header(..., alias="X-Tenant-ID"),
    x_internal_key: str = Header(..., alias="X-Internal-Key")
):
    """
    Detecta tendências automaticamente.
    """
    try:
        agent = BIAgent(x_tenant_id)
        trends = await agent.detect_trends(days)
        
        return {
            "success": True,
            "trends": trends,
        }
        
    except Exception as e:
        logger.error(f"[BI Router] Erro ao detectar tendências: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/invalidate-cache")
async def invalidate_cache(
    x_tenant_id: str = Header(..., alias="X-Tenant-ID"),
    x_internal_key: str = Header(..., alias="X-Internal-Key")
):
    """
    Invalida cache do BI Agent para o tenant.
    """
    try:
        agent = BIAgent(x_tenant_id)
        result = await agent.invalidate_cache()
        
        return {
            "success": True,
            "keys_invalidated": result.get("keys_invalidated", 0),
        }
        
    except Exception as e:
        logger.error(f"[BI Router] Erro ao invalidar cache: {e}")
        raise HTTPException(status_code=500, detail=str(e))

