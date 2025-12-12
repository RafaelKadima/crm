"""
RL Tools - Ferramentas de Reinforcement Learning.

Estas ferramentas permitem que os agentes usem políticas de RL
para tomar decisões e aprender com experiências.

Total: 10 ferramentas
"""
from typing import Dict, Any, List, Optional
from datetime import datetime
import structlog

from mcp.server import CRMMCPServer, ToolParameter

logger = structlog.get_logger()


def register_tools(server: CRMMCPServer) -> None:
    """Registra todas as ferramentas RL no servidor MCP."""
    
    # =====================================================
    # 1. select_action - Seleciona ação via PolicyEngine
    # =====================================================
    server.register_tool(
        name="select_action",
        description="Usa o PolicyEngine para selecionar a melhor ação baseada no estado atual.",
        parameters=[
            ToolParameter(name="agent_type", type="string", description="Tipo de agente (sdr, ads)"),
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="state", type="object", description="Estado atual"),
        ],
        handler=select_action,
        category="rl"
    )
    
    # =====================================================
    # 2. record_experience - Registra experiência
    # =====================================================
    server.register_tool(
        name="record_experience",
        description="Registra uma experiência (state, action, reward, next_state) no buffer.",
        parameters=[
            ToolParameter(name="agent_type", type="string", description="Tipo de agente (sdr, ads)"),
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="state", type="object", description="Estado antes da ação"),
            ToolParameter(name="action", type="string", description="Ação tomada"),
            ToolParameter(name="reward", type="number", description="Reward recebido"),
            ToolParameter(name="next_state", type="object", description="Estado após ação", required=False),
        ],
        handler=record_experience,
        category="rl"
    )
    
    # =====================================================
    # 3. add_reward - Adiciona reward a experiência
    # =====================================================
    server.register_tool(
        name="add_reward",
        description="Adiciona ou atualiza reward de uma experiência existente.",
        parameters=[
            ToolParameter(name="experience_id", type="string", description="ID da experiência"),
            ToolParameter(name="reward", type="number", description="Novo valor de reward"),
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
        ],
        handler=add_reward,
        category="rl"
    )
    
    # =====================================================
    # 4. get_rl_status - Status do RL
    # =====================================================
    server.register_tool(
        name="get_rl_status",
        description="Retorna status do sistema de RL: modo atual, experiências, métricas.",
        parameters=[
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="agent_type", type="string", description="Tipo de agente", required=False),
        ],
        handler=get_rl_status,
        category="rl"
    )
    
    # =====================================================
    # 5. get_action_stats - Estatísticas por ação
    # =====================================================
    server.register_tool(
        name="get_action_stats",
        description="Retorna estatísticas de performance por tipo de ação.",
        parameters=[
            ToolParameter(name="agent_type", type="string", description="Tipo de agente (sdr, ads)"),
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
        ],
        handler=get_action_stats,
        category="rl"
    )
    
    # =====================================================
    # 6. explain_action - Explica decisão
    # =====================================================
    server.register_tool(
        name="explain_action",
        description="Gera explicação humana para uma ação do agente.",
        parameters=[
            ToolParameter(name="agent_type", type="string", description="Tipo de agente (sdr, ads)"),
            ToolParameter(name="action", type="string", description="Ação a explicar"),
            ToolParameter(name="state", type="object", description="Estado que gerou a ação"),
        ],
        handler=explain_action,
        category="rl"
    )
    
    # =====================================================
    # 7. validate_action - Valida via SafetyGuard
    # =====================================================
    server.register_tool(
        name="validate_action",
        description="Valida se uma ação é permitida pelo SafetyGuard.",
        parameters=[
            ToolParameter(name="agent_type", type="string", description="Tipo de agente (sdr, ads)"),
            ToolParameter(name="action", type="string", description="Ação a validar"),
            ToolParameter(name="state", type="object", description="Estado atual"),
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
        ],
        handler=validate_action,
        category="rl"
    )
    
    # =====================================================
    # 8. get_policy_mode - Modo atual da política
    # =====================================================
    server.register_tool(
        name="get_policy_mode",
        description="Retorna o modo atual da política (RULE_BASED, BANDIT, DQN).",
        parameters=[
            ToolParameter(name="agent_type", type="string", description="Tipo de agente (sdr, ads)"),
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
        ],
        handler=get_policy_mode,
        category="rl"
    )
    
    # =====================================================
    # 9. get_experience_count - Conta experiências
    # =====================================================
    server.register_tool(
        name="get_experience_count",
        description="Retorna número de experiências no buffer.",
        parameters=[
            ToolParameter(name="agent_type", type="string", description="Tipo de agente (sdr, ads)"),
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
        ],
        handler=get_experience_count,
        category="rl"
    )
    
    # =====================================================
    # 10. clear_experiences - Limpa buffer
    # =====================================================
    server.register_tool(
        name="clear_experiences",
        description="Limpa o buffer de experiências (use com cuidado).",
        parameters=[
            ToolParameter(name="agent_type", type="string", description="Tipo de agente (sdr, ads)"),
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="confirm", type="boolean", description="Confirma a operação"),
        ],
        handler=clear_experiences,
        category="rl",
        dangerous=True
    )
    
    logger.info("RL tools registered", count=10)


