"""
Sistema de Recompensas para Reinforcement Learning.

Rewards definem o que é "bom" e "ruim" para o agente.
São usados para treinar as políticas.
"""
from typing import Dict, Any, Optional
from dataclasses import dataclass
import structlog

from app.rl.states import SDRState, AdsState
from app.rl.actions import SDRAction, AdsAction

logger = structlog.get_logger()


@dataclass
class RewardResult:
    """Resultado do cálculo de reward."""
    reward: float
    components: Dict[str, float]  # Breakdown dos componentes
    explanation: str


class SDRRewardCalculator:
    """
    Calcula recompensas para ações do SDR Agent.
    
    Recompensas são baseadas em:
    - Resultado da interação (agendamento, venda, perda)
    - Qualidade da resposta (tempo, relevância)
    - Progressão no funil
    """
    
    # Rewards base por outcome
    OUTCOME_REWARDS = {
        'scheduled': 10.0,          # Lead agendou reunião
        'purchased': 20.0,          # Lead comprou
        'qualified': 5.0,           # Lead foi qualificado
        'moved_stage': 3.0,         # Lead avançou de estágio
        'escalated_success': 3.0,   # Escalação bem-sucedida
        'lost': -5.0,               # Lead perdido
        'unsubscribed': -3.0,       # Lead cancelou
        'no_response': -1.0,        # Lead não respondeu
    }
    
    # Bonus por comportamento
    BEHAVIOR_REWARDS = {
        'fast_response': 1.0,       # Resposta em < 5 minutos
        'relevant_content': 0.5,    # Conteúdo relevante enviado
        'objection_handled': 1.5,   # Objeção tratada com sucesso
        'sentiment_improved': 1.0,  # Sentimento do lead melhorou
    }
    
    # Penalidades
    PENALTIES = {
        'slow_response': -0.5,      # Resposta em > 1 hora
        'repeated_content': -0.5,   # Conteúdo repetido
        'wrong_escalation': -2.0,   # Escalação desnecessária
        'sentiment_worsened': -1.0, # Sentimento piorou
    }
    
    def calculate(
        self,
        state: SDRState,
        action: SDRAction,
        outcome: Dict[str, Any],
        next_state: Optional[SDRState] = None
    ) -> RewardResult:
        """
        Calcula reward para uma ação tomada.
        
        Args:
            state: Estado antes da ação
            action: Ação tomada
            outcome: Resultado observado
            next_state: Estado após a ação (se disponível)
        
        Returns:
            RewardResult com reward total e breakdown
        """
        components = {}
        total_reward = 0.0
        explanations = []
        
        # 1. Reward por outcome principal
        outcome_type = outcome.get('type', '')
        if outcome_type in self.OUTCOME_REWARDS:
            reward = self.OUTCOME_REWARDS[outcome_type]
            components['outcome'] = reward
            total_reward += reward
            explanations.append(f"Outcome '{outcome_type}': {reward:+.1f}")
        
        # 2. Bonus por tempo de resposta
        response_time = outcome.get('response_time_seconds', 0)
        if response_time > 0:
            if response_time < 300:  # < 5 minutos
                bonus = self.BEHAVIOR_REWARDS['fast_response']
                components['fast_response'] = bonus
                total_reward += bonus
                explanations.append(f"Resposta rápida: {bonus:+.1f}")
            elif response_time > 3600:  # > 1 hora
                penalty = self.PENALTIES['slow_response']
                components['slow_response'] = penalty
                total_reward += penalty
                explanations.append(f"Resposta lenta: {penalty:+.1f}")
        
        # 3. Mudança de sentimento
        if next_state:
            sentiment_change = next_state.sentiment - state.sentiment
            if sentiment_change > 0.2:
                bonus = self.BEHAVIOR_REWARDS['sentiment_improved']
                components['sentiment_improved'] = bonus
                total_reward += bonus
                explanations.append(f"Sentimento melhorou: {bonus:+.1f}")
            elif sentiment_change < -0.2:
                penalty = self.PENALTIES['sentiment_worsened']
                components['sentiment_worsened'] = penalty
                total_reward += penalty
                explanations.append(f"Sentimento piorou: {penalty:+.1f}")
        
        # 4. Progressão no funil
        if next_state and next_state.stage_index > state.stage_index:
            bonus = self.OUTCOME_REWARDS['moved_stage']
            components['moved_stage'] = bonus
            total_reward += bonus
            explanations.append(f"Avançou estágio: {bonus:+.1f}")
        
        # 5. Penalidade por escalação desnecessária
        if action == SDRAction.ESCALATE:
            if state.lead_score < 50 and not state.has_objection:
                penalty = self.PENALTIES['wrong_escalation']
                components['wrong_escalation'] = penalty
                total_reward += penalty
                explanations.append(f"Escalação precipitada: {penalty:+.1f}")
        
        # 6. Bonus por tratar objeção
        if action == SDRAction.HANDLE_OBJECTION and state.has_objection:
            if next_state and not next_state.has_objection:
                bonus = self.BEHAVIOR_REWARDS['objection_handled']
                components['objection_handled'] = bonus
                total_reward += bonus
                explanations.append(f"Objeção tratada: {bonus:+.1f}")
        
        return RewardResult(
            reward=total_reward,
            components=components,
            explanation=" | ".join(explanations) if explanations else "Sem reward específico"
        )


