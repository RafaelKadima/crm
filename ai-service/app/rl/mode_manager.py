"""
Mode Manager para Reinforcement Learning.

Gerencia a transição entre modos de política (RULE_BASED -> BANDIT -> DQN).
Também fornece status e estatísticas para o dashboard.
"""
from typing import Dict, Any, Optional
from dataclasses import dataclass
import structlog

from app.config import get_settings
from app.rl.policy_engine import PolicyMode
from app.rl.experience_buffer import get_experience_buffer

logger = structlog.get_logger()
settings = get_settings()


@dataclass
class ModeStatus:
    """Status do modo de RL para um agente/tenant."""
    current_mode: PolicyMode
    experiences_count: int
    next_mode: Optional[PolicyMode]
    experiences_to_next_mode: int
    progress_percent: float
    is_ready_for_upgrade: bool


class RLModeManager:
    """
    Gerencia transição entre modos de política.
    
    Transições:
    - RULE_BASED -> BANDIT: Quando tem experiências suficientes para explorar
    - BANDIT -> DQN: Quando tem dados suficientes para treinar rede neural
    """
    
    # Thresholds para transição
    THRESHOLDS = {
        'sdr': {
            PolicyMode.RULE_BASED: 0,
            PolicyMode.BANDIT: 50,
            PolicyMode.DQN: 500,
        },
        'ads': {
            PolicyMode.RULE_BASED: 0,
            PolicyMode.BANDIT: 30,
            PolicyMode.DQN: 300,
        }
    }
    
    # Requisitos adicionais para upgrade
    UPGRADE_REQUIREMENTS = {
        PolicyMode.BANDIT: {
            'min_positive_rate': 0.3,  # 30% de rewards positivos
            'min_days_active': 7,      # 7 dias de atividade
        },
        PolicyMode.DQN: {
            'min_positive_rate': 0.4,  # 40% de rewards positivos
            'min_days_active': 14,     # 14 dias de atividade
            'min_actions_variety': 3,  # Pelo menos 3 ações diferentes usadas
        }
    }
    
    def __init__(self):
        self.experience_buffer = get_experience_buffer()
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
    
    async def get_mode(self, agent_type: str, tenant_id: str) -> PolicyMode:
        """Determina o modo atual baseado em quantidade de dados."""
        count = await self.experience_buffer.count(agent_type, tenant_id)
        thresholds = self.THRESHOLDS.get(agent_type, self.THRESHOLDS['sdr'])
        
        if count >= thresholds[PolicyMode.DQN]:
            return PolicyMode.DQN
        elif count >= thresholds[PolicyMode.BANDIT]:
            return PolicyMode.BANDIT
        else:
            return PolicyMode.RULE_BASED
    
    async def get_mode_status(
        self,
        agent_type: str,
        tenant_id: str
    ) -> ModeStatus:
        """
        Retorna status detalhado do modo de RL.
        
        Útil para mostrar no dashboard.
        """
        count = await self.experience_buffer.count(agent_type, tenant_id)
        thresholds = self.THRESHOLDS.get(agent_type, self.THRESHOLDS['sdr'])
        
        current_mode = await self.get_mode(agent_type, tenant_id)
        
        # Determina próximo modo e progresso
        if current_mode == PolicyMode.RULE_BASED:
            next_mode = PolicyMode.BANDIT
            next_threshold = thresholds[PolicyMode.BANDIT]
            progress = (count / next_threshold) * 100 if next_threshold > 0 else 100
        elif current_mode == PolicyMode.BANDIT:
            next_mode = PolicyMode.DQN
            next_threshold = thresholds[PolicyMode.DQN]
            bandit_start = thresholds[PolicyMode.BANDIT]
            range_size = next_threshold - bandit_start
            progress = ((count - bandit_start) / range_size) * 100 if range_size > 0 else 100
        else:
            next_mode = None
            next_threshold = count
            progress = 100
        
        experiences_to_next = max(0, next_threshold - count) if next_mode else 0
        
        # Verifica se está pronto para upgrade
        is_ready = await self._check_upgrade_readiness(
            agent_type, tenant_id, current_mode, count
        )
        
        return ModeStatus(
            current_mode=current_mode,
            experiences_count=count,
            next_mode=next_mode,
            experiences_to_next_mode=experiences_to_next,
            progress_percent=min(progress, 100),
            is_ready_for_upgrade=is_ready
        )
    
    async def _check_upgrade_readiness(
        self,
        agent_type: str,
        tenant_id: str,
        current_mode: PolicyMode,
        count: int
    ) -> bool:
        """Verifica se tenant está pronto para upgrade de modo."""
        thresholds = self.THRESHOLDS.get(agent_type, self.THRESHOLDS['sdr'])
        
        # Se já está no DQN, não há upgrade
        if current_mode == PolicyMode.DQN:
            return False
        
        # Determina próximo modo
        if current_mode == PolicyMode.RULE_BASED:
            next_mode = PolicyMode.BANDIT
            required_count = thresholds[PolicyMode.BANDIT]
        else:
            next_mode = PolicyMode.DQN
            required_count = thresholds[PolicyMode.DQN]
        
        # Verifica quantidade mínima
        if count < required_count:
            return False
        
        # Verifica requisitos adicionais
        requirements = self.UPGRADE_REQUIREMENTS.get(next_mode, {})
        
        # Verifica taxa de rewards positivos
        stats = await self.experience_buffer.get_action_stats(agent_type, tenant_id)
        total_successes = sum(s['successes'] for s in stats.values())
        total_failures = sum(s['failures'] for s in stats.values())
        total = total_successes + total_failures
        
        if total > 0:
            positive_rate = total_successes / total
            if positive_rate < requirements.get('min_positive_rate', 0):
                return False
        
        # Verifica variedade de ações (para DQN)
        if next_mode == PolicyMode.DQN:
            actions_used = len(stats)
            if actions_used < requirements.get('min_actions_variety', 0):
                return False
        
        return True
    
    async def get_all_modes_status(self, tenant_id: str) -> Dict[str, ModeStatus]:
        """Retorna status de todos os agentes para um tenant."""
        return {
            'sdr': await self.get_mode_status('sdr', tenant_id),
            'ads': await self.get_mode_status('ads', tenant_id),
        }
    
    async def get_training_recommendation(
        self,
        agent_type: str,
        tenant_id: str
    ) -> Dict[str, Any]:
        """
        Retorna recomendações para melhorar o treinamento.
        """
        status = await self.get_mode_status(agent_type, tenant_id)
        stats = await self.experience_buffer.get_action_stats(agent_type, tenant_id)
        
        recommendations = []
        
        # Se está no RULE_BASED, encoraja mais interações
        if status.current_mode == PolicyMode.RULE_BASED:
            recommendations.append({
                'type': 'interaction',
                'message': f'Precisa de mais {status.experiences_to_next_mode} interações para evoluir para aprendizado adaptativo',
                'priority': 'high'
            })
        
        # Se está no BANDIT, verifica diversidade de ações
        if status.current_mode == PolicyMode.BANDIT:
            actions_count = len(stats)
            if actions_count < 4:
                recommendations.append({
                    'type': 'diversity',
                    'message': f'Apenas {actions_count} tipos de ação diferentes. Mais variedade melhora o aprendizado.',
                    'priority': 'medium'
                })
        
        # Verifica taxa de sucesso
        total_successes = sum(s['successes'] for s in stats.values())
        total_failures = sum(s['failures'] for s in stats.values())
        total = total_successes + total_failures
        
        if total > 0:
            success_rate = total_successes / total
            if success_rate < 0.3:
                recommendations.append({
                    'type': 'performance',
                    'message': f'Taxa de sucesso ({success_rate:.0%}) está baixa. Revise as estratégias.',
                    'priority': 'high'
                })
        
        return {
            'status': status,
            'recommendations': recommendations,
            'action_stats': stats
        }


# Singleton
mode_manager = RLModeManager()


def get_mode_manager() -> RLModeManager:
    """Retorna instância singleton do manager."""
    return mode_manager
