"""
Definição das Ações para Reinforcement Learning.

Ações representam o que o agente pode fazer em cada estado.
Cada tipo de agente tem seu próprio conjunto de ações.
"""
from enum import Enum, IntEnum
from typing import List, Dict, Any


class SDRAction(IntEnum):
    """
    Ações disponíveis para o SDR Agent.
    
    Cada ação representa uma estratégia de resposta ao lead.
    """
    RESPOND_NORMAL = 0      # Responder normalmente à mensagem
    QUALIFY = 1             # Fazer pergunta de qualificação (BANT)
    SCHEDULE = 2            # Propor agendamento de reunião/demo
    ESCALATE = 3            # Transferir para atendente humano
    SEND_CONTENT = 4        # Enviar material educativo/conteúdo
    WAIT = 5                # Aguardar (não responder imediatamente)
    HANDLE_OBJECTION = 6    # Tratar objeção identificada
    OFFER_DISCOUNT = 7      # Oferecer desconto/promoção
    
    @classmethod
    def get_descriptions(cls) -> Dict[int, str]:
        """Retorna descrições das ações."""
        return {
            cls.RESPOND_NORMAL: "Responder normalmente à mensagem do lead",
            cls.QUALIFY: "Fazer pergunta de qualificação (orçamento, prazo, decisão)",
            cls.SCHEDULE: "Propor agendamento de reunião ou demonstração",
            cls.ESCALATE: "Transferir conversa para atendente humano",
            cls.SEND_CONTENT: "Enviar material educativo ou conteúdo relevante",
            cls.WAIT: "Aguardar resposta do lead sem enviar mensagem",
            cls.HANDLE_OBJECTION: "Tratar objeção ou preocupação do lead",
            cls.OFFER_DISCOUNT: "Oferecer desconto ou condição especial",
        }
    
    @classmethod
    def get_all(cls) -> List['SDRAction']:
        """Retorna todas as ações disponíveis."""
        return list(cls)


class AdsAction(IntEnum):
    """
    Ações disponíveis para o Ads Agent.
    
    Cada ação representa uma operação sobre campanhas.
    """
    KEEP_RUNNING = 0        # Manter campanha como está
    INCREASE_BUDGET = 1     # Aumentar orçamento
    DECREASE_BUDGET = 2     # Diminuir orçamento
    PAUSE = 3               # Pausar campanha
    ACTIVATE = 4            # Ativar campanha pausada
    DUPLICATE = 5           # Duplicar campanha para escalar
    CHANGE_CREATIVE = 6     # Sugerir mudança de criativo
    CHANGE_AUDIENCE = 7     # Sugerir mudança de público
    OPTIMIZE_BID = 8        # Otimizar estratégia de lance
    
    @classmethod
    def get_descriptions(cls) -> Dict[int, str]:
        """Retorna descrições das ações."""
        return {
            cls.KEEP_RUNNING: "Manter campanha rodando sem alterações",
            cls.INCREASE_BUDGET: "Aumentar orçamento diário da campanha",
            cls.DECREASE_BUDGET: "Diminuir orçamento diário da campanha",
            cls.PAUSE: "Pausar campanha temporariamente",
            cls.ACTIVATE: "Ativar campanha que está pausada",
            cls.DUPLICATE: "Duplicar campanha para escalar resultados",
            cls.CHANGE_CREATIVE: "Sugerir mudança de criativo/imagem/vídeo",
            cls.CHANGE_AUDIENCE: "Sugerir mudança de público-alvo",
            cls.OPTIMIZE_BID: "Otimizar estratégia de lance",
        }
    
    @classmethod
    def get_all(cls) -> List['AdsAction']:
        """Retorna todas as ações disponíveis."""
        return list(cls)
    
    @classmethod
    def get_high_risk_actions(cls) -> List['AdsAction']:
        """Retorna ações de alto risco que precisam de validação extra."""
        return [
            cls.INCREASE_BUDGET,
            cls.DUPLICATE,
            cls.ACTIVATE,
        ]
    
    @classmethod
    def get_safe_actions(cls) -> List['AdsAction']:
        """Retorna ações consideradas seguras."""
        return [
            cls.KEEP_RUNNING,
            cls.DECREASE_BUDGET,
            cls.PAUSE,
        ]
