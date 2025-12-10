"""
Cache de Histórico - Mantém últimas mensagens em memória
Velocidade absurda vs buscar no banco
"""
import json
from typing import Optional, List, Dict, Any
from datetime import datetime
import redis.asyncio as redis
import structlog

from app.config import get_settings

logger = structlog.get_logger()
settings = get_settings()


class HistoryCache:
    """
    Mantém histórico recente de conversas no Redis.
    
    Benefícios:
    - Busca em <1ms vs ~50ms do PostgreSQL
    - Reduz carga no banco
    - Sempre tem o contexto mais recente disponível
    """
    
    def __init__(self):
        self._redis: Optional[redis.Redis] = None
        self.max_messages = 20  # Últimas 20 mensagens
        self.ttl = 86400  # 24 horas
        
    async def connect(self):
        """Conecta ao Redis"""
        if not self._redis:
            try:
                redis_url = settings.redis_url or f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB}"
                self._redis = redis.from_url(
                    redis_url,
                    decode_responses=True
                )
                await self._redis.ping()
                logger.info("history_cache_connected", url=redis_url)
            except Exception as e:
                logger.error("history_cache_connection_error", error=str(e))
                self._redis = None
    
    async def disconnect(self):
        """Desconecta do Redis"""
        if self._redis:
            await self._redis.close()
            self._redis = None
    
    def _get_key(self, ticket_id: str) -> str:
        """Gera chave para o histórico do ticket"""
        return f"history:{ticket_id}"
    
    async def add_message(
        self,
        ticket_id: str,
        message: Dict[str, Any]
    ):
        """
        Adiciona mensagem ao histórico.
        Mantém apenas as últimas N mensagens.
        """
        if not self._redis:
            await self.connect()
        
        if not self._redis:
            return
        
        try:
            key = self._get_key(ticket_id)
            
            # Serializa a mensagem
            msg_json = json.dumps({
                "id": message.get("id"),
                "content": message.get("content") or message.get("message"),
                "sender_type": message.get("sender_type"),
                "direction": message.get("direction"),
                "timestamp": message.get("timestamp") or datetime.now().isoformat(),
            }, ensure_ascii=False)
            
            # Adiciona no final da lista
            await self._redis.rpush(key, msg_json)
            
            # Mantém apenas as últimas N mensagens
            await self._redis.ltrim(key, -self.max_messages, -1)
            
            # Renova TTL
            await self._redis.expire(key, self.ttl)
            
            logger.debug("history_message_added", 
                ticket_id=ticket_id,
                sender=message.get("sender_type")
            )
            
        except Exception as e:
            logger.error("history_add_error", error=str(e))
    
    async def get_history(
        self,
        ticket_id: str,
        limit: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Retorna histórico de mensagens.
        Mais recentes primeiro.
        """
        if not self._redis:
            await self.connect()
        
        if not self._redis:
            return []
        
        try:
            key = self._get_key(ticket_id)
            
            # Busca todas as mensagens
            messages_raw = await self._redis.lrange(key, 0, -1)
            
            if not messages_raw:
                return []
            
            # Converte para lista de dicts
            messages = [json.loads(msg) for msg in messages_raw]
            
            # Aplica limite se especificado
            if limit:
                messages = messages[-limit:]
            
            logger.debug("history_retrieved",
                ticket_id=ticket_id,
                count=len(messages)
            )
            
            return messages
            
        except Exception as e:
            logger.error("history_get_error", error=str(e))
            return []
    
    async def get_last_message(
        self,
        ticket_id: str,
        sender_type: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Retorna última mensagem.
        Opcionalmente filtra por tipo de sender.
        """
        history = await self.get_history(ticket_id)
        
        if not history:
            return None
        
        if sender_type:
            # Filtra por tipo
            filtered = [m for m in history if m.get("sender_type") == sender_type]
            return filtered[-1] if filtered else None
        
        return history[-1]
    
    async def clear_history(self, ticket_id: str):
        """Limpa histórico de um ticket"""
        if not self._redis:
            await self.connect()
        
        if not self._redis:
            return
        
        try:
            key = self._get_key(ticket_id)
            await self._redis.delete(key)
            logger.info("history_cleared", ticket_id=ticket_id)
            
        except Exception as e:
            logger.error("history_clear_error", error=str(e))
    
    async def sync_from_db(
        self,
        ticket_id: str,
        messages: List[Dict[str, Any]]
    ):
        """
        Sincroniza histórico do banco para o Redis.
        Útil quando o cache está vazio.
        """
        if not self._redis:
            await self.connect()
        
        if not self._redis:
            return
        
        try:
            key = self._get_key(ticket_id)
            
            # Limpa histórico atual
            await self._redis.delete(key)
            
            # Adiciona mensagens do banco
            for msg in messages[-self.max_messages:]:
                msg_json = json.dumps({
                    "id": msg.get("id"),
                    "content": msg.get("content") or msg.get("message"),
                    "sender_type": msg.get("sender_type"),
                    "direction": msg.get("direction"),
                    "timestamp": msg.get("timestamp") or msg.get("sent_at"),
                }, ensure_ascii=False)
                await self._redis.rpush(key, msg_json)
            
            # Define TTL
            await self._redis.expire(key, self.ttl)
            
            logger.info("history_synced_from_db",
                ticket_id=ticket_id,
                count=len(messages)
            )
            
        except Exception as e:
            logger.error("history_sync_error", error=str(e))


# Singleton
history_cache = HistoryCache()

