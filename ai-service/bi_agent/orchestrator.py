"""
Agent Orchestrator - Coordenador de Agentes
============================================

Responsável por coordenar ações entre SDR Agent, Ads Agent e outros.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
import uuid

logger = logging.getLogger(__name__)


class AgentOrchestrator:
    """
    Coordenador de ações entre agentes.
    
    Responsabilidades:
    - Criar sugestões de ações
    - Gerenciar fila de aprovação
    - Executar ações aprovadas
    - Comunicar com outros agentes
    """
    
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        self._db = None  # Será injetado
    
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
        
        A ação fica pendente até ser aprovada ou rejeitada por um admin.
        """
        action_id = str(uuid.uuid4())
        created_at = datetime.now()
        expires_at = None
        if expires_in_hours:
            expires_at = created_at + timedelta(hours=expires_in_hours)
        
        action = {
            "id": action_id,
            "tenant_id": self.tenant_id,
            "target_agent": target_agent,
            "action_type": action_type,
            "title": title,
            "description": description,
            "rationale": rationale,
            "payload": payload,
            "priority": priority,
            "expected_impact": expected_impact,
            "status": "pending",
            "created_at": created_at.isoformat(),
            "expires_at": expires_at.isoformat() if expires_at else None,
        }
        
        # TODO: Salvar no banco de dados
        # await self._db.bi_suggested_actions.create(action)
        
        logger.info(f"[Orchestrator] Ação criada: {action_id} - {title}")
        
        # Notifica admin se prioridade alta
        if priority in ["high", "critical"]:
            await self._notify_admin(action)
        
        return {
            "action_id": action_id,
            "action_type": action_type,
            "expected_impact": expected_impact,
            "created_at": created_at.isoformat(),
        }
    
    async def get_pending_actions(
        self,
        target_agent: Optional[str] = None,
        priority: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Lista ações pendentes de aprovação.
        """
        # TODO: Implementar busca real no banco
        mock_actions = [
            {
                "id": "action_1",
                "target_agent": "ads",
                "action_type": "pause_campaign",
                "title": "Pausar campanha com ROAS baixo",
                "priority": "high",
                "created_at": datetime.now().isoformat(),
            },
            {
                "id": "action_2",
                "target_agent": "sdr",
                "action_type": "update_script",
                "title": "Atualizar script de qualificação",
                "priority": "medium",
                "created_at": datetime.now().isoformat(),
            },
        ]
        
        # Filtra
        if target_agent:
            mock_actions = [a for a in mock_actions if a["target_agent"] == target_agent]
        if priority:
            mock_actions = [a for a in mock_actions if a["priority"] == priority]
        
        # Conta por prioridade
        by_priority = {}
        for action in mock_actions:
            p = action["priority"]
            by_priority[p] = by_priority.get(p, 0) + 1
        
        return {
            "actions": mock_actions,
            "by_priority": by_priority,
        }
    
    async def execute_action(self, action_id: str) -> Dict[str, Any]:
        """
        Executa uma ação que foi aprovada.
        
        Delega para o agente apropriado baseado no target_agent.
        """
        # TODO: Buscar ação do banco
        # action = await self._db.bi_suggested_actions.find(action_id)
        
        # Mock
        action = {
            "id": action_id,
            "target_agent": "ads",
            "action_type": "pause_campaign",
            "payload": {"campaign_id": "camp_123"},
            "status": "approved",
        }
        
        if action["status"] != "approved":
            raise ValueError("Ação não está aprovada")
        
        try:
            result = await self._delegate_to_agent(action)
            
            # Atualiza status
            execution_result = {
                "status": "executed",
                "result": result,
                "executed_at": datetime.now().isoformat(),
            }
            
            logger.info(f"[Orchestrator] Ação executada: {action_id}")
            
            return execution_result
            
        except Exception as e:
            logger.error(f"[Orchestrator] Erro ao executar ação {action_id}: {e}")
            return {
                "status": "failed",
                "error": str(e),
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
        # TODO: Chamar MCP tools do SDR
        logger.info(f"[Orchestrator] Executando ação SDR: {action_type}")
        return {"success": True, "agent": "sdr"}
    
    async def _execute_ads_action(
        self,
        action_type: str,
        payload: Dict
    ) -> Dict[str, Any]:
        """Executa ação no Ads Agent."""
        # TODO: Chamar MCP tools do Ads
        logger.info(f"[Orchestrator] Executando ação Ads: {action_type}")
        return {"success": True, "agent": "ads"}
    
    async def _execute_knowledge_action(
        self,
        action_type: str,
        payload: Dict
    ) -> Dict[str, Any]:
        """Executa ação de conhecimento (RAG)."""
        # TODO: Chamar MCP tools de RAG
        logger.info(f"[Orchestrator] Executando ação Knowledge: {action_type}")
        return {"success": True, "agent": "knowledge"}
    
    async def _execute_ml_action(
        self,
        action_type: str,
        payload: Dict
    ) -> Dict[str, Any]:
        """Executa ação de ML (retreino)."""
        # TODO: Chamar MCP tools de ML
        logger.info(f"[Orchestrator] Executando ação ML: {action_type}")
        return {"success": True, "agent": "ml"}
    
    async def _notify_admin(self, action: Dict) -> None:
        """Notifica admin sobre ação de alta prioridade."""
        # TODO: Implementar notificação (email, push, etc)
        logger.info(f"[Orchestrator] Notificando admin sobre ação: {action['id']}")
    
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
                action = await self._create_action_from_insight(insight)
                if action:
                    actions.append(action)
        
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

