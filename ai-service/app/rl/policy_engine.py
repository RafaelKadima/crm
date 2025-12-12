"""
Policy Engine para Reinforcement Learning.

Motor de decisão que seleciona ações baseado no estado.
Suporta 3 modos: RULE_BASED, BANDIT (Thompson Sampling), DQN.
"""
import random
from enum import Enum
from typing import Optional, Dict, Any, List, Tuple
import numpy as np
import structlog

from app.config import get_settings
from app.rl.states import SDRState, AdsState
from app.rl.actions import SDRAction, AdsAction
from app.rl.experience_buffer import get_experience_buffer

logger = structlog.get_logger()
settings = get_settings()


class PolicyMode(str, Enum):
    """Modos de operação da política."""
    RULE_BASED = "RULE_BASED"  # Regras fixas
    BANDIT = "BANDIT"          # Thompson Sampling
    DQN = "DQN"                # Deep Q-Network


class PolicyEngine:
    """
    Motor de políticas para seleção de ações.
    
    Transição automática entre modos baseada na quantidade de dados:
    - RULE_BASED: < 50 experiências (regras programadas)
    - BANDIT: 50-500 experiências (Thompson Sampling)
    - DQN: > 500 experiências (rede neural)
    """
    
    # Thresholds para transição de modo
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
    
    def __init__(self):
        self.experience_buffer = get_experience_buffer()
        self._model_cache = {}  # Cache de modelos DQN carregados
    
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
    
    async def select_action(
        self,
        state: Any,
        agent_type: str,
        tenant_id: str,
        exploration_rate: float = 0.1
    ) -> Tuple[int, float, PolicyMode]:
        """
        Seleciona a melhor ação para o estado atual.
        
        Args:
            state: Estado atual (SDRState ou AdsState)
            agent_type: 'sdr' ou 'ads'
            tenant_id: ID do tenant
            exploration_rate: Taxa de exploração (para BANDIT/DQN)
        
        Returns:
            Tuple de (action_id, confidence, mode)
        """
        mode = await self.get_mode(agent_type, tenant_id)
        
        if mode == PolicyMode.RULE_BASED:
            action, confidence = await self._rule_based_select(state, agent_type)
        elif mode == PolicyMode.BANDIT:
            action, confidence = await self._bandit_select(
                state, agent_type, tenant_id, exploration_rate
            )
        else:  # DQN
            action, confidence = await self._dqn_select(
                state, agent_type, tenant_id, exploration_rate
            )
        
        logger.debug("action_selected",
            agent_type=agent_type,
            mode=mode.value,
            action=action,
            confidence=confidence
        )
        
        return action, confidence, mode
    
    async def _rule_based_select(
        self,
        state: Any,
        agent_type: str
    ) -> Tuple[int, float]:
        """
        Seleção baseada em regras programadas.
        
        Regras são heurísticas que funcionam bem na maioria dos casos.
        """
        if agent_type == 'sdr':
            return self._sdr_rules(state)
        else:
            return self._ads_rules(state)
    
    def _sdr_rules(self, state: SDRState) -> Tuple[int, float]:
        """Regras para SDR Agent."""
        # Lead quente com intenção de agendamento
        if state.lead_score > 70 and state.intent == 'scheduling':
            return SDRAction.SCHEDULE, 0.9
        
        # Lead quente sem objeções
        if state.lead_score > 70 and not state.has_objection:
            return SDRAction.QUALIFY, 0.85
        
        # Tem objeção pendente
        if state.has_objection:
            return SDRAction.HANDLE_OBJECTION, 0.9
        
        # Lead muito quente, decisor, com budget
        if state.temperature == 'hot' and state.decision_maker and state.budget_mentioned:
            return SDRAction.SCHEDULE, 0.95
        
        # Muitas objeções ou sentimento negativo
        if state.objection_count > 3 or state.sentiment < -0.5:
            return SDRAction.ESCALATE, 0.8
        
        # Lead frio ou desinteressado
        if state.temperature == 'cold' or state.sentiment < -0.3:
            return SDRAction.SEND_CONTENT, 0.7
        
        # Lead no início do funil
        if state.stage_index < 2 and state.num_messages < 5:
            return SDRAction.QUALIFY, 0.8
        
        # Tempo desde última mensagem muito alto
        if state.time_since_last_msg > 86400:  # > 1 dia
            return SDRAction.WAIT, 0.6
        
        # Default: responder normalmente
        return SDRAction.RESPOND_NORMAL, 0.7
    
    def _ads_rules(self, state: AdsState) -> Tuple[int, float]:
        """Regras para Ads Agent."""
        # Campanha nova em aprendizado
        if state.is_learning or state.days_running < 3:
            return AdsAction.KEEP_RUNNING, 0.9
        
        # ROAS excelente - considerar escalar
        if state.current_roas > 3 and state.days_running >= 7:
            return AdsAction.INCREASE_BUDGET, 0.85
        
        # ROAS bom e estável
        if 2 <= state.current_roas <= 3:
            return AdsAction.KEEP_RUNNING, 0.9
        
        # ROAS ok - manter mas monitorar
        if 1 <= state.current_roas < 2:
            return AdsAction.KEEP_RUNNING, 0.7
        
        # ROAS negativo por muito tempo
        if state.current_roas < 1 and state.days_running > 7:
            return AdsAction.DECREASE_BUDGET, 0.8
        
        # ROAS muito ruim - pausar
        if state.current_roas < 0.5 and state.days_running > 5:
            return AdsAction.PAUSE, 0.85
        
        # Campanha pausada com bom histórico
        if state.status == 'PAUSED' and state.historical_roas_avg > 2:
            return AdsAction.ACTIVATE, 0.7
        
        # Default: manter rodando
        return AdsAction.KEEP_RUNNING, 0.6
    
    async def _bandit_select(
        self,
        state: Any,
        agent_type: str,
        tenant_id: str,
        exploration_rate: float
    ) -> Tuple[int, float]:
        """
        Seleção usando Thompson Sampling (Multi-Armed Bandit).
        
        Equilibra exploração e exploitação baseado em estatísticas históricas.
        """
        # Com probabilidade exploration_rate, explora aleatoriamente
        if random.random() < exploration_rate:
            if agent_type == 'sdr':
                action = random.choice(list(SDRAction))
            else:
                action = random.choice(list(AdsAction))
            return int(action), 0.5
        
        # Busca estatísticas de ações
        stats = await self.experience_buffer.get_action_stats(
            agent_type, tenant_id, days=30
        )
        
        if not stats:
            # Sem dados, usa regras
            return await self._rule_based_select(state, agent_type)
        
        # Thompson Sampling: amostra de distribuição Beta para cada ação
        actions = SDRAction.get_all() if agent_type == 'sdr' else AdsAction.get_all()
        
        samples = []
        for action in actions:
            action_key = str(int(action))
            if action_key in stats:
                alpha = stats[action_key]['successes'] + 1
                beta = stats[action_key]['failures'] + 1
            else:
                alpha = 1
                beta = 1
            
            # Amostra da distribuição Beta
            sample = np.random.beta(alpha, beta)
            samples.append((action, sample))
        
        # Seleciona ação com maior amostra
        best_action, best_sample = max(samples, key=lambda x: x[1])
        
        # Confiança baseada no número de observações
        action_key = str(int(best_action))
        if action_key in stats:
            count = stats[action_key]['count']
            confidence = min(0.5 + (count / 100) * 0.5, 0.95)
        else:
            confidence = 0.5
        
        return int(best_action), confidence
    
    async def _dqn_select(
        self,
        state: Any,
        agent_type: str,
        tenant_id: str,
        exploration_rate: float
    ) -> Tuple[int, float]:
        """
        Seleção usando Deep Q-Network.
        
        Usa modelo neural treinado para estimar Q-values.
        """
        # Epsilon-greedy: exploração aleatória
        if random.random() < exploration_rate:
            if agent_type == 'sdr':
                action = random.choice(list(SDRAction))
            else:
                action = random.choice(list(AdsAction))
            return int(action), 0.5
        
        # Tenta carregar modelo do cache ou do disco
        model_key = f"{tenant_id}_{agent_type}"
        
        if model_key not in self._model_cache:
            model = await self._load_dqn_model(agent_type, tenant_id)
            if model:
                self._model_cache[model_key] = model
            else:
                # Fallback para bandit se modelo não disponível
                return await self._bandit_select(
                    state, agent_type, tenant_id, exploration_rate
                )
        
        model = self._model_cache[model_key]
        
        # Converte estado para tensor
        state_vector = state.to_vector()
        
        try:
            import torch
            with torch.no_grad():
                state_tensor = torch.FloatTensor(state_vector).unsqueeze(0)
                q_values = model(state_tensor)
                
                action = int(q_values.argmax().item())
                confidence = float(torch.softmax(q_values, dim=1).max().item())
                
                return action, confidence
                
        except Exception as e:
            logger.error("dqn_select_error", error=str(e))
            return await self._bandit_select(
                state, agent_type, tenant_id, exploration_rate
            )
    
    async def _load_dqn_model(self, agent_type: str, tenant_id: str):
        """Carrega modelo DQN do disco."""
        try:
            from app.ml.model_registry import get_model_registry
            
            registry = get_model_registry()
            model_type = 'sdr_policy' if agent_type == 'sdr' else 'ads_policy'
            
            return await registry.get_model(model_type, tenant_id)
            
        except Exception as e:
            logger.error("load_dqn_model_error", error=str(e))
            return None
    
    def clear_cache(self, tenant_id: str = None):
        """Limpa cache de modelos."""
        if tenant_id:
            keys_to_remove = [k for k in self._model_cache if k.startswith(tenant_id)]
            for key in keys_to_remove:
                del self._model_cache[key]
        else:
            self._model_cache.clear()


# Singleton
policy_engine = PolicyEngine()


def get_policy_engine() -> PolicyEngine:
    """Retorna instância singleton do engine."""
    return policy_engine
