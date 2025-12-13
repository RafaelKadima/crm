"""
BI Agent Scheduler - Agendador de Análises
===========================================

Responsável por executar análises automáticas do BI Agent.
Usa APScheduler para agendamento.
"""

import logging
import os
import asyncio
import httpx
from datetime import datetime
from typing import List, Dict, Any, Optional
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from .agent import BIAgent

logger = logging.getLogger(__name__)

# Configuração
LARAVEL_URL = os.getenv("LARAVEL_API_URL", "http://nginx")
INTERNAL_KEY = os.getenv("LARAVEL_INTERNAL_KEY", "")
SCHEDULER_HOUR = int(os.getenv("BI_SCHEDULER_HOUR", "6"))  # Padrão: 6h da manhã
SCHEDULER_MINUTE = int(os.getenv("BI_SCHEDULER_MINUTE", "0"))


class BIScheduler:
    """
    Agendador do BI Agent.
    
    Executa análises automáticas para todas as contas configuradas.
    """
    
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self._running = False
        self._headers = {
            "X-Internal-Key": INTERNAL_KEY,
            "Content-Type": "application/json",
        }
    
    async def start(self):
        """Inicia o scheduler."""
        if self._running:
            logger.warning("[BIScheduler] Scheduler já está rodando")
            return
        
        # Agenda execução diária
        self.scheduler.add_job(
            self.run_scheduled_analysis,
            CronTrigger(hour=SCHEDULER_HOUR, minute=SCHEDULER_MINUTE),
            id="bi_daily_analysis",
            name="BI Agent Daily Analysis",
            replace_existing=True,
        )
        
        self.scheduler.start()
        self._running = True
        logger.info(f"[BIScheduler] Iniciado - Execução diária às {SCHEDULER_HOUR}:{SCHEDULER_MINUTE:02d}")
    
    async def stop(self):
        """Para o scheduler."""
        if self._running:
            self.scheduler.shutdown(wait=False)
            self._running = False
            logger.info("[BIScheduler] Parado")
    
    async def run_scheduled_analysis(self):
        """
        Executa análise agendada para todas as contas configuradas.
        """
        logger.info("[BIScheduler] Iniciando análise agendada")
        start_time = datetime.now()
        
        try:
            # Busca tenants e contas configuradas para monitoramento
            configs = await self._get_monitored_configs()
            
            if not configs:
                logger.info("[BIScheduler] Nenhuma conta configurada para monitoramento")
                return
            
            results = []
            for config in configs:
                tenant_id = config.get("tenant_id")
                ad_account_ids = config.get("ad_account_ids", [])
                
                try:
                    result = await self.run_analysis_for_tenant(
                        tenant_id=tenant_id,
                        ad_account_ids=ad_account_ids
                    )
                    results.append({
                        "tenant_id": tenant_id,
                        "success": True,
                        "result": result,
                    })
                except Exception as e:
                    logger.error(f"[BIScheduler] Erro no tenant {tenant_id}: {e}")
                    results.append({
                        "tenant_id": tenant_id,
                        "success": False,
                        "error": str(e),
                    })
            
            duration = (datetime.now() - start_time).total_seconds()
            logger.info(f"[BIScheduler] Análise concluída em {duration:.1f}s - {len(results)} tenants processados")
            
            return results
            
        except Exception as e:
            logger.error(f"[BIScheduler] Erro na análise agendada: {e}")
            raise
    
    async def run_analysis_for_tenant(
        self,
        tenant_id: str,
        ad_account_ids: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Executa análise para um tenant específico.
        
        Args:
            tenant_id: ID do tenant
            ad_account_ids: Lista de IDs de contas de anúncios (None = todas)
        """
        logger.info(f"[BIScheduler] Analisando tenant {tenant_id}")
        
        # Se não especificou contas, analisa todas do tenant
        if not ad_account_ids:
            ad_account_ids = await self._get_tenant_ad_accounts(tenant_id)
        
        all_results = {
            "tenant_id": tenant_id,
            "accounts_analyzed": [],
            "total_actions_suggested": 0,
            "total_insights": 0,
            "started_at": datetime.now().isoformat(),
        }
        
        # Primeiro, análise geral (sem conta específica)
        try:
            agent = BIAgent(tenant_id, use_cache=False)
            general_result = await agent.run_daily_cycle()
            
            all_results["general_analysis"] = {
                "status": general_result.get("status"),
                "insights": len(general_result.get("insights", [])),
                "actions": len(general_result.get("actions", [])),
            }
            all_results["total_insights"] += len(general_result.get("insights", []))
            all_results["total_actions_suggested"] += len(general_result.get("actions", []))
        except Exception as e:
            logger.warning(f"[BIScheduler] Erro na análise geral: {e}")
            all_results["general_analysis"] = {"error": str(e)}
        
        # Depois, análise por conta de anúncios
        for account_id in ad_account_ids:
            try:
                agent = BIAgent(tenant_id, ad_account_id=account_id, use_cache=False)
                result = await agent.run_daily_cycle()
                
                all_results["accounts_analyzed"].append({
                    "account_id": account_id,
                    "status": result.get("status"),
                    "insights": len(result.get("insights", [])),
                    "actions": len(result.get("actions", [])),
                })
                all_results["total_insights"] += len(result.get("insights", []))
                all_results["total_actions_suggested"] += len(result.get("actions", []))
                
            except Exception as e:
                logger.warning(f"[BIScheduler] Erro na conta {account_id}: {e}")
                all_results["accounts_analyzed"].append({
                    "account_id": account_id,
                    "error": str(e),
                })
        
        all_results["completed_at"] = datetime.now().isoformat()
        
        # Salva resultado da análise
        await self._save_analysis_result(tenant_id, all_results)
        
        return all_results
    
    async def run_manual_analysis(
        self,
        tenant_id: str,
        ad_account_ids: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Executa análise manual (sob demanda).
        
        Args:
            tenant_id: ID do tenant
            ad_account_ids: Lista de IDs de contas (None = todas configuradas)
        """
        logger.info(f"[BIScheduler] Análise manual solicitada para tenant {tenant_id}")
        
        return await self.run_analysis_for_tenant(tenant_id, ad_account_ids)
    
    async def _get_monitored_configs(self) -> List[Dict]:
        """
        Busca configurações de monitoramento do Laravel.
        """
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{LARAVEL_URL}/api/internal/bi/monitoring-configs",
                    headers=self._headers
                )
                
                if response.status_code == 200:
                    return response.json().get("configs", [])
                else:
                    logger.warning(f"[BIScheduler] Erro ao buscar configs: {response.status_code}")
                    return []
                    
        except Exception as e:
            logger.warning(f"[BIScheduler] Não foi possível buscar configs: {e}")
            return []
    
    async def _get_tenant_ad_accounts(self, tenant_id: str) -> List[str]:
        """
        Busca todas as contas de anúncios de um tenant.
        """
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{LARAVEL_URL}/api/internal/ads/accounts",
                    headers={**self._headers, "X-Tenant-ID": tenant_id}
                )
                
                if response.status_code == 200:
                    accounts = response.json().get("accounts", [])
                    return [acc.get("id") for acc in accounts if acc.get("id")]
                else:
                    return []
                    
        except Exception as e:
            logger.warning(f"[BIScheduler] Erro ao buscar contas: {e}")
            return []
    
    async def _save_analysis_result(self, tenant_id: str, result: Dict) -> None:
        """
        Salva resultado da análise no Laravel.
        """
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                await client.post(
                    f"{LARAVEL_URL}/api/internal/bi/analysis-results",
                    headers={**self._headers, "X-Tenant-ID": tenant_id},
                    json=result
                )
        except Exception as e:
            logger.warning(f"[BIScheduler] Erro ao salvar resultado: {e}")
    
    def get_next_run(self) -> Optional[datetime]:
        """Retorna próxima execução agendada."""
        job = self.scheduler.get_job("bi_daily_analysis")
        if job:
            return job.next_run_time
        return None
    
    def is_running(self) -> bool:
        """Retorna se o scheduler está rodando."""
        return self._running


# Instância global do scheduler
bi_scheduler = BIScheduler()