# ==============================================
# Implementações das Ferramentas
# ==============================================

async def select_action(
    agent_type: str,
    tenant_id: str,
    state: Dict[str, Any]
) -> Dict[str, Any]:
    """Seleciona ação usando PolicyEngine."""
    try:
        from app.rl.policy_engine import PolicyEngine
        from app.rl.states import SDRState, AdsState
        from app.rl.mode_manager import RLModeManager
        
        policy = PolicyEngine()
        mode_manager = RLModeManager()
        
        # Obtém modo atual
        mode = await mode_manager.get_mode(agent_type, tenant_id)
        
        # Constrói objeto de estado
        if agent_type == 'sdr':
            state_obj = SDRState(
                lead_score=state.get("lead_score", 50),
                stage_index=state.get("stage_index", 0),
                intent=state.get("intent", 0),
                num_messages=state.get("num_messages", 0),
                time_since_last=state.get("time_since_last", 0),
                sentiment=state.get("sentiment", 0.5),
                has_objection=state.get("has_objection", False)
            )
        else:
            state_obj = AdsState(
                objective_index=state.get("objective_index", 0),
                budget_normalized=state.get("budget_normalized", 0.5),
                creative_type=state.get("creative_type", 0),
                current_roas=state.get("current_roas", 1.5),
                current_ctr=state.get("current_ctr", 1.0),
                days_running=state.get("days_running", 0)
            )
        
        # Seleciona ação
        action, confidence = await policy.select_action(state_obj, agent_type, tenant_id)
        
        return {
            "action": action.name,
            "action_value": action.value,
            "confidence": confidence,
            "policy_mode": str(mode),
            "agent_type": agent_type
        }
        
    except Exception as e:
        logger.error("Error selecting action", error=str(e))
        return {"error": str(e)}


async def record_experience(
    agent_type: str,
    tenant_id: str,
    state: Dict[str, Any],
    action: str,
    reward: float,
    next_state: Dict[str, Any] = None
) -> Dict[str, Any]:
    """Registra experiência no buffer."""
    try:
        from app.rl.experience_buffer import ExperienceBuffer
        
        buffer = ExperienceBuffer()
        
        experience_id = await buffer.add_experience(
            tenant_id=tenant_id,
            agent_type=agent_type,
            state=state,
            action=action,
            reward=reward,
            next_state=next_state,
            is_terminal=(next_state is None)
        )
        
        return {
            "success": True,
            "experience_id": experience_id,
            "agent_type": agent_type,
            "action": action,
            "reward": reward
        }
        
    except Exception as e:
        logger.error("Error recording experience", error=str(e))
        return {"success": False, "error": str(e)}


async def add_reward(
    experience_id: str,
    reward: float,
    tenant_id: str
) -> Dict[str, Any]:
    """Atualiza reward de uma experiência."""
    try:
        from sqlalchemy.ext.asyncio import create_async_engine
        from sqlalchemy import text
        from app.config import get_settings
        
        settings = get_settings()
        db_url = settings.database_url
        if not db_url.startswith('postgresql+asyncpg://'):
            db_url = db_url.replace('postgresql://', 'postgresql+asyncpg://')
        
        engine = create_async_engine(db_url)
        
        async with engine.connect() as conn:
            await conn.execute(text("""
                UPDATE rl_experiences 
                SET reward = reward + :reward
                WHERE id = :id AND tenant_id = :tenant_id
            """), {"id": experience_id, "reward": reward, "tenant_id": tenant_id})
            
            await conn.commit()
        
        await engine.dispose()
        
        return {
            "success": True,
            "experience_id": experience_id,
            "reward_added": reward
        }
        
    except Exception as e:
        logger.error("Error adding reward", error=str(e))
        return {"success": False, "error": str(e)}


