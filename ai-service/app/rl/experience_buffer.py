"""
Experience Buffer para Reinforcement Learning.

Armazena experiências (state, action, reward, next_state) para treinamento.
Suporta múltiplos tenants e tipos de agente.
"""
import json
import uuid
from typing import List, Optional, Dict, Any, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
import random
import structlog

from app.config import get_settings
from app.rl.states import SDRState, AdsState
from app.rl.actions import SDRAction, AdsAction

logger = structlog.get_logger()
settings = get_settings()


@dataclass
class Experience:
    """Uma experiência de RL."""
    id: str
    tenant_id: str
    agent_type: str  # 'sdr' ou 'ads'
    entity_id: str  # lead_id ou campaign_id
    state: Dict[str, Any]
    action: int
    reward: Optional[float]
    next_state: Optional[Dict[str, Any]]
    is_terminal: bool
    policy_mode: str
    action_confidence: float
    created_at: datetime
    
    def to_dict(self) -> Dict[str, Any]:
        """Converte para dicionário."""
        return {
            **asdict(self),
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class ExperienceBuffer:
    """
    Buffer de experiências para treinamento de RL.
    
    Armazena no PostgreSQL para persistência e permite
    amostragem para treinamento.
    """
    
    def __init__(self):
        self._db_engine = None
    
    async def get_db_engine(self):
        """Lazy loading do engine do banco."""
        if self._db_engine is None:
            from sqlalchemy.ext.asyncio import create_async_engine
            db_url = settings.database_url
            if not db_url.startswith('postgresql+asyncpg://'):
                db_url = db_url.replace('postgresql://', 'postgresql+asyncpg://')
            self._db_engine = create_async_engine(db_url)
        return self._db_engine
    
    async def add(
        self,
        tenant_id: str,
        agent_type: str,
        entity_id: str,
        state: Dict[str, Any],
        action: int,
        policy_mode: str = 'RULE_BASED',
        action_confidence: float = 1.0
    ) -> str:
        """
        Adiciona uma nova experiência ao buffer.
        
        Reward e next_state são adicionados depois via add_reward().
        
        Returns:
            ID da experiência criada
        """
        try:
            engine = await self.get_db_engine()
            experience_id = str(uuid.uuid4())
            
            async with engine.begin() as conn:
                from sqlalchemy import text
                
                await conn.execute(text("""
                    INSERT INTO rl_experiences 
                    (id, tenant_id, agent_type, entity_id, state, action, 
                     policy_mode, action_confidence, reward_received, created_at, updated_at)
                    VALUES 
                    (:id, :tenant_id, :agent_type, :entity_id, :state, :action,
                     :policy_mode, :action_confidence, false, NOW(), NOW())
                """), {
                    'id': experience_id,
                    'tenant_id': tenant_id,
                    'agent_type': agent_type,
                    'entity_id': entity_id,
                    'state': json.dumps(state),
                    'action': str(action),
                    'policy_mode': policy_mode,
                    'action_confidence': action_confidence,
                })
            
            logger.debug("experience_added",
                id=experience_id,
                agent_type=agent_type,
                entity_id=entity_id
            )
            
            return experience_id
            
        except Exception as e:
            logger.error("add_experience_error", error=str(e))
            raise
    
    async def add_reward(
        self,
        experience_id: str,
        reward: float,
        next_state: Optional[Dict[str, Any]] = None,
        is_terminal: bool = False
    ) -> bool:
        """
        Adiciona reward a uma experiência existente.
        
        Chamado quando o outcome é observado.
        """
        try:
            engine = await self.get_db_engine()
            
            async with engine.begin() as conn:
                from sqlalchemy import text
                
                await conn.execute(text("""
                    UPDATE rl_experiences
                    SET reward = :reward,
                        next_state = :next_state,
                        is_terminal = :is_terminal,
                        reward_received = true,
                        updated_at = NOW()
                    WHERE id = :id
                """), {
                    'id': experience_id,
                    'reward': reward,
                    'next_state': json.dumps(next_state) if next_state else None,
                    'is_terminal': is_terminal,
                })
            
            logger.debug("reward_added",
                experience_id=experience_id,
                reward=reward,
                is_terminal=is_terminal
            )
            
            return True
            
        except Exception as e:
            logger.error("add_reward_error", error=str(e))
            return False
    
    async def count(
        self,
        agent_type: str,
        tenant_id: str,
        with_reward_only: bool = True
    ) -> int:
        """Conta experiências para um tenant/agente."""
        try:
            engine = await self.get_db_engine()
            
            async with engine.connect() as conn:
                from sqlalchemy import text
                
                sql = """
                    SELECT COUNT(*) FROM rl_experiences
                    WHERE tenant_id = :tenant_id
                    AND agent_type = :agent_type
                """
                
                if with_reward_only:
                    sql += " AND reward_received = true"
                
                result = await conn.execute(text(sql), {
                    'tenant_id': tenant_id,
                    'agent_type': agent_type
                })
                
                return result.scalar() or 0
                
        except Exception as e:
            logger.error("count_experiences_error", error=str(e))
            return 0
    
    async def sample_batch(
        self,
        agent_type: str,
        tenant_id: str,
        batch_size: int = 32,
        recent_days: int = 30
    ) -> List[Experience]:
        """
        Amostra um batch de experiências para treinamento.
        
        Usa amostragem aleatória com foco em experiências recentes.
        """
        try:
            engine = await self.get_db_engine()
            
            async with engine.connect() as conn:
                from sqlalchemy import text
                
                since_date = datetime.utcnow() - timedelta(days=recent_days)
                
                result = await conn.execute(text("""
                    SELECT id, tenant_id, agent_type, entity_id, state, action,
                           reward, next_state, is_terminal, policy_mode, 
                           action_confidence, created_at
                    FROM rl_experiences
                    WHERE tenant_id = :tenant_id
                    AND agent_type = :agent_type
                    AND reward_received = true
                    AND created_at > :since_date
                    ORDER BY RANDOM()
                    LIMIT :batch_size
                """), {
                    'tenant_id': tenant_id,
                    'agent_type': agent_type,
                    'since_date': since_date,
                    'batch_size': batch_size
                })
                
                experiences = []
                for row in result.fetchall():
                    experiences.append(Experience(
                        id=str(row.id),
                        tenant_id=str(row.tenant_id),
                        agent_type=row.agent_type,
                        entity_id=row.entity_id,
                        state=json.loads(row.state) if isinstance(row.state, str) else row.state,
                        action=int(row.action),
                        reward=float(row.reward) if row.reward else None,
                        next_state=json.loads(row.next_state) if row.next_state and isinstance(row.next_state, str) else row.next_state,
                        is_terminal=row.is_terminal,
                        policy_mode=row.policy_mode,
                        action_confidence=float(row.action_confidence) if row.action_confidence else 1.0,
                        created_at=row.created_at
                    ))
                
                return experiences
                
        except Exception as e:
            logger.error("sample_batch_error", error=str(e))
            return []
    
    async def get_action_stats(
        self,
        agent_type: str,
        tenant_id: str,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Retorna estatísticas de ações e rewards.
        
        Usado para Thompson Sampling e análise.
        """
        try:
            engine = await self.get_db_engine()
            
            async with engine.connect() as conn:
                from sqlalchemy import text
                
                since_date = datetime.utcnow() - timedelta(days=days)
                
                result = await conn.execute(text("""
                    SELECT 
                        action,
                        COUNT(*) as count,
                        AVG(reward) as avg_reward,
                        SUM(CASE WHEN reward > 0 THEN 1 ELSE 0 END) as successes,
                        SUM(CASE WHEN reward <= 0 THEN 1 ELSE 0 END) as failures
                    FROM rl_experiences
                    WHERE tenant_id = :tenant_id
                    AND agent_type = :agent_type
                    AND reward_received = true
                    AND created_at > :since_date
                    GROUP BY action
                """), {
                    'tenant_id': tenant_id,
                    'agent_type': agent_type,
                    'since_date': since_date
                })
                
                stats = {}
                for row in result.fetchall():
                    stats[row.action] = {
                        'count': row.count,
                        'avg_reward': float(row.avg_reward) if row.avg_reward else 0,
                        'successes': row.successes or 0,
                        'failures': row.failures or 0,
                    }
                
                return stats
                
        except Exception as e:
            logger.error("get_action_stats_error", error=str(e))
            return {}
    
    async def cleanup_old(
        self,
        agent_type: str,
        tenant_id: str,
        keep_days: int = 90
    ) -> int:
        """
        Remove experiências antigas para economizar espaço.
        
        Mantém apenas experiências dos últimos keep_days.
        """
        try:
            engine = await self.get_db_engine()
            
            async with engine.begin() as conn:
                from sqlalchemy import text
                
                cutoff_date = datetime.utcnow() - timedelta(days=keep_days)
                
                result = await conn.execute(text("""
                    DELETE FROM rl_experiences
                    WHERE tenant_id = :tenant_id
                    AND agent_type = :agent_type
                    AND created_at < :cutoff_date
                """), {
                    'tenant_id': tenant_id,
                    'agent_type': agent_type,
                    'cutoff_date': cutoff_date
                })
                
                deleted = result.rowcount
                
                logger.info("experiences_cleaned",
                    tenant_id=tenant_id,
                    agent_type=agent_type,
                    deleted=deleted
                )
                
                return deleted
                
        except Exception as e:
            logger.error("cleanup_experiences_error", error=str(e))
            return 0


# Singleton
experience_buffer = ExperienceBuffer()


def get_experience_buffer() -> ExperienceBuffer:
    """Retorna instância singleton do buffer."""
    return experience_buffer
