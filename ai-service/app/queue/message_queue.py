"""
Sistema de Fila de Mensagens com Redis
Agrupa mensagens por cliente antes de processar
"""
import asyncio
import json
import time
from typing import Optional, Dict, Any, List
from datetime import datetime
import structlog
import redis.asyncio as redis

from app.config import get_settings

logger = structlog.get_logger()
settings = get_settings()

# Padrões de fim de intenção
END_INTENT_PATTERNS = [
    '?', '.', '!',
    'ok', 'okay', 'beleza', 'certo', 'entendi',
    'sim', 'não', 'nao', 'yes', 'no',
    'pode ser', 'fechado', 'combinado',
    'obrigado', 'obrigada', 'valeu', 'vlw',
    'confirma', 'confirmado', 'confirmo'
]

# Tempo máximo de espera (segundos)
MAX_WAIT_TIME = 5

# Tempo mínimo entre mensagens para considerar "fim" (segundos)
MIN_GAP_TIME = 3


class MessageQueue:
    """
    Fila de mensagens que agrupa por cliente antes de processar.
    
    Estratégia:
    1. Mensagem chega → enfileira no Redis
    2. Worker verifica a cada 1s
    3. Processa quando:
       - Passou MAX_WAIT_TIME desde primeira mensagem
       - OU última mensagem tem padrão de fim de intenção
       - OU passou MIN_GAP_TIME desde última mensagem
    """
    
    def __init__(self):
        self.redis: Optional[redis.Redis] = None
        self._connected = False
    
    async def connect(self):
        """Conecta ao Redis"""
        if self._connected:
            return
        
        try:
            self.redis = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                password=settings.REDIS_PASSWORD or None,
                db=settings.REDIS_DB,
                decode_responses=True
            )
            await self.redis.ping()
            self._connected = True
            logger.info("redis_connected", host=settings.REDIS_HOST)
        except Exception as e:
            logger.error("redis_connection_failed", error=str(e))
            raise
    
    async def disconnect(self):
        """Desconecta do Redis"""
        if self.redis:
            await self.redis.close()
            self._connected = False
    
    def _get_queue_key(self, ticket_id: str) -> str:
        """Retorna a chave da fila para um ticket"""
        return f"msg_queue:{ticket_id}"
    
    def _get_metadata_key(self, ticket_id: str) -> str:
        """Retorna a chave de metadata para um ticket"""
        return f"msg_meta:{ticket_id}"
    
    def _is_end_intent(self, message: str) -> bool:
        """Verifica se a mensagem indica fim de intenção"""
        message_lower = message.lower().strip()
        
        # Verifica padrões exatos
        for pattern in END_INTENT_PATTERNS:
            if message_lower == pattern:
                return True
            if message_lower.endswith(pattern):
                return True
        
        return False
    
    async def enqueue(
        self,
        ticket_id: str,
        message_id: str,
        content: str,
        lead_id: str,
        tenant_id: str,
        agent_id: str,
        channel_id: str,
        metadata: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Enfileira uma mensagem para processamento posterior.
        
        Returns:
            Dict com status e informações da fila
        """
        await self.connect()
        
        queue_key = self._get_queue_key(ticket_id)
        meta_key = self._get_metadata_key(ticket_id)
        
        now = time.time()
        
        # Mensagem a ser enfileirada
        msg_data = {
            "id": message_id,
            "content": content,
            "timestamp": now,
            "is_end_intent": self._is_end_intent(content)
        }
        
        # Adiciona à lista de mensagens
        await self.redis.rpush(queue_key, json.dumps(msg_data))
        
        # Atualiza metadata
        meta = await self.redis.hgetall(meta_key)
        
        if not meta:
            # Primeira mensagem do batch
            meta = {
                "lead_id": lead_id,
                "tenant_id": tenant_id,
                "agent_id": agent_id,
                "channel_id": channel_id,
                "ticket_id": ticket_id,
                "first_message_at": str(now),
                "last_message_at": str(now),
                "message_count": "1",
                "metadata": json.dumps(metadata or {})
            }
        else:
            # Atualiza contagem e timestamp
            meta["last_message_at"] = str(now)
            meta["message_count"] = str(int(meta.get("message_count", 0)) + 1)
        
        await self.redis.hset(meta_key, mapping=meta)
        
        # Define TTL de 5 minutos para limpeza automática
        await self.redis.expire(queue_key, 300)
        await self.redis.expire(meta_key, 300)
        
        logger.info("message_enqueued", 
            ticket_id=ticket_id,
            message_id=message_id,
            queue_size=int(meta["message_count"]),
            is_end_intent=msg_data["is_end_intent"]
        )
        
        return {
            "status": "enqueued",
            "ticket_id": ticket_id,
            "queue_size": int(meta["message_count"]),
            "is_end_intent": msg_data["is_end_intent"]
        }
    
    async def should_process(self, ticket_id: str) -> bool:
        """
        Verifica se deve processar as mensagens do ticket.
        
        Condições:
        1. Passou MAX_WAIT_TIME desde primeira mensagem
        2. OU última mensagem tem padrão de fim de intenção
        3. OU passou MIN_GAP_TIME desde última mensagem
        """
        await self.connect()
        
        meta_key = self._get_metadata_key(ticket_id)
        queue_key = self._get_queue_key(ticket_id)
        
        meta = await self.redis.hgetall(meta_key)
        if not meta:
            return False
        
        now = time.time()
        first_msg_time = float(meta.get("first_message_at", now))
        last_msg_time = float(meta.get("last_message_at", now))
        
        # Condição 1: Passou tempo máximo
        if now - first_msg_time >= MAX_WAIT_TIME:
            logger.info("should_process_max_wait", ticket_id=ticket_id)
            return True
        
        # Condição 2: Passou tempo mínimo desde última mensagem (silêncio)
        if now - last_msg_time >= MIN_GAP_TIME:
            logger.info("should_process_gap_time", ticket_id=ticket_id)
            return True
        
        # Condição 3: Última mensagem é fim de intenção
        messages = await self.redis.lrange(queue_key, -1, -1)
        if messages:
            last_msg = json.loads(messages[0])
            if last_msg.get("is_end_intent"):
                logger.info("should_process_end_intent", ticket_id=ticket_id)
                return True
        
        return False
    
    async def get_pending_messages(self, ticket_id: str) -> Optional[Dict[str, Any]]:
        """
        Retorna todas as mensagens pendentes de um ticket e limpa a fila.
        
        Returns:
            Dict com mensagens combinadas e metadata, ou None se vazio
        """
        await self.connect()
        
        queue_key = self._get_queue_key(ticket_id)
        meta_key = self._get_metadata_key(ticket_id)
        
        # Busca todas as mensagens
        messages_raw = await self.redis.lrange(queue_key, 0, -1)
        meta = await self.redis.hgetall(meta_key)
        
        if not messages_raw or not meta:
            return None
        
        # Parse das mensagens
        messages = [json.loads(m) for m in messages_raw]
        
        # Combina os conteúdos
        combined_content = "\n".join([m["content"] for m in messages])
        
        # Limpa a fila
        await self.redis.delete(queue_key)
        await self.redis.delete(meta_key)
        
        result = {
            "ticket_id": ticket_id,
            "lead_id": meta["lead_id"],
            "tenant_id": meta["tenant_id"],
            "agent_id": meta["agent_id"],
            "channel_id": meta["channel_id"],
            "combined_message": combined_content,
            "message_count": len(messages),
            "messages": messages,
            "metadata": json.loads(meta.get("metadata", "{}")),
            "first_message_at": float(meta["first_message_at"]),
            "last_message_at": float(meta["last_message_at"]),
        }
        
        logger.info("messages_dequeued",
            ticket_id=ticket_id,
            message_count=len(messages),
            combined_length=len(combined_content)
        )
        
        return result
    
    async def get_all_pending_tickets(self) -> List[str]:
        """Retorna todos os tickets com mensagens pendentes"""
        await self.connect()
        
        # Busca todas as chaves de metadata
        keys = await self.redis.keys("msg_meta:*")
        
        # Extrai os ticket_ids
        ticket_ids = [k.replace("msg_meta:", "") for k in keys]
        
        return ticket_ids
    
    async def get_queue_status(self) -> Dict[str, Any]:
        """Retorna status geral da fila"""
        await self.connect()
        
        ticket_ids = await self.get_all_pending_tickets()
        
        pending_details = []
        for ticket_id in ticket_ids:
            meta_key = self._get_metadata_key(ticket_id)
            meta = await self.redis.hgetall(meta_key)
            if meta:
                pending_details.append({
                    "ticket_id": ticket_id,
                    "message_count": int(meta.get("message_count", 0)),
                    "waiting_since": float(meta.get("first_message_at", 0))
                })
        
        return {
            "pending_tickets": len(ticket_ids),
            "details": pending_details
        }


# Singleton
message_queue = MessageQueue()