class AdsRewardCalculator:
    """
    Calcula recompensas para ações do Ads Agent.
    
    Recompensas são baseadas em:
    - Performance da campanha (ROAS, conversões)
    - Eficiência de budget
    - Estabilidade
    """
    
    # Rewards por performance
    PERFORMANCE_REWARDS = {
        'roas_excellent': 10.0,      # ROAS > 3x
        'roas_good': 5.0,            # ROAS > 2x
        'roas_ok': 2.0,              # ROAS > 1x
        'conversion': 1.0,           # Por conversão
        'ctr_improved': 2.0,         # CTR melhorou
    }
    
    # Rewards por eficiência
    EFFICIENCY_REWARDS = {
        'budget_saved': 2.0,         # Reduziu budget mantendo performance
        'scale_success': 5.0,        # Escalou com sucesso
        'quick_optimization': 1.0,   # Otimizou rapidamente
    }
    
    # Penalidades
    PENALTIES = {
        'roas_negative': -5.0,       # ROAS < 1x
        'budget_wasted': -3.0,       # Gastou sem resultado
        'scale_failed': -5.0,        # Escalou e performance caiu
        'campaign_failed': -10.0,    # Campanha falhou completamente
    }
    
    def calculate(
        self,
        state: AdsState,
        action: AdsAction,
        outcome: Dict[str, Any],
        next_state: Optional[AdsState] = None
    ) -> RewardResult:
        """
        Calcula reward para uma ação de Ads.
        
        Args:
            state: Estado antes da ação
            action: Ação tomada
            outcome: Resultado observado (métricas após período)
            next_state: Estado após a ação
        
        Returns:
            RewardResult com reward total e breakdown
        """
        components = {}
        total_reward = 0.0
        explanations = []
        
        # 1. Reward baseado em ROAS
        new_roas = outcome.get('roas', next_state.current_roas if next_state else 0)
        
        if new_roas >= 3:
            reward = self.PERFORMANCE_REWARDS['roas_excellent']
            components['roas'] = reward
            explanations.append(f"ROAS excelente ({new_roas:.1f}x): {reward:+.1f}")
        elif new_roas >= 2:
            reward = self.PERFORMANCE_REWARDS['roas_good']
            components['roas'] = reward
            explanations.append(f"ROAS bom ({new_roas:.1f}x): {reward:+.1f}")
        elif new_roas >= 1:
            reward = self.PERFORMANCE_REWARDS['roas_ok']
            components['roas'] = reward
            explanations.append(f"ROAS positivo ({new_roas:.1f}x): {reward:+.1f}")
        elif new_roas > 0:
            penalty = self.PENALTIES['roas_negative']
            components['roas'] = penalty
            explanations.append(f"ROAS negativo ({new_roas:.1f}x): {penalty:+.1f}")
        
        total_reward += components.get('roas', 0)
        
        # 2. Reward por conversões
        new_conversions = outcome.get('conversions', 0)
        if new_conversions > 0:
            conv_reward = new_conversions * self.PERFORMANCE_REWARDS['conversion']
            conv_reward = min(conv_reward, 10)  # Cap em 10
            components['conversions'] = conv_reward
            total_reward += conv_reward
            explanations.append(f"{new_conversions} conversões: {conv_reward:+.1f}")
        
        # 3. Reward/Penalty por ação específica
        if action == AdsAction.INCREASE_BUDGET:
            if next_state and next_state.current_roas >= state.current_roas * 0.9:
                bonus = self.EFFICIENCY_REWARDS['scale_success']
                components['scale'] = bonus
                total_reward += bonus
                explanations.append(f"Escala bem-sucedida: {bonus:+.1f}")
            else:
                penalty = self.PENALTIES['scale_failed']
                components['scale'] = penalty
                total_reward += penalty
                explanations.append(f"Escala falhou: {penalty:+.1f}")
        
        elif action == AdsAction.DECREASE_BUDGET:
            # Reward por eficiência se manteve ROAS
            if next_state and next_state.current_roas >= state.current_roas:
                bonus = self.EFFICIENCY_REWARDS['budget_saved']
                components['efficiency'] = bonus
                total_reward += bonus
                explanations.append(f"Budget otimizado: {bonus:+.1f}")
        
        # 4. Melhoria de CTR
        if next_state and state.current_ctr > 0:
            ctr_change = (next_state.current_ctr - state.current_ctr) / state.current_ctr
            if ctr_change > 0.1:  # Melhorou > 10%
                bonus = self.PERFORMANCE_REWARDS['ctr_improved']
                components['ctr'] = bonus
                total_reward += bonus
                explanations.append(f"CTR melhorou {ctr_change*100:.0f}%: {bonus:+.1f}")
        
        # 5. Penalidade por campanha completamente falhada
        if outcome.get('status') == 'FAILED' or (next_state and next_state.status == 'ERROR'):
            penalty = self.PENALTIES['campaign_failed']
            components['failed'] = penalty
            total_reward += penalty
            explanations.append(f"Campanha falhou: {penalty:+.1f}")
        
        return RewardResult(
            reward=total_reward,
            components=components,
            explanation=" | ".join(explanations) if explanations else "Sem reward específico"
        )
