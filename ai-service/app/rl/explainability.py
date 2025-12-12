"""
Explainability para Reinforcement Learning.

Gera explicações em linguagem natural para as decisões dos agentes.
Aumenta a confiança do usuário e facilita debug.
"""
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
import structlog

from app.rl.states import SDRState, AdsState
from app.rl.actions import SDRAction, AdsAction
from app.rl.policy_engine import PolicyMode

logger = structlog.get_logger()


@dataclass
class ActionExplanation:
    """Explicação de uma ação."""
    action: str
    action_description: str
    reasons: List[str]
    confidence: float
    policy_mode: str
    contributing_factors: Dict[str, Any]
    alternative_actions: List[Dict[str, Any]]


class ActionExplainer:
    """
    Gera explicações para ações dos agentes.
    
    Explica POR QUE uma ação foi escolhida baseado no estado.
    """
    
    def explain_sdr_action(
        self,
        state: SDRState,
        action: SDRAction,
        confidence: float,
        policy_mode: PolicyMode
    ) -> ActionExplanation:
        """
        Gera explicação para uma ação do SDR Agent.
        """
        reasons = []
        factors = {}
        
        # Descrições das ações
        descriptions = SDRAction.get_descriptions()
        action_description = descriptions.get(action, "Ação do agente")
        
        # Identifica razões baseadas no estado e ação
        if action == SDRAction.SCHEDULE:
            reasons, factors = self._explain_sdr_schedule(state)
        elif action == SDRAction.QUALIFY:
            reasons, factors = self._explain_sdr_qualify(state)
        elif action == SDRAction.ESCALATE:
            reasons, factors = self._explain_sdr_escalate(state)
        elif action == SDRAction.HANDLE_OBJECTION:
            reasons, factors = self._explain_sdr_handle_objection(state)
        elif action == SDRAction.SEND_CONTENT:
            reasons, factors = self._explain_sdr_send_content(state)
        elif action == SDRAction.WAIT:
            reasons, factors = self._explain_sdr_wait(state)
        elif action == SDRAction.OFFER_DISCOUNT:
            reasons, factors = self._explain_sdr_offer_discount(state)
        else:
            reasons = ["Resposta padrão do agente"]
            factors = {"default": True}
        
        # Adiciona contexto do modo de política
        if policy_mode == PolicyMode.RULE_BASED:
            reasons.append("Decisão baseada em regras pré-definidas")
        elif policy_mode == PolicyMode.BANDIT:
            reasons.append("Decisão baseada em aprendizado exploratório")
        else:
            reasons.append("Decisão baseada em modelo neural treinado")
        
        # Identifica ações alternativas
        alternatives = self._get_sdr_alternatives(state, action)
        
        return ActionExplanation(
            action=action.name,
            action_description=action_description,
            reasons=reasons,
            confidence=confidence,
            policy_mode=policy_mode.value,
            contributing_factors=factors,
            alternative_actions=alternatives
        )
    
    def _explain_sdr_schedule(self, state: SDRState) -> tuple:
        """Explica decisão de agendamento."""
        reasons = []
        factors = {}
        
        if state.lead_score > 70:
            reasons.append(f"Lead score alto ({state.lead_score:.0f}/100)")
            factors['lead_score'] = state.lead_score
        
        if state.temperature == 'hot':
            reasons.append("Lead classificado como 'quente'")
            factors['temperature'] = state.temperature
        
        if state.intent == 'scheduling':
            reasons.append("Intenção de agendamento detectada na mensagem")
            factors['intent'] = state.intent
        
        if state.decision_maker:
            reasons.append("Lead é o tomador de decisão")
            factors['decision_maker'] = True
        
        if state.budget_mentioned:
            reasons.append("Orçamento já foi mencionado")
            factors['budget_mentioned'] = True
        
        if not state.has_objection:
            reasons.append("Sem objeções pendentes")
            factors['no_objection'] = True
        
        return reasons, factors
    
    def _explain_sdr_qualify(self, state: SDRState) -> tuple:
        """Explica decisão de qualificação."""
        reasons = []
        factors = {}
        
        if state.stage_index < 3:
            reasons.append(f"Lead ainda no início do funil (estágio {state.stage_index})")
            factors['early_stage'] = True
        
        if not state.budget_mentioned:
            reasons.append("Orçamento ainda não mencionado - precisa qualificar")
            factors['budget_missing'] = True
        
        if not state.timeline_mentioned:
            reasons.append("Prazo ainda não mencionado - precisa qualificar")
            factors['timeline_missing'] = True
        
        if not state.decision_maker:
            reasons.append("Não confirmado se é decisor - precisa qualificar")
            factors['decision_maker_unknown'] = True
        
        if state.num_messages < 5:
            reasons.append("Conversa ainda recente - fase de qualificação")
            factors['early_conversation'] = True
        
        return reasons, factors
    
    def _explain_sdr_escalate(self, state: SDRState) -> tuple:
        """Explica decisão de escalação."""
        reasons = []
        factors = {}
        
        if state.objection_count > 3:
            reasons.append(f"Muitas objeções ({state.objection_count}) - melhor um humano tratar")
            factors['high_objections'] = state.objection_count
        
        if state.sentiment < -0.5:
            reasons.append(f"Sentimento muito negativo ({state.sentiment:.2f})")
            factors['negative_sentiment'] = state.sentiment
        
        if state.lead_score > 70 and state.num_messages > 10:
            reasons.append("Lead quente com muitas interações - melhor um vendedor fechar")
            factors['hot_lead_many_messages'] = True
        
        if state.intent == 'complaint':
            reasons.append("Lead expressou reclamação - requer atenção humana")
            factors['complaint'] = True
        
        return reasons, factors
    
    def _explain_sdr_handle_objection(self, state: SDRState) -> tuple:
        """Explica decisão de tratar objeção."""
        reasons = []
        factors = {}
        
        if state.has_objection:
            reasons.append("Objeção detectada na conversa")
            factors['has_objection'] = True
        
        if state.intent == 'objection':
            reasons.append("Última mensagem contém objeção")
            factors['objection_intent'] = True
        
        reasons.append("Tratar objeção antes de prosseguir aumenta chances de conversão")
        
        return reasons, factors
    
    def _explain_sdr_send_content(self, state: SDRState) -> tuple:
        """Explica decisão de enviar conteúdo."""
        reasons = []
        factors = {}
        
        if state.temperature == 'cold':
            reasons.append("Lead frio - conteúdo educativo pode aquecer")
            factors['cold_lead'] = True
        
        if state.intent in ['question_product', 'question_price']:
            reasons.append("Lead demonstrou interesse em informações")
            factors['information_seeking'] = True
        
        if state.sentiment < 0:
            reasons.append("Sentimento neutro/negativo - conteúdo pode engajar")
            factors['low_sentiment'] = state.sentiment
        
        return reasons, factors
    
    def _explain_sdr_wait(self, state: SDRState) -> tuple:
        """Explica decisão de aguardar."""
        reasons = []
        factors = {}
        
        if state.time_since_last_msg < 60:
            reasons.append("Mensagem muito recente - aguardar resposta")
            factors['recent_message'] = True
        
        if state.time_since_last_msg > 86400:
            reasons.append("Lead não responde há muito tempo - aguardar momento melhor")
            factors['long_silence'] = True
        
        return reasons, factors
    
    def _explain_sdr_offer_discount(self, state: SDRState) -> tuple:
        """Explica decisão de oferecer desconto."""
        reasons = []
        factors = {}
        
        if state.intent == 'question_price':
            reasons.append("Lead perguntou sobre preço - oportunidade de oferta")
            factors['price_question'] = True
        
        if state.has_objection and state.lead_score > 50:
            reasons.append("Lead qualificado com objeção - desconto pode converter")
            factors['qualified_with_objection'] = True
        
        return reasons, factors
    
    def _get_sdr_alternatives(
        self,
        state: SDRState,
        chosen_action: SDRAction
    ) -> List[Dict[str, Any]]:
        """Retorna ações alternativas que poderiam ser tomadas."""
        alternatives = []
        
        # Sempre considerar resposta normal como alternativa
        if chosen_action != SDRAction.RESPOND_NORMAL:
            alternatives.append({
                'action': 'RESPOND_NORMAL',
                'reason': 'Responder normalmente sem ação específica'
            })
        
        # Se não agendou, mencionar como possibilidade se score alto
        if chosen_action != SDRAction.SCHEDULE and state.lead_score > 60:
            alternatives.append({
                'action': 'SCHEDULE',
                'reason': f'Score ({state.lead_score:.0f}) permite considerar agendamento'
            })
        
        # Se não qualificou, mencionar se falta info
        if chosen_action != SDRAction.QUALIFY and not state.budget_mentioned:
            alternatives.append({
                'action': 'QUALIFY',
                'reason': 'Orçamento ainda não mencionado'
            })
        
        return alternatives[:3]  # Max 3 alternativas
    
    def explain_ads_action(
        self,
        state: AdsState,
        action: AdsAction,
        confidence: float,
        policy_mode: PolicyMode
    ) -> ActionExplanation:
        """
        Gera explicação para uma ação do Ads Agent.
        """
        reasons = []
        factors = {}
        
        descriptions = AdsAction.get_descriptions()
        action_description = descriptions.get(action, "Ação de campanha")
        
        # Identifica razões baseadas no estado e ação
        if action == AdsAction.INCREASE_BUDGET:
            reasons, factors = self._explain_ads_increase_budget(state)
        elif action == AdsAction.DECREASE_BUDGET:
            reasons, factors = self._explain_ads_decrease_budget(state)
        elif action == AdsAction.PAUSE:
            reasons, factors = self._explain_ads_pause(state)
        elif action == AdsAction.DUPLICATE:
            reasons, factors = self._explain_ads_duplicate(state)
        elif action == AdsAction.KEEP_RUNNING:
            reasons, factors = self._explain_ads_keep_running(state)
        else:
            reasons = ["Ação de otimização padrão"]
            factors = {"default": True}
        
        # Adiciona contexto do modo
        if policy_mode == PolicyMode.RULE_BASED:
            reasons.append("Decisão baseada em regras de performance")
        elif policy_mode == PolicyMode.BANDIT:
            reasons.append("Decisão baseada em experimentos anteriores")
        else:
            reasons.append("Decisão baseada em modelo preditivo")
        
        alternatives = self._get_ads_alternatives(state, action)
        
        return ActionExplanation(
            action=action.name,
            action_description=action_description,
            reasons=reasons,
            confidence=confidence,
            policy_mode=policy_mode.value,
            contributing_factors=factors,
            alternative_actions=alternatives
        )
    
    def _explain_ads_increase_budget(self, state: AdsState) -> tuple:
        """Explica aumento de budget."""
        reasons = []
        factors = {}
        
        if state.current_roas > 2:
            reasons.append(f"ROAS excelente ({state.current_roas:.2f}x) - campanha escalável")
            factors['high_roas'] = state.current_roas
        
        if state.days_running >= 7:
            reasons.append(f"Campanha rodando há {state.days_running} dias - dados estáveis")
            factors['mature_campaign'] = True
        
        if state.conversions > 10:
            reasons.append(f"{state.conversions} conversões - volume consistente")
            factors['good_conversions'] = state.conversions
        
        if state.current_ctr > state.historical_ctr_avg:
            reasons.append("CTR acima da média histórica")
            factors['above_avg_ctr'] = True
        
        return reasons, factors
    
    def _explain_ads_decrease_budget(self, state: AdsState) -> tuple:
        """Explica diminuição de budget."""
        reasons = []
        factors = {}
        
        if state.current_roas < 1.5:
            reasons.append(f"ROAS baixo ({state.current_roas:.2f}x) - otimizar gastos")
            factors['low_roas'] = state.current_roas
        
        if state.current_cpa > 50:
            reasons.append(f"CPA alto (R$ {state.current_cpa:.2f}) - reduzir para otimizar")
            factors['high_cpa'] = state.current_cpa
        
        return reasons, factors
    
    def _explain_ads_pause(self, state: AdsState) -> tuple:
        """Explica pausa de campanha."""
        reasons = []
        factors = {}
        
        if state.current_roas < 0.5:
            reasons.append(f"ROAS muito baixo ({state.current_roas:.2f}x) - parar para evitar prejuízo")
            factors['very_low_roas'] = state.current_roas
        
        if state.conversions == 0 and state.days_running > 5:
            reasons.append("Zero conversões após 5 dias - campanha não está convertendo")
            factors['no_conversions'] = True
        
        return reasons, factors
    
    def _explain_ads_duplicate(self, state: AdsState) -> tuple:
        """Explica duplicação de campanha."""
        reasons = []
        factors = {}
        
        if state.current_roas > 3:
            reasons.append(f"ROAS excepcional ({state.current_roas:.2f}x) - vale escalar")
            factors['exceptional_roas'] = state.current_roas
        
        if state.conversions > 20:
            reasons.append(f"Alto volume de conversões ({state.conversions}) - público validado")
            factors['high_volume'] = state.conversions
        
        return reasons, factors
    
    def _explain_ads_keep_running(self, state: AdsState) -> tuple:
        """Explica manter campanha."""
        reasons = []
        factors = {}
        
        if state.is_learning:
            reasons.append("Campanha em fase de aprendizado - aguardar")
            factors['learning_phase'] = True
        
        if 1 <= state.current_roas <= 2:
            reasons.append(f"ROAS positivo ({state.current_roas:.2f}x) - manter monitorando")
            factors['positive_roas'] = state.current_roas
        
        if state.days_running < 3:
            reasons.append("Campanha recente - aguardar mais dados")
            factors['new_campaign'] = True
        
        return reasons, factors
    
    def _get_ads_alternatives(
        self,
        state: AdsState,
        chosen_action: AdsAction
    ) -> List[Dict[str, Any]]:
        """Retorna ações alternativas."""
        alternatives = []
        
        if chosen_action != AdsAction.KEEP_RUNNING:
            alternatives.append({
                'action': 'KEEP_RUNNING',
                'reason': 'Manter sem alterações e monitorar'
            })
        
        if chosen_action != AdsAction.DECREASE_BUDGET and state.current_roas < 2:
            alternatives.append({
                'action': 'DECREASE_BUDGET',
                'reason': 'Reduzir budget para otimizar ROAS'
            })
        
        return alternatives[:3]


# Singleton
action_explainer = ActionExplainer()


def get_action_explainer() -> ActionExplainer:
    """Retorna instância singleton do explainer."""
    return action_explainer
