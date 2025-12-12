"""
Definição dos Estados para Reinforcement Learning.

Estados representam o que o agente "observa" do ambiente.
Cada tipo de agente tem seu próprio formato de estado.
"""
from dataclasses import dataclass, asdict
from typing import Optional, List, Dict, Any
import numpy as np


@dataclass
class SDRState:
    """
    Estado observado pelo SDR Agent.
    
    Representa a situação atual de uma conversa com um lead.
    """
    # Identificadores
    lead_id: str
    tenant_id: str
    
    # Score e qualificação
    lead_score: float = 0.0           # 0-100 (probabilidade de conversão)
    temperature: str = 'unknown'       # hot, warm, cold, unknown
    
    # Estágio no funil
    stage_index: int = 0              # 0-N (índice do estágio)
    stage_name: str = ''
    
    # Intenção detectada
    intent: str = 'unclear'           # greeting, question, objection, etc.
    intent_confidence: float = 0.0    # 0-1
    
    # Métricas de conversa
    num_messages: int = 0             # Total de mensagens na conversa
    num_lead_messages: int = 0        # Mensagens enviadas pelo lead
    time_since_last_msg: int = 0      # Segundos desde última mensagem
    avg_response_time: float = 0.0    # Tempo médio de resposta em segundos
    
    # Sentimento e objeções
    sentiment: float = 0.0            # -1 (negativo) a 1 (positivo)
    has_objection: bool = False
    objection_count: int = 0
    
    # Qualificação BANT
    budget_mentioned: bool = False
    timeline_mentioned: bool = False
    decision_maker: bool = False
    
    # Contexto RAG
    rag_context_relevance: float = 0.0  # 0-1
    
    def to_vector(self) -> np.ndarray:
        """Converte estado para vetor numérico (para modelos ML)."""
        # Encoding de campos categóricos
        temperature_map = {'hot': 3, 'warm': 2, 'cold': 1, 'unknown': 0}
        intent_map = {
            'greeting': 0, 'question_product': 1, 'question_price': 2,
            'objection': 3, 'interest': 4, 'scheduling': 5,
            'complaint': 6, 'support': 7, 'goodbye': 8, 'unclear': 9
        }
        
        return np.array([
            self.lead_score / 100,  # Normalizado 0-1
            temperature_map.get(self.temperature, 0) / 3,
            min(self.stage_index / 10, 1),  # Assume máx 10 estágios
            intent_map.get(self.intent, 9) / 9,
            self.intent_confidence,
            min(self.num_messages / 50, 1),  # Normaliza até 50 msgs
            min(self.time_since_last_msg / 86400, 1),  # Normaliza até 1 dia
            min(self.avg_response_time / 3600, 1),  # Normaliza até 1 hora
            (self.sentiment + 1) / 2,  # Normaliza -1,1 para 0,1
            float(self.has_objection),
            min(self.objection_count / 5, 1),
            float(self.budget_mentioned),
            float(self.timeline_mentioned),
            float(self.decision_maker),
            self.rag_context_relevance,
        ], dtype=np.float32)
    
    def to_dict(self) -> Dict[str, Any]:
        """Converte para dicionário (para serialização)."""
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'SDRState':
        """Cria estado a partir de dicionário."""
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class AdsState:
    """
    Estado observado pelo Ads Agent.
    
    Representa a situação atual de uma campanha ou ação de marketing.
    """
    # Identificadores
    campaign_id: str
    tenant_id: str
    
    # Configuração da campanha
    objective: str = ''               # OUTCOME_SALES, OUTCOME_LEADS, etc.
    objective_index: int = 0          # Encoded
    daily_budget: float = 0.0         # Budget em reais
    budget_normalized: float = 0.0    # 0-1 (relativo ao limite do tenant)
    
    # Tipo de criativo
    creative_type: str = 'image'      # image, video, carousel
    creative_type_index: int = 0      # Encoded
    
    # Métricas de performance
    impressions: int = 0
    clicks: int = 0
    conversions: int = 0
    spend: float = 0.0
    
    # KPIs calculados
    current_ctr: float = 0.0          # Click-through rate
    current_cpc: float = 0.0          # Cost per click
    current_cpa: float = 0.0          # Cost per acquisition
    current_roas: float = 0.0         # Return on ad spend
    
    # Tempo
    days_running: int = 0             # Dias desde criação
    hours_since_update: int = 0       # Horas desde última atualização
    
    # Histórico
    historical_ctr_avg: float = 0.0   # CTR médio histórico do tenant
    historical_roas_avg: float = 0.0  # ROAS médio histórico do tenant
    
    # Status
    status: str = 'PAUSED'            # PAUSED, ACTIVE, etc.
    is_learning: bool = True          # Em fase de aprendizado
    
    def to_vector(self) -> np.ndarray:
        """Converte estado para vetor numérico (para modelos ML)."""
        objective_map = {
            'OUTCOME_SALES': 0, 'OUTCOME_LEADS': 1, 'OUTCOME_AWARENESS': 2,
            'OUTCOME_TRAFFIC': 3, 'OUTCOME_ENGAGEMENT': 4
        }
        creative_map = {'image': 0, 'video': 1, 'carousel': 2}
        
        return np.array([
            objective_map.get(self.objective, 0) / 4,
            self.budget_normalized,
            creative_map.get(self.creative_type, 0) / 2,
            min(self.current_ctr / 5, 1),  # Normaliza até 5%
            min(self.current_roas / 5, 1),  # Normaliza até 5x
            min(self.current_cpa / 100, 1) if self.current_cpa else 0,  # Normaliza até R$100
            min(self.days_running / 30, 1),  # Normaliza até 30 dias
            float(self.is_learning),
            min(self.conversions / 100, 1),  # Normaliza até 100 conversões
            self.historical_roas_avg / 5 if self.historical_roas_avg else 0,
        ], dtype=np.float32)
    
    def to_dict(self) -> Dict[str, Any]:
        """Converte para dicionário (para serialização)."""
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'AdsState':
        """Cria estado a partir de dicionário."""
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})
