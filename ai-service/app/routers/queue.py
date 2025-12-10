"""
Rotas para o sistema de fila de mensagens
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import structlog

from app.queue.message_queue import message_queue
from app.config import get_settings

logger = structlog.get_logger()
router = APIRouter(prefix="/queue", tags=["Queue"])
settings = get_settings()


class EnqueueRequest(BaseModel):
    """Request para enfileirar mensagem"""
    ticket_id: str
    message_id: str
    content: str
    lead_id: str
    tenant_id: str
    agent_id: str
    channel_id: str
    metadata: Optional[Dict[str, Any]] = None


class EnqueueResponse(BaseModel):
    """Response do enfileiramento"""
    status: str
    ticket_id: str
    queue_size: int
    is_end_intent: bool


class QueueStatusResponse(BaseModel):
    """Status da fila"""
    pending_tickets: int
    details: List[Dict[str, Any]]


@router.post("/enqueue", response_model=EnqueueResponse)
async def enqueue_message(request: EnqueueRequest):
    """
    Enfileira uma mensagem para processamento posterior.
    
    O sistema agrupa mensagens do mesmo ticket e processa quando:
    - Passar tempo máximo de espera (5s)
    - OU detectar fim de intenção (?, ok, sim, etc)
    - OU passar tempo mínimo desde última mensagem (3s)
    """
    try:
        result = await message_queue.enqueue(
            ticket_id=request.ticket_id,
            message_id=request.message_id,
            content=request.content,
            lead_id=request.lead_id,
            tenant_id=request.tenant_id,
            agent_id=request.agent_id,
            channel_id=request.channel_id,
            metadata=request.metadata
        )
        
        return EnqueueResponse(**result)
        
    except Exception as e:
        logger.error("enqueue_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status", response_model=QueueStatusResponse)
async def get_queue_status():
    """Retorna o status atual da fila"""
    try:
        status = await message_queue.get_queue_status()
        return QueueStatusResponse(**status)
    except Exception as e:
        logger.error("queue_status_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pending/{ticket_id}")
async def get_pending_messages(ticket_id: str):
    """Retorna mensagens pendentes de um ticket (debug)"""
    try:
        await message_queue.connect()
        
        queue_key = message_queue._get_queue_key(ticket_id)
        meta_key = message_queue._get_metadata_key(ticket_id)
        
        messages = await message_queue.redis.lrange(queue_key, 0, -1)
        meta = await message_queue.redis.hgetall(meta_key)
        
        return {
            "ticket_id": ticket_id,
            "messages": messages,
            "metadata": meta,
            "should_process": await message_queue.should_process(ticket_id)
        }
    except Exception as e:
        logger.error("get_pending_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/process/{ticket_id}")
async def force_process_ticket(ticket_id: str):
    """Força o processamento de um ticket (debug)"""
    try:
        data = await message_queue.get_pending_messages(ticket_id)
        
        if not data:
            return {"status": "empty", "message": "No pending messages"}
        
        return {
            "status": "processed",
            "data": data
        }
    except Exception as e:
        logger.error("force_process_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

