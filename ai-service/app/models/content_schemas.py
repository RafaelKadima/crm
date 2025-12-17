"""
Schemas Pydantic para o Agente de Criação de Conteúdo
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum
from datetime import datetime


# ==================== ENUMS ====================

class ContentAgentStep(str, Enum):
    """Etapas do processo de criação de conteúdo"""
    IDLE = "idle"
    RESEARCH = "research"
    SELECT_CREATOR = "select_creator"
    GENERATE_HOOKS = "generate_hooks"
    WRITE_REEL = "write_reel"
    COMPLETED = "completed"


class ViralPlatform(str, Enum):
    """Plataformas para busca de vídeos virais"""
    YOUTUBE = "youtube"
    TIKTOK = "tiktok"
    INSTAGRAM = "instagram"
    ALL = "all"


class ViralPeriod(str, Enum):
    """Período para busca de vídeos virais"""
    DAY = "day"
    WEEK = "week"
    MONTH = "month"
    YEAR = "year"


# ==================== CREATOR MODELS ====================

class CreatorTranscription(BaseModel):
    """Uma transcrição de vídeo de um criador"""
    video_url: str
    video_title: Optional[str] = None
    transcription: str
    duration_seconds: Optional[int] = None
    platform: Optional[str] = None
    views: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.now)


class Creator(BaseModel):
    """Um criador de conteúdo"""
    id: Optional[str] = None
    tenant_id: str
    name: str
    transcriptions: List[CreatorTranscription] = []
    video_count: int = 0
    style_summary: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class CreatorCreate(BaseModel):
    """Request para criar um novo criador"""
    name: str
    video_urls: List[str] = []


class CreatorResponse(BaseModel):
    """Response com informações do criador"""
    id: str
    name: str
    video_count: int
    style_summary: Optional[str] = None
    created_at: datetime


class CreatorListResponse(BaseModel):
    """Response com lista de criadores"""
    creators: List[CreatorResponse]
    total: int


# ==================== CHAT MODELS ====================

class ChatMessage(BaseModel):
    """Mensagem do chat"""
    role: str  # user, assistant, system
    content: str
    step: Optional[ContentAgentStep] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=datetime.now)


class ChatRequest(BaseModel):
    """Request para chat com o agente"""
    message: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    """Response do chat"""
    message: str
    session_id: str
    current_step: ContentAgentStep
    requires_action: bool = False
    action_type: Optional[str] = None  # approve_research, select_creator, select_hook, approve_reel
    options: Optional[List[Dict[str, Any]]] = None
    final_content: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class ContentSession(BaseModel):
    """Sessão de criação de conteúdo"""
    id: str
    tenant_id: str
    user_id: str
    messages: List[ChatMessage] = []
    current_step: ContentAgentStep = ContentAgentStep.IDLE
    topic: Optional[str] = None
    research_data: Optional[Dict[str, Any]] = None
    selected_creator: Optional[str] = None
    generated_hooks: Optional[List[str]] = None
    selected_hook: Optional[str] = None
    final_reel: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


# ==================== VIRAL SEARCH MODELS ====================

class ViralVideo(BaseModel):
    """Um vídeo viral encontrado"""
    title: str
    url: str
    platform: str
    views: Optional[int] = None
    likes: Optional[int] = None
    duration: Optional[str] = None
    thumbnail: Optional[str] = None
    channel: Optional[str] = None
    published_at: Optional[str] = None


class ViralSearchRequest(BaseModel):
    """Request para busca de vídeos virais"""
    topic: str
    platform: ViralPlatform = ViralPlatform.ALL
    period: ViralPeriod = ViralPeriod.WEEK
    limit: int = 10


class ViralSearchResponse(BaseModel):
    """Response com vídeos virais encontrados"""
    videos: List[ViralVideo]
    topic: str
    platform: str
    period: str
    total: int


# ==================== TRANSCRIPTION MODELS ====================

class TranscribeRequest(BaseModel):
    """Request para transcrever um vídeo"""
    video_url: str


class TranscribeResponse(BaseModel):
    """Response da transcrição"""
    video_url: str
    video_title: Optional[str] = None
    transcription: str
    duration_seconds: Optional[int] = None
    language: Optional[str] = None


# ==================== RESEARCH MODELS ====================

class ResearchResult(BaseModel):
    """Resultado da pesquisa sobre um tópico"""
    topic: str
    facts: List[str]
    statistics: List[str]
    interesting_points: List[str]
    sources: List[str]
    summary: str


# ==================== HOOK GENERATION MODELS ====================

class HookGenerationRequest(BaseModel):
    """Request para gerar hooks"""
    topic: str
    creator_name: str
    research_data: Dict[str, Any]
    count: int = 10


class HookGenerationResponse(BaseModel):
    """Response com hooks gerados"""
    hooks: List[str]
    creator_style: str
    topic: str


# ==================== REEL GENERATION MODELS ====================

class ReelGenerationRequest(BaseModel):
    """Request para gerar roteiro de reel"""
    topic: str
    hook: str
    creator_name: str
    research_data: Dict[str, Any]
    target_words: int = 200


class ReelGenerationResponse(BaseModel):
    """Response com roteiro do reel"""
    script: str
    hook: str
    word_count: int
    estimated_duration_seconds: int
    creator_style: str


# ==================== SESSION HISTORY MODELS ====================

class SessionHistoryRequest(BaseModel):
    """Request para histórico de sessão"""
    session_id: str


class SessionHistoryResponse(BaseModel):
    """Response com histórico da sessão"""
    session_id: str
    messages: List[ChatMessage]
    current_step: ContentAgentStep
    topic: Optional[str]
    final_content: Optional[str]
    created_at: datetime
    updated_at: datetime
