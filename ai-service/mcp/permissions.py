"""
Sistema de Permissões MCP.

Controla quais ferramentas cada tipo de agente pode usar,
com suporte a aprovação para operações perigosas.
"""
from typing import Dict, List, Set, Optional, Any
from dataclasses import dataclass
import structlog

from app.config import get_settings

logger = structlog.get_logger()
settings = get_settings()


@dataclass
class PermissionResult:
    """Resultado da verificação de permissão."""
    allowed: bool
    reason: Optional[str] = None
    requires_approval: bool = False
    approval_id: Optional[str] = None


class MCPPermissions:
    """
    Controla quais ferramentas cada agente/tenant pode usar.
    
    Níveis de permissão:
    1. Agente: Define quais ferramentas cada tipo de agente pode acessar
    2. Tenant: Permite customização por tenant
    3. Operação perigosa: Requer aprovação humana
    """
    
    # Ferramentas permitidas por tipo de agente
    AGENT_PERMISSIONS = {
        'sdr': [
            # Lead Tools
            'predict_lead_score',
            'get_lead_context',
            'get_lead_memory',
            'update_lead_memory',
            'search_similar_leads',
            'move_lead_stage',
            'classify_intent',
            'detect_objection',
            'get_response_suggestion',
            'get_conversation_summary',
            'escalate_to_human',
            
            # Action Tools
            'select_sdr_action',
            'send_message',
            'schedule_meeting',
            
            # Knowledge Tools
            'search_knowledge',
            'get_best_practices',
            'get_rules',
            
            # Memory Tools
            'get_short_term_memory',
            'get_long_term_memory',
            'store_insight',
            
            # RL Tools
            'record_sdr_experience',
            'get_rl_status',
            'explain_action',
            
            # Product Tools
            'get_product_info',
            'check_availability',
            'calculate_discount',
        ],
        
        'ads': [
            # Campaign Tools
            'predict_campaign_performance',
            'select_ads_action',
            'create_campaign',
            'create_adset',
            'create_ad',
            'optimize_campaign',
            'pause_campaign',
            'scale_campaign',
            'get_campaign_insights',
            'get_best_performing',
            
            # Creative Tools
            'generate_ad_copy',
            'validate_creative',
            'get_audience_suggestions',
            
            # Knowledge Tools
            'search_knowledge',
            'get_best_practices',
            'get_brand_guidelines',
            'get_rules',
            'get_patterns',
            
            # Budget Tools
            'get_budget_recommendation',
            'forecast_spend',
            
            # RL Tools
            'record_ads_experience',
            'get_rl_status',
            'explain_action',
            
            # Analytics Tools
            'get_competitor_insights',
        ],
        
        'admin': [
            # Admin tem acesso a tudo
            '*',
        ],

        'support': [
            # === SDR Tools (para atendimento ao cliente via WhatsApp) ===
            # Lead Tools
            'predict_lead_score',
            'get_lead_context',
            'get_lead_memory',
            'update_lead_memory',
            'search_similar_leads',
            'move_lead_stage',
            'classify_intent',
            'detect_objection',
            'get_response_suggestion',
            'get_conversation_summary',
            'escalate_to_human',

            # Action Tools
            'select_sdr_action',
            'send_message',
            'schedule_meeting',

            # Knowledge Tools
            'search_knowledge',
            'get_best_practices',
            'get_rules',

            # Memory Tools
            'get_short_term_memory',
            'get_long_term_memory',
            'store_insight',

            # Product Tools
            'get_product_info',
            'check_availability',

            # === Support Tools (para resolver bugs e deploy) ===
            # Manual e Código
            'search_manual',
            'search_codebase',
            'read_file',
            'edit_file',           # Requer aprovação
            'create_file',         # Requer aprovação

            # SSH e Logs
            'ssh_execute',         # Requer aprovação
            'get_error_logs',

            # Git
            'git_status',
            'git_diff',
            'git_commit',          # Requer aprovação
            'git_push',            # Requer aprovação

            # Deploy e Testes
            'deploy_production',   # Requer aprovação
            'run_tests',

            # CRM
            'support_move_lead_stage',
        ],
    }
    
    # Ferramentas que são perigosas (podem gastar dinheiro ou causar danos)
    DANGEROUS_TOOLS = {
        'scale_campaign',       # Pode aumentar gastos significativamente
        'create_campaign',      # Começa a gastar dinheiro
        'delete_knowledge',     # Perde conhecimento
        'clear_experiences',    # Perde dados de RL
        'rollback_model',       # Pode degradar performance
        # Support Agent - Operações de código e infraestrutura
        'edit_file',            # Modifica código em produção
        'create_file',          # Cria arquivos
        'ssh_execute',          # Executa comandos no servidor
        'git_commit',           # Altera histórico do repositório
        'git_push',             # Envia alterações para produção
        'deploy_production',    # Deploy em produção
    }

    # Ferramentas que sempre requerem aprovação
    APPROVAL_REQUIRED_TOOLS = {
        'scale_campaign',
        'delete_knowledge',
        # Support Agent - Operações críticas
        'edit_file',
        'create_file',
        'ssh_execute',
        'git_commit',
        'git_push',
        'deploy_production',
    }
    
    # Limites de chamadas por minuto por ferramenta
    RATE_LIMITS = {
        'send_message': 30,       # Max 30 mensagens/minuto
        'create_campaign': 5,     # Max 5 campanhas/minuto
        'scale_campaign': 2,      # Max 2 escalas/minuto
    }
    
    def __init__(self):
        self._db_engine = None
        self._pending_approvals: Dict[str, dict] = {}
        self._call_counts: Dict[str, Dict[str, int]] = {}  # tenant -> tool -> count
    
    async def get_db_engine(self):
        """Lazy loading do engine do banco."""
        if self._db_engine is None:
            from sqlalchemy.ext.asyncio import create_async_engine
            db_url = settings.database_url
            if not db_url.startswith('postgresql+asyncpg://'):
                db_url = db_url.replace('postgresql://', 'postgresql+asyncpg://')
            self._db_engine = create_async_engine(db_url)
        return self._db_engine
    
    async def check_permission(
        self,
        agent_type: str,
        tool_name: str,
        tenant_id: str
    ) -> bool:
        """
        Verifica se um agente pode usar uma ferramenta.
        
        Args:
            agent_type: Tipo do agente (sdr, ads, admin)
            tool_name: Nome da ferramenta
            tenant_id: ID do tenant
        
        Returns:
            True se permitido, False caso contrário
        """
        result = await self.check_permission_detailed(agent_type, tool_name, tenant_id)
        return result.allowed
    
    async def check_permission_detailed(
        self,
        agent_type: str,
        tool_name: str,
        tenant_id: str
    ) -> PermissionResult:
        """
        Verifica permissão com detalhes.
        """
        # Admin tem acesso a tudo
        if agent_type == 'admin':
            return PermissionResult(allowed=True)
        
        # Verifica permissões do agente
        allowed_tools = self.AGENT_PERMISSIONS.get(agent_type, [])
        
        if '*' not in allowed_tools and tool_name not in allowed_tools:
            logger.warning("Permission denied",
                agent_type=agent_type,
                tool=tool_name,
                tenant_id=tenant_id
            )
            return PermissionResult(
                allowed=False,
                reason=f"Agent '{agent_type}' não tem permissão para usar '{tool_name}'"
            )
        
        # Verifica permissões customizadas do tenant
        tenant_permissions = await self._get_tenant_permissions(tenant_id)
        if tenant_permissions:
            if tool_name in tenant_permissions.get('blocked_tools', []):
                return PermissionResult(
                    allowed=False,
                    reason=f"Tool '{tool_name}' está bloqueada para este tenant"
                )
        
        # Verifica rate limit
        if not await self._check_rate_limit(tenant_id, tool_name):
            return PermissionResult(
                allowed=False,
                reason=f"Rate limit excedido para '{tool_name}'"
            )
        
        # Verifica se precisa aprovação
        if tool_name in self.APPROVAL_REQUIRED_TOOLS:
            return PermissionResult(
                allowed=True,
                requires_approval=True,
                reason=f"Tool '{tool_name}' requer aprovação"
            )
        
        # Aviso se ferramenta é perigosa
        if tool_name in self.DANGEROUS_TOOLS:
            logger.warning("Dangerous tool being used",
                tool=tool_name,
                agent_type=agent_type,
                tenant_id=tenant_id
            )
        
        return PermissionResult(allowed=True)
    
    async def _get_tenant_permissions(self, tenant_id: str) -> Optional[Dict[str, Any]]:
        """Busca permissões customizadas do tenant."""
        try:
            engine = await self.get_db_engine()
            
            async with engine.connect() as conn:
                from sqlalchemy import text
                import json
                
                result = await conn.execute(text("""
                    SELECT metadata FROM tenants WHERE id = :tenant_id
                """), {'tenant_id': tenant_id})
                
                row = result.fetchone()
                
                if row and row.metadata:
                    metadata = json.loads(row.metadata) if isinstance(row.metadata, str) else row.metadata
                    return metadata.get('mcp_permissions', {})
            
            return None
            
        except Exception as e:
            logger.error("Error getting tenant permissions", error=str(e))
            return None
    
    async def _check_rate_limit(self, tenant_id: str, tool_name: str) -> bool:
        """Verifica rate limit para uma ferramenta."""
        if tool_name not in self.RATE_LIMITS:
            return True
        
        limit = self.RATE_LIMITS[tool_name]
        
        # Inicializa contador se necessário
        if tenant_id not in self._call_counts:
            self._call_counts[tenant_id] = {}
        
        if tool_name not in self._call_counts[tenant_id]:
            self._call_counts[tenant_id][tool_name] = 0
        
        # Verifica limite
        if self._call_counts[tenant_id][tool_name] >= limit:
            return False
        
        # Incrementa contador
        self._call_counts[tenant_id][tool_name] += 1
        
        return True
    
    def reset_rate_limits(self, tenant_id: str = None) -> None:
        """Reseta contadores de rate limit."""
        if tenant_id:
            self._call_counts.pop(tenant_id, None)
        else:
            self._call_counts.clear()
    
    async def request_approval(
        self,
        tool_name: str,
        tenant_id: str,
        agent_type: str,
        arguments: Dict[str, Any]
    ) -> str:
        """
        Solicita aprovação para uma ferramenta perigosa.
        
        Returns:
            ID da solicitação de aprovação
        """
        import uuid
        
        approval_id = str(uuid.uuid4())
        
        self._pending_approvals[approval_id] = {
            'tool_name': tool_name,
            'tenant_id': tenant_id,
            'agent_type': agent_type,
            'arguments': arguments,
            'status': 'pending',
            'created_at': str(datetime.utcnow()),
        }
        
        logger.info("Approval requested",
            approval_id=approval_id,
            tool=tool_name,
            tenant_id=tenant_id
        )
        
        return approval_id
    
    async def check_approval(self, approval_id: str) -> Optional[Dict[str, Any]]:
        """Verifica status de uma aprovação."""
        return self._pending_approvals.get(approval_id)
    
    async def approve(self, approval_id: str, approved_by: str) -> bool:
        """Aprova uma solicitação."""
        if approval_id not in self._pending_approvals:
            return False
        
        self._pending_approvals[approval_id]['status'] = 'approved'
        self._pending_approvals[approval_id]['approved_by'] = approved_by
        self._pending_approvals[approval_id]['approved_at'] = str(datetime.utcnow())
        
        logger.info("Approval granted",
            approval_id=approval_id,
            approved_by=approved_by
        )
        
        return True
    
    async def reject(self, approval_id: str, rejected_by: str, reason: str) -> bool:
        """Rejeita uma solicitação."""
        if approval_id not in self._pending_approvals:
            return False
        
        self._pending_approvals[approval_id]['status'] = 'rejected'
        self._pending_approvals[approval_id]['rejected_by'] = rejected_by
        self._pending_approvals[approval_id]['rejected_reason'] = reason
        self._pending_approvals[approval_id]['rejected_at'] = str(datetime.utcnow())
        
        logger.info("Approval rejected",
            approval_id=approval_id,
            rejected_by=rejected_by,
            reason=reason
        )
        
        return True
    
    def get_agent_tools(self, agent_type: str) -> List[str]:
        """Retorna lista de ferramentas permitidas para um agente."""
        tools = self.AGENT_PERMISSIONS.get(agent_type, [])
        if '*' in tools:
            # Retorna todas as ferramentas
            all_tools = set()
            for tool_list in self.AGENT_PERMISSIONS.values():
                if '*' not in tool_list:
                    all_tools.update(tool_list)
            return list(all_tools)
        return tools


# Import datetime para uso nas funções
from datetime import datetime

# Singleton
_permissions: Optional[MCPPermissions] = None


def get_mcp_permissions() -> MCPPermissions:
    """Retorna instância singleton das permissões."""
    global _permissions
    
    if _permissions is None:
        _permissions = MCPPermissions()
    
    return _permissions

