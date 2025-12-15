"""
Schemas Pydantic para requisições e respostas da API
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum
from datetime import datetime


# ==================== ENUMS ====================

class LeadTemperature(str, Enum):
    HOT = "hot"
    WARM = "warm"
    COLD = "cold"
    UNKNOWN = "unknown"


class AgentAction(str, Enum):
    SEND_MESSAGE = "send_message"
    MOVE_STAGE = "move_stage"
    QUALIFY_LEAD = "qualify_lead"
    CHECK_AVAILABILITY = "check_availability"
    SCHEDULE_MEETING = "schedule_meeting"
    FINALIZE_AND_ASSIGN = "finalize_and_assign"
    TRANSFER_TO_HUMAN = "transfer_to_human"
    REQUEST_INFO = "request_info"
    FOLLOW_UP = "follow_up"
    END_CONVERSATION = "end_conversation"
    NO_ACTION = "no_action"


class MessageDirection(str, Enum):
    INBOUND = "inbound"
    OUTBOUND = "outbound"


class SenderType(str, Enum):
    CONTACT = "contact"
    USER = "user"
    IA = "ia"


# ==================== REQUEST MODELS ====================

class Message(BaseModel):
    """Mensagem do histórico"""
    id: str
    content: str
    direction: MessageDirection
    sender_type: SenderType
    created_at: datetime
    metadata: Optional[Dict[str, Any]] = None


class LeadInfo(BaseModel):
    """Informações do lead"""
    id: str
    name: str
    phone: str
    email: Optional[str] = None
    stage_id: Optional[str] = None
    stage_name: Optional[str] = None
    queue_id: Optional[str] = None
    queue_name: Optional[str] = None
    value: Optional[float] = 0
    custom_fields: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None


class AgentConfig(BaseModel):
    """Configuração do agente SDR"""
    id: str
    name: str
    prompt: str
    temperature: float = 0.7
    ai_model: str = "gpt-4o-mini"
    ai_model: str = "gpt-4o-mini"
    max_tokens: int = 1000
    type: str = "sdr"  # sdr, support
    
    # Comportamento
    auto_qualify: bool = True
    auto_move_stage: bool = True
    transfer_on_complex: bool = True
    
    # Restrições
    forbidden_topics: List[str] = []
    required_qualifications: List[str] = []
    
    # Personalidade
    tone: str = "professional"  # professional, friendly, casual
    language: str = "pt-BR"


class TenantConfig(BaseModel):
    """Configuração do tenant"""
    id: str
    name: str
    timezone: str = "America/Sao_Paulo"
    business_hours: Optional[Dict[str, Any]] = None
    products: List[Dict[str, Any]] = []
    stages: List[Dict[str, Any]] = []


class AgentRunRequest(BaseModel):
    """Requisição para executar o agente"""
    # Mensagem atual
    message: str
    message_id: str
    message_type: str = "text"  # text, audio, image
    
    # Contexto
    lead: LeadInfo
    agent: AgentConfig
    tenant: TenantConfig
    
    # Histórico (memória curta)
    history: List[Message] = []
    
    # Metadados
    channel_id: str
    ticket_id: str
    
    # Flags
    include_rag: bool = True
    include_long_memory: bool = True


# ==================== RESPONSE MODELS ====================

class Qualification(BaseModel):
    """Resultado da qualificação do lead"""
    temperature: LeadTemperature = LeadTemperature.UNKNOWN
    score: float = 0.0  # 0-100
    pain_points: List[str] = []
    interests: List[str] = []
    objections: List[str] = []
    budget_mentioned: bool = False
    timeline_mentioned: bool = False
    decision_maker: bool = False
    product_interest: Optional[str] = None


class Intent(BaseModel):
    """Intenção detectada"""
    name: str
    confidence: float
    entities: Dict[str, Any] = {}


class AgentDecision(BaseModel):
    """Decisão tomada pelo agente"""
    action: AgentAction
    confidence: float
    reasoning: str


class StageChange(BaseModel):
    """Mudança de estágio sugerida"""
    from_stage: Optional[str] = None
    to_stage: str
    reason: str


class AppointmentRequest(BaseModel):
    """Dados do agendamento"""
    type: str = "meeting"  # meeting, visit, demo, follow_up, other
    scheduled_at: datetime
    duration_minutes: int = 30
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None


class AgentRunResponse(BaseModel):
    """Resposta da execução do agente"""
    # Ação principal
    action: AgentAction
    
    # Mensagem (se action == send_message)
    message: Optional[str] = None
    
    # Qualificação
    qualification: Optional[Qualification] = None
    
    # Intenção detectada
    intent: Optional[Intent] = None
    
    # Decisão
    decision: AgentDecision
    
    # Mudança de estágio (se action == move_stage)
    stage_change: Optional[StageChange] = None
    
    # Agendamento (se action == schedule_meeting)
    appointment: Optional[AppointmentRequest] = None
    
    # Contexto usado
    context_used: Dict[str, Any] = {}
    
    # Métricas
    metrics: Dict[str, Any] = {}
    
    # Próximas ações sugeridas
    suggested_next_actions: List[str] = []
    
    # Flags
    requires_human: bool = False
    follow_up_needed: bool = False
    follow_up_time: Optional[datetime] = None
    
    # Novas flags para agendamento e distribuição
    needs_availability_check: bool = False  # Precisa consultar disponibilidade
    needs_assignment: bool = False  # Precisa distribuir para vendedor
    sdr_outcome: Optional[str] = None  # Resultado do SDR: scheduled, not_interested, qualified, need_nurturing
    sdr_notes: Optional[str] = None  # Observações do SDR


# ==================== MEMORY MODELS ====================

class ShortTermMemory(BaseModel):
    """Memória de curto prazo"""
    lead_id: str
    messages: List[Message]
    last_intent: Optional[str] = None
    last_action: Optional[AgentAction] = None
    context_summary: Optional[str] = None
    updated_at: datetime


class LongTermMemory(BaseModel):
    """Memória de longo prazo"""
    lead_id: str
    behavior_patterns: List[str] = []
    preferences: Dict[str, Any] = {}
    purchase_history: List[Dict[str, Any]] = []
    interaction_style: str = "unknown"
    key_insights: List[str] = []
    embedding_ids: List[str] = []


# ==================== RAG MODELS ====================

class KnowledgeChunk(BaseModel):
    """Chunk de conhecimento do RAG"""
    id: str
    content: str
    source: str  # document, faq, product, etc.
    similarity: float
    metadata: Dict[str, Any] = {}


class RAGResult(BaseModel):
    """Resultado da busca RAG"""
    chunks: List[KnowledgeChunk]
    query: str
    total_tokens: int


# ==================== ML MODELS ====================

class LeadPrediction(BaseModel):
    """Predição sobre o lead"""
    conversion_probability: float
    churn_risk: float
    engagement_score: float
    recommended_actions: List[str]
    best_contact_time: Optional[str] = None


class IntentClassification(BaseModel):
    """Classificação de intenção"""
    intent: str
    confidence: float
    alternatives: List[Dict[str, float]] = []