async def get_rl_status(tenant_id: str, agent_type: str = None) -> Dict[str, Any]:
    """Retorna status do sistema de RL."""
    try:
        from app.rl.mode_manager import RLModeManager
        from app.rl.experience_buffer import ExperienceBuffer
        
        mode_manager = RLModeManager()
        buffer = ExperienceBuffer()
        
        status = {}
        
        agent_types = [agent_type] if agent_type else ['sdr', 'ads']
        
        for at in agent_types:
            mode = await mode_manager.get_mode(at, tenant_id)
            count = await buffer.count(at, tenant_id)
            mode_status = await mode_manager.get_mode_status(tenant_id)
            
            status[at] = {
                "current_mode": str(mode),
                "experience_count": count,
                "thresholds": mode_status.get(at, {}),
            }
        
        return {
            "tenant_id": tenant_id,
            "status": status,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error("Error getting RL status", error=str(e))
        return {"status": {}, "error": str(e)}


async def get_action_stats(agent_type: str, tenant_id: str) -> Dict[str, Any]:
    """Retorna estatísticas por ação."""
    try:
        from sqlalchemy.ext.asyncio import create_async_engine
        from sqlalchemy import text
        from app.config import get_settings
        
        settings = get_settings()
        db_url = settings.database_url
        if not db_url.startswith('postgresql+asyncpg://'):
            db_url = db_url.replace('postgresql://', 'postgresql+asyncpg://')
        
        engine = create_async_engine(db_url)
        
        async with engine.connect() as conn:
            result = await conn.execute(text("""
                SELECT 
                    action,
                    COUNT(*) as count,
                    AVG(reward) as avg_reward,
                    MAX(reward) as max_reward,
                    MIN(reward) as min_reward
                FROM rl_experiences
                WHERE tenant_id = :tenant_id AND agent_type = :agent_type
                GROUP BY action
                ORDER BY avg_reward DESC
            """), {"tenant_id": tenant_id, "agent_type": agent_type})
            
            stats = []
            for row in result.fetchall():
                stats.append({
                    "action": row.action,
                    "count": row.count,
                    "avg_reward": float(row.avg_reward) if row.avg_reward else 0,
                    "max_reward": float(row.max_reward) if row.max_reward else 0,
                    "min_reward": float(row.min_reward) if row.min_reward else 0,
                })
        
        await engine.dispose()
        
        return {
            "agent_type": agent_type,
            "tenant_id": tenant_id,
            "stats": stats
        }
        
    except Exception as e:
        logger.error("Error getting action stats", error=str(e))
        return {"stats": [], "error": str(e)}


async def explain_action(
    agent_type: str,
    action: str,
    state: Dict[str, Any]
) -> Dict[str, Any]:
    """Explica uma ação."""
    try:
        from app.rl.explainability import ActionExplainer
        from app.rl.states import SDRState, AdsState
        from app.rl.actions import SDRAction, AdsAction
        
        explainer = ActionExplainer()
        
        # Converte action string para enum
        if agent_type == 'sdr':
            action_enum = SDRAction[action]
            state_obj = SDRState(
                lead_score=state.get("lead_score", 50),
                stage_index=state.get("stage_index", 0),
                intent=state.get("intent", 0),
                num_messages=state.get("num_messages", 0),
                time_since_last=state.get("time_since_last", 0),
                sentiment=state.get("sentiment", 0.5),
                has_objection=state.get("has_objection", False)
            )
            explanation = explainer.explain_sdr_action(state_obj, action_enum, "unknown")
        else:
            action_enum = AdsAction[action]
            state_obj = AdsState(
                objective_index=state.get("objective_index", 0),
                budget_normalized=state.get("budget_normalized", 0.5),
                creative_type=state.get("creative_type", 0),
                current_roas=state.get("current_roas", 1.5),
                current_ctr=state.get("current_ctr", 1.0),
                days_running=state.get("days_running", 0)
            )
            explanation = explainer.explain_ads_action(state_obj, action_enum)
        
        return {
            "agent_type": agent_type,
            "action": action,
            "explanation": explanation,
            "state_summary": state
        }
        
    except Exception as e:
        logger.error("Error explaining action", error=str(e))
        return {"explanation": "Não foi possível gerar explicação", "error": str(e)}


async def validate_action(
    agent_type: str,
    action: str,
    state: Dict[str, Any],
    tenant_id: str
) -> Dict[str, Any]:
    """Valida ação com SafetyGuard."""
    try:
        from app.rl.safety_guard import AdsSafetyGuard
        from app.rl.states import AdsState
        from app.rl.actions import AdsAction
        
        if agent_type != 'ads':
            # Só Ads tem SafetyGuard por enquanto
            return {
                "allowed": True,
                "reason": "SafetyGuard só disponível para agente Ads"
            }
        
        safety = AdsSafetyGuard()
        
        state_obj = AdsState(
            objective_index=state.get("objective_index", 0),
            budget_normalized=state.get("budget_normalized", 0.5),
            creative_type=state.get("creative_type", 0),
            current_roas=state.get("current_roas", 1.5),
            current_ctr=state.get("current_ctr", 1.0),
            days_running=state.get("days_running", 0)
        )
        
        action_enum = AdsAction[action]
        
        result = await safety.validate_action(state_obj, action_enum, tenant_id)
        
        return {
            "allowed": result.allowed,
            "reason": result.reason,
            "action": action,
            "agent_type": agent_type
        }
        
    except Exception as e:
        logger.error("Error validating action", error=str(e))
        return {"allowed": False, "error": str(e)}


async def get_policy_mode(agent_type: str, tenant_id: str) -> Dict[str, Any]:
    """Retorna modo atual da política."""
    try:
        from app.rl.mode_manager import RLModeManager
        
        mode_manager = RLModeManager()
        mode = await mode_manager.get_mode(agent_type, tenant_id)
        
        return {
            "agent_type": agent_type,
            "tenant_id": tenant_id,
            "mode": str(mode),
            "description": {
                "PolicyMode.RULE_BASED": "Usando regras fixas (< 50 experiências)",
                "PolicyMode.BANDIT": "Usando Thompson Sampling (50-500 experiências)",
                "PolicyMode.DQN": "Usando Deep Q-Network (500+ experiências)"
            }.get(str(mode), "Modo desconhecido")
        }
        
    except Exception as e:
        logger.error("Error getting policy mode", error=str(e))
        return {"mode": "unknown", "error": str(e)}


async def get_experience_count(agent_type: str, tenant_id: str) -> Dict[str, Any]:
    """Conta experiências no buffer."""
    try:
        from app.rl.experience_buffer import ExperienceBuffer
        
        buffer = ExperienceBuffer()
        count = await buffer.count(agent_type, tenant_id)
        
        return {
            "agent_type": agent_type,
            "tenant_id": tenant_id,
            "count": count
        }
        
    except Exception as e:
        logger.error("Error counting experiences", error=str(e))
        return {"count": 0, "error": str(e)}


async def clear_experiences(
    agent_type: str,
    tenant_id: str,
    confirm: bool = False
) -> Dict[str, Any]:
    """Limpa buffer de experiências."""
    if not confirm:
        return {
            "success": False,
            "reason": "Operação requer confirmação. Defina confirm=true."
        }
    
    try:
        from sqlalchemy.ext.asyncio import create_async_engine
        from sqlalchemy import text
        from app.config import get_settings
        
        settings = get_settings()
        db_url = settings.database_url
        if not db_url.startswith('postgresql+asyncpg://'):
            db_url = db_url.replace('postgresql://', 'postgresql+asyncpg://')
        
        engine = create_async_engine(db_url)
        
        async with engine.connect() as conn:
            result = await conn.execute(text("""
                DELETE FROM rl_experiences
                WHERE tenant_id = :tenant_id AND agent_type = :agent_type
            """), {"tenant_id": tenant_id, "agent_type": agent_type})
            
            deleted = result.rowcount
            await conn.commit()
        
        await engine.dispose()
        
        logger.warning("Experiences cleared",
            agent_type=agent_type,
            tenant_id=tenant_id,
            deleted=deleted
        )
        
        return {
            "success": True,
            "agent_type": agent_type,
            "tenant_id": tenant_id,
            "experiences_deleted": deleted
        }
        
    except Exception as e:
        logger.error("Error clearing experiences", error=str(e))
        return {"success": False, "error": str(e)}

