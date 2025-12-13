"""
Agent Orchestrator - Coordenador de Agentes
============================================

Responsável por coordenar ações entre SDR Agent, Ads Agent e outros.
Persiste ações sugeridas no banco via API Laravel.
"""

import logging
import os
import httpx
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
import uuid

logger = logging.getLogger(__name__)

# Configuração da API Laravel
LARAVEL_URL = os.getenv("LARAVEL_API_URL", "http://nginx")
INTERNAL_KEY = os.getenv("LARAVEL_INTERNAL_KEY", "")


class AgentOrchestrator:
    """
    Coordenador de ações entre agentes.
    
    Responsabilidades:
    - Criar sugestões de ações (persistidas no banco)
    - Gerenciar fila de aprovação
    - Executar ações aprovadas
    - Comunicar com outros agentes
    """
    
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        self._headers = {
            "X-Internal-Key": INTERNAL_KEY,
            "X-Tenant-ID": tenant_id,
            "Content-Type": "application/json",
        }
    
    async def _call_api(
        self, 
        endpoint: str, 
        method: str = "GET",
        data: Optional[Dict] = None,
        params: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Chama endpoint interno da API Laravel."""
        url = f"{LARAVEL_URL}/api/internal/bi/{endpoint}"
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                if method == "POST":
                    response = await client.post(url, headers=self._headers, json=data or {})
                else:
                    response = await client.get(url, headers=self._headers, params=params or {})
                
                if response.status_code in [200, 201]:
                    return response.json()
                else:
                    logger.error(f"[Orchestrator] Erro na API {endpoint}: {response.status_code} - {response.text}")
                    return {"error": f"API error: {response.status_code}"}
                    
        except Exception as e:
            logger.error(f"[Orchestrator] Erro ao chamar {endpoint}: {e}")
            return {"error": str(e)}
    
    async def suggest_sdr_improvement(
        self,
        insight_type: str,
        details: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Sugere melhoria para o SDR Agent.
        
        Tipos de melhoria:
        - script: Alteração no script de conversa
        - timing: Ajuste de horários
        - qualification: Critérios de qualificação
        - escalation: Regras de escalonamento
        """
        action_types = {
            "script": "update_sdr_script",
            "timing": "adjust_sdr_timing",
            "qualification": "update_qualification_rules",
            "escalation": "update_escalation_rules",
        }
        
        action_type = action_types.get(insight_type, "generic_sdr_improvement")
        
        action = await self.create_action(
            target_agent="sdr",
            action_type=action_type,
            title=f"Melhoria de {insight_type} no SDR",
            description=details.get("suggested_change", ""),
            rationale=details.get("reason", ""),
            payload={
                "insight_type": insight_type,
                **details,
            },
            priority=self._determine_priority(details),
            expected_impact={
                "metric": "conversion_rate" if insight_type == "qualification" else "response_time",
                "expected_change": "+10-15%",
            },
        )
        
        return action
    
    async def suggest_ads_optimization(
        self,
        campaign_id: Optional[str],
        optimization_type: str,
        details: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Sugere otimização para o Ads Agent.
        
        Tipos de otimização:
        - pause: Pausar campanha
        - scale: Escalar campanha
        - budget: Ajustar orçamento
        - targeting: Ajustar segmentação
        - creative: Atualizar criativos
        """
        action_types = {
            "pause": "pause_campaign",
            "scale": "scale_campaign",
            "budget": "adjust_budget",
            "targeting": "update_targeting",
            "creative": "update_creatives",
        }
        
        action_type = action_types.get(optimization_type, "generic_ads_optimization")
        
        # Determina prioridade baseada no tipo
        priority = "high" if optimization_type in ["pause", "scale"] else "medium"
        if details.get("roas", 1) < 0.5:
            priority = "critical"
        
        title = f"Otimização de {optimization_type}"
        if campaign_id:
            title += f" - Campanha {campaign_id[:8]}"
        
        action = await self.create_action(
            target_agent="ads",
            action_type=action_type,
            title=title,
            description=details.get("suggested_change", ""),
            rationale=details.get("reason", ""),
            payload={
                "campaign_id": campaign_id,
                "optimization_type": optimization_type,
                **details,
            },
            priority=priority,
            expected_impact={
                "metric": "roas",
                "expected_change": details.get("expected_impact", "+20%"),
            },
        )
        
        return action
    
    async def create_action(
        self,
        target_agent: str,
        action_type: str,
        title: str,
        description: str,
        rationale: str,
        payload: Dict[str, Any],
        priority: str = "medium",
        expected_impact: Optional[Dict] = None,
        expires_in_hours: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Cria uma ação na fila de aprovação.
        Persiste no banco via API Laravel.
        """
        expires_at = None
        if expires_in_hours:
            expires_at = (datetime.now() + timedelta(hours=expires_in_hours)).isoformat()
        
        # Prepara dados para API
        action_data = {
            "target_agent": target_agent,
            "action_type": action_type,
            "title": title,
            "description": description,
            "rationale": rationale,
            "payload": payload,
            "priority": priority,
            "expected_impact": expected_impact,
            "expires_at": expires_at,
        }
        
        # Chama API para persistir
        result = await self._call_api("actions", method="POST", data=action_data)
        
        if "error" in result:
            logger.error(f"[Orchestrator] Erro ao criar ação: {result.get('error')}")
            # Retorna ação local mesmo sem persistir
            return {
                "action_id": str(uuid.uuid4()),
                "action_type": action_type,
                "expected_impact": expected_impact,
                "created_at": datetime.now().isoformat(),
                "persisted": False,
                "error": result.get("error"),
            }
        
        logger.info(f"[Orchestrator] Ação criada e persistida: {result.get('action_id')} - {title}")
        
        # Notifica admin se prioridade alta
        if priority in ["high", "critical"]:
            await self._notify_admin({
                "id": result.get("action_id"),
                "title": title,
                "priority": priority,
            })
        
        return {
            "action_id": result.get("action_id"),
            "action_type": action_type,
            "expected_impact": expected_impact,
            "created_at": datetime.now().isoformat(),
            "persisted": True,
        }
    
    async def get_pending_actions(
        self,
        target_agent: Optional[str] = None,
        priority: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Lista ações pendentes de aprovação.
        """
        # TODO: Adicionar endpoint para listar ações pendentes
        # Por enquanto retorna estrutura vazia
        return {
            "actions": [],
            "by_priority": {},
        }
    
    async def execute_action(self, action_id: str) -> Dict[str, Any]:
        """
        Executa uma ação que foi aprovada.
        
        Delega para o agente apropriado baseado no target_agent.
        """
        # TODO: Implementar busca da ação no banco e delegação
        logger.info(f"[Orchestrator] Tentativa de executar ação: {action_id}")
        
        return {
            "status": "not_implemented",
            "message": "Execução de ações será implementada em breve",
        }
    
    async def _delegate_to_agent(self, action: Dict) -> Dict[str, Any]:
        """
        Delega execução para o agente apropriado.
        """
        target = action["target_agent"]
        action_type = action["action_type"]
        payload = action["payload"]
        
        if target == "sdr":
            return await self._execute_sdr_action(action_type, payload)
        elif target == "ads":
            return await self._execute_ads_action(action_type, payload)
        elif target == "knowledge":
            return await self._execute_knowledge_action(action_type, payload)
        elif target == "ml":
            return await self._execute_ml_action(action_type, payload)
        else:
            raise ValueError(f"Agente desconhecido: {target}")
    
    async def _execute_sdr_action(
        self,
        action_type: str,
        payload: Dict
    ) -> Dict[str, Any]:
        """Executa ação no SDR Agent."""
        logger.info(f"[Orchestrator] Executando ação SDR: {action_type}")
        return {"success": True, "agent": "sdr", "action_type": action_type}
    
    async def _execute_ads_action(
        self,
        action_type: str,
        payload: Dict
    ) -> Dict[str, Any]:
        """Executa ação no Ads Agent."""
        logger.info(f"[Orchestrator] Executando ação Ads: {action_type}")
        return {"success": True, "agent": "ads", "action_type": action_type}
    
    async def _execute_knowledge_action(
        self,
        action_type: str,
        payload: Dict
    ) -> Dict[str, Any]:
        """Executa ação de conhecimento (RAG)."""
        logger.info(f"[Orchestrator] Executando ação Knowledge: {action_type}")
        return {"success": True, "agent": "knowledge", "action_type": action_type}
    
    async def _execute_ml_action(
        self,
        action_type: str,
        payload: Dict
    ) -> Dict[str, Any]:
        """Executa ação de ML (retreino)."""
        logger.info(f"[Orchestrator] Executando ação ML: {action_type}")
        return {"success": True, "agent": "ml", "action_type": action_type}
    
    async def _notify_admin(self, action: Dict) -> None:
        """
        Notifica admin sobre ação de alta prioridade.
        TODO: Implementar notificação via WebSocket ou email.
        """
        logger.info(f"[Orchestrator] Notificando admin sobre ação de alta prioridade: {action.get('id')}")
        # TODO: Chamar endpoint de notificação ou broadcast WebSocket
    
    def _determine_priority(self, details: Dict) -> str:
        """Determina prioridade baseada nos detalhes."""
        if details.get("severity") == "critical":
            return "critical"
        elif details.get("impact", 0) > 0.2:  # Impacto > 20%
            return "high"
        elif details.get("impact", 0) > 0.1:
            return "medium"
        return "low"
    
    async def suggest_actions(self, insights: List[Dict]) -> List[Dict]:
        """
        Sugere ações baseadas nos insights gerados.
        """
        actions = []
        
        for insight in insights:
            if insight.get("priority") in ["high", "critical"]:
                try:
                    action = await self._create_action_from_insight(insight)
                    if action:
                        actions.append(action)
                except Exception as e:
                    logger.warning(f"[Orchestrator] Erro ao criar ação de insight: {e}")
        
        return actions
    
    async def _create_action_from_insight(self, insight: Dict) -> Optional[Dict]:
        """
        Cria ação a partir de um insight.
        """
        category = insight.get("category")
        insight_type = insight.get("type")
        
        if category == "sales":
            return await self.suggest_sdr_improvement(
                "qualification",
                {
                    "reason": insight.get("content"),
                    "suggested_change": "Revisar critérios de qualificação",
                }
            )
        elif category == "marketing":
            return await self.suggest_ads_optimization(
                None,
                "budget" if "roas" in insight.get("title", "").lower() else "targeting",
                {
                    "reason": insight.get("content"),
                    "suggested_change": "Otimizar campanhas",
                }
            )
        
        return None
