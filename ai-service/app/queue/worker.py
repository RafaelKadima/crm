"""
Worker que processa a fila de mensagens
Agrupa mensagens por cliente e envia ao agente
"""
import asyncio
from typing import Optional
import structlog
import httpx

from app.queue.message_queue import message_queue
from app.services.agent_service import agent_service
from app.models.schemas import (
    AgentRunRequest, LeadInfo, AgentConfig, TenantConfig,
    Message, MessageDirection, SenderType
)
from app.config import get_settings

logger = structlog.get_logger()
settings = get_settings()

# Intervalo de verificação da fila (segundos)
CHECK_INTERVAL = 1


class QueueWorker:
    """
    Worker que processa a fila de mensagens.
    
    Fluxo:
    1. A cada CHECK_INTERVAL, verifica tickets pendentes
    2. Para cada ticket, verifica se deve processar (tempo/intenção)
    3. Se sim, agrupa mensagens e envia ao agente
    4. Envia resposta de volta ao Laravel para despachar no WhatsApp
    """
    
    def __init__(self):
        self._running = False
        self._task: Optional[asyncio.Task] = None
    
    async def start(self):
        """Inicia o worker em background"""
        if self._running:
            return
        
        self._running = True
        self._task = asyncio.create_task(self._run_loop())
        logger.info("queue_worker_started")
    
    async def stop(self):
        """Para o worker"""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("queue_worker_stopped")
    
    async def _run_loop(self):
        """Loop principal do worker"""
        loop_count = 0
        while self._running:
            try:
                loop_count += 1
                if loop_count % 30 == 1:  # Log a cada 30 segundos
                    print(f"[WORKER] Loop #{loop_count}, checking queue...", flush=True)
                await self._process_pending()
            except Exception as e:
                print(f"[WORKER] Loop error: {e}", flush=True)
                logger.error("worker_loop_error", error=str(e))

            await asyncio.sleep(CHECK_INTERVAL)
    
    async def _process_pending(self):
        """Processa todos os tickets pendentes que estão prontos"""
        try:
            ticket_ids = await message_queue.get_all_pending_tickets()

            if ticket_ids:
                print(f"[WORKER] Found {len(ticket_ids)} pending tickets: {ticket_ids}", flush=True)

            for ticket_id in ticket_ids:
                try:
                    should = await message_queue.should_process(ticket_id)
                    print(f"[WORKER] Ticket {ticket_id} should_process={should}", flush=True)
                    if should:
                        await self._process_ticket(ticket_id)
                except Exception as e:
                    print(f"[WORKER] Error processing ticket {ticket_id}: {e}", flush=True)
                    logger.error("process_ticket_error",
                        ticket_id=ticket_id,
                        error=str(e)
                    )
        except Exception as e:
            print(f"[WORKER] Error getting pending tickets: {e}", flush=True)
            logger.error("get_pending_tickets_error", error=str(e))
    
    async def _process_ticket(self, ticket_id: str):
        """Processa as mensagens de um ticket"""
        # Busca as mensagens pendentes
        data = await message_queue.get_pending_messages(ticket_id)
        
        if not data:
            return
        
        logger.info("processing_ticket_messages",
            ticket_id=ticket_id,
            message_count=data["message_count"],
            combined_message=data["combined_message"][:100]
        )
        
        try:
            # Busca dados completos do lead/agent via Laravel API
            context = await self._fetch_context(data)
            
            if not context:
                logger.error("failed_to_fetch_context", ticket_id=ticket_id)
                return
            
            # Converte o dicionário para objeto AgentRunRequest
            request = AgentRunRequest(**context["request"])
            
            # Executa o agente
            response = await agent_service.run(request)
            
            # Envia resposta de volta ao Laravel
            # mode="json" converte datetime para ISO string automaticamente
            await self._send_response(
                ticket_id=ticket_id,
                lead_id=data["lead_id"],
                channel_id=data["channel_id"],
                response=response.model_dump(mode="json")
            )
            
            logger.info("ticket_processed_successfully",
                ticket_id=ticket_id,
                action=response.action.value
            )
            
        except Exception as e:
            logger.error("agent_processing_error",
                ticket_id=ticket_id,
                error=str(e)
            )
    
    async def _fetch_context(self, data: dict) -> Optional[dict]:
        """
        Busca o contexto completo do Laravel.
        Isso inclui dados do lead, agent, tenant, histórico, etc.
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{settings.LARAVEL_API_URL}/api/agent/context",
                    json={
                        "ticket_id": data["ticket_id"],
                        "lead_id": data["lead_id"],
                        "agent_id": data["agent_id"],
                        "tenant_id": data["tenant_id"],
                        "combined_message": data["combined_message"],
                        "message_count": data["message_count"],
                    },
                    headers={
                        "X-API-Key": settings.LARAVEL_API_KEY,
                        "Content-Type": "application/json"
                    },
                    timeout=30
                )
                
                if response.status_code == 200:
                    return response.json()
                else:
                    logger.error("fetch_context_failed",
                        status=response.status_code,
                        body=response.text
                    )
                    return None
                    
        except Exception as e:
            logger.error("fetch_context_error", error=str(e))
            return None
    
    async def _send_response(
        self,
        ticket_id: str,
        lead_id: str,
        channel_id: str,
        response: dict
    ):
        """Envia a resposta processada de volta ao Laravel"""
        try:
            async with httpx.AsyncClient() as client:
                result = await client.post(
                    f"{settings.LARAVEL_API_URL}/api/agent/response",
                    json={
                        "ticket_id": ticket_id,
                        "lead_id": lead_id,
                        "channel_id": channel_id,
                        "response": response
                    },
                    headers={
                        "X-API-Key": settings.LARAVEL_API_KEY,
                        "Content-Type": "application/json"
                    },
                    timeout=30
                )
                
                if result.status_code != 200:
                    logger.error("send_response_failed",
                        status=result.status_code,
                        body=result.text
                    )
                    
        except Exception as e:
            logger.error("send_response_error", error=str(e))


# Singleton
queue_worker = QueueWorker()

