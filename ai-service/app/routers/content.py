"""
Content Creator API Router
Endpoints para o Agente de Criação de Conteúdo Viral
"""
from fastapi import APIRouter, HTTPException, Header, Body, Query
from typing import Dict, Any, Optional, List
from pydantic import BaseModel

from app.services.copywriter_agent_service import get_copywriter_agent
from app.services.creators_storage import get_creators_storage
from app.services.transcription_service import get_transcription_service
from app.models.content_schemas import (
    ChatRequest, ChatResponse, CreatorCreate, CreatorResponse, CreatorListResponse,
    ViralSearchRequest, ViralSearchResponse, TranscribeRequest, TranscribeResponse,
    ContentAgentStep
)

router = APIRouter(prefix="/content", tags=["content"])


# ==================== CHAT ====================

class ChatRequestBody(BaseModel):
    message: str
    session_id: Optional[str] = None


@router.post("/chat", response_model=ChatResponse)
async def chat_with_agent(
    payload: ChatRequestBody,
    x_tenant_id: str = Header(..., alias="X-Tenant-ID"),
    x_user_id: str = Header(..., alias="X-User-ID")
):
    """
    Chat com o agente de criação de conteúdo.

    O agente guia o usuário através do fluxo:
    1. Pesquisa sobre o tema
    2. Seleção de criador para modelar
    3. Geração de hooks
    4. Escrita do roteiro final
    """
    try:
        agent = get_copywriter_agent()
        response = await agent.chat(
            tenant_id=x_tenant_id,
            user_id=x_user_id,
            message=payload.message,
            session_id=payload.session_id
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== SESSÕES ====================

@router.get("/sessions")
async def list_sessions(
    x_tenant_id: str = Header(..., alias="X-Tenant-ID"),
    x_user_id: str = Header(..., alias="X-User-ID"),
    limit: int = Query(20, ge=1, le=100)
):
    """Lista sessões de chat do usuário"""
    try:
        storage = get_creators_storage()
        sessions = await storage.list_user_sessions(x_tenant_id, x_user_id, limit)
        return {"sessions": sessions, "total": len(sessions)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions/{session_id}")
async def get_session(
    session_id: str,
    x_tenant_id: str = Header(..., alias="X-Tenant-ID")
):
    """Retorna detalhes de uma sessão de chat"""
    try:
        storage = get_creators_storage()
        session = await storage.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        return session
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== CRIADORES ====================

@router.get("/creators", response_model=CreatorListResponse)
async def list_creators(
    x_tenant_id: str = Header(..., alias="X-Tenant-ID")
):
    """Lista todos os criadores do tenant"""
    try:
        storage = get_creators_storage()
        creators = await storage.list_creators(x_tenant_id)
        return CreatorListResponse(
            creators=[CreatorResponse(**c) for c in creators],
            total=len(creators)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/creators/{creator_id}")
async def get_creator(
    creator_id: str,
    x_tenant_id: str = Header(..., alias="X-Tenant-ID")
):
    """Retorna detalhes de um criador"""
    try:
        storage = get_creators_storage()
        creator = await storage.get_creator(x_tenant_id, creator_id)
        if not creator:
            raise HTTPException(status_code=404, detail="Creator not found")
        return creator
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class CreateCreatorBody(BaseModel):
    name: str
    video_urls: List[str] = []


@router.post("/creators")
async def create_creator(
    payload: CreateCreatorBody,
    x_tenant_id: str = Header(..., alias="X-Tenant-ID")
):
    """
    Cria um novo criador.

    Se video_urls for fornecido, os vídeos serão transcritos automaticamente.
    """
    if not payload.name:
        raise HTTPException(status_code=400, detail="name is required")

    try:
        agent = get_copywriter_agent()
        result = await agent.add_creator(
            tenant_id=x_tenant_id,
            name=payload.name,
            video_urls=payload.video_urls
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class AddVideoBody(BaseModel):
    video_url: str


@router.post("/creators/{creator_id}/videos")
async def add_video_to_creator(
    creator_id: str,
    payload: AddVideoBody,
    x_tenant_id: str = Header(..., alias="X-Tenant-ID")
):
    """Adiciona um vídeo a um criador existente"""
    try:
        agent = get_copywriter_agent()
        result = await agent.add_video_to_creator(
            tenant_id=x_tenant_id,
            creator_id=creator_id,
            video_url=payload.video_url
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/creators/{creator_id}")
async def delete_creator(
    creator_id: str,
    x_tenant_id: str = Header(..., alias="X-Tenant-ID")
):
    """Deleta um criador"""
    try:
        storage = get_creators_storage()
        deleted = await storage.delete_creator(x_tenant_id, creator_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Creator not found")
        return {"success": True, "message": "Creator deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== BUSCA DE VÍDEOS VIRAIS ====================

class ViralSearchBody(BaseModel):
    topic: str
    platform: str = "youtube"  # youtube, tiktok, instagram
    period: str = "week"  # day, week, month, year
    limit: int = 10


@router.post("/search-viral")
async def search_viral_videos(
    payload: ViralSearchBody,
    x_tenant_id: str = Header(..., alias="X-Tenant-ID")
):
    """
    Busca vídeos virais sobre um tema.

    - platform: youtube, tiktok, instagram, all
    - period: day, week, month, year
    """
    try:
        service = get_transcription_service()
        videos = service.search_viral_videos(
            topic=payload.topic,
            platform=payload.platform,
            period=payload.period,
            limit=payload.limit
        )
        return {
            "videos": videos,
            "topic": payload.topic,
            "platform": payload.platform,
            "period": payload.period,
            "total": len(videos)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== TRANSCRIÇÃO ====================

class TranscribeBody(BaseModel):
    video_url: str


@router.post("/transcribe")
async def transcribe_video(
    payload: TranscribeBody,
    x_tenant_id: str = Header(..., alias="X-Tenant-ID")
):
    """
    Transcreve um vídeo.

    Suporta YouTube, TikTok, Instagram.
    Usa Groq Whisper v3 para transcrição rápida.
    """
    try:
        service = get_transcription_service()
        result = service.process_video(payload.video_url)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== ENDPOINTS LEGADOS (mantidos para compatibilidade) ====================

@router.post("/analyze-viral")
async def analyze_viral_legacy(
    payload: Dict[str, Any] = Body(...),
    x_tenant_id: Optional[str] = Header(None, alias="X-Tenant-ID")
):
    """
    [LEGADO] Analisa um vídeo viral (URL) e retorna sua estrutura.
    Use /transcribe para novos projetos.
    """
    video_url = payload.get("video_url")
    if not video_url:
        raise HTTPException(status_code=400, detail="video_url is required")

    try:
        service = get_transcription_service()
        result = service.process_video(video_url)
        return {
            "success": True,
            "transcription": result["transcription"],
            "video_info": {
                "title": result.get("video_title"),
                "duration": result.get("duration_seconds"),
                "platform": result.get("platform")
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-viral-script")
async def generate_viral_script_legacy(
    payload: Dict[str, Any] = Body(...),
    x_tenant_id: Optional[str] = Header(None, alias="X-Tenant-ID")
):
    """
    [LEGADO] Gera roteiro baseado em vídeo referência.
    Use /chat para novos projetos.
    """
    # Redireciona para o chat do agente
    video_url = payload.get("video_url")
    if not video_url:
        raise HTTPException(status_code=400, detail="video_url is required")

    return {
        "message": "Este endpoint foi descontinuado. Use POST /content/chat para interagir com o agente de criação de conteúdo.",
        "new_endpoint": "/content/chat"
    }


@router.post("/auto-discover-script")
async def auto_discover_script_legacy(
    payload: Dict[str, Any] = Body(...),
    x_tenant_id: Optional[str] = Header(None, alias="X-Tenant-ID")
):
    """
    [LEGADO] Busca vídeo viral e gera roteiro.
    Use /search-viral + /chat para novos projetos.
    """
    topic = payload.get("topic")
    if not topic:
        raise HTTPException(status_code=400, detail="topic is required")

    return {
        "message": "Este endpoint foi descontinuado. Use POST /content/search-viral para buscar vídeos e POST /content/chat para criar roteiros.",
        "new_endpoints": {
            "search": "/content/search-viral",
            "chat": "/content/chat"
        }
    }
