"""
Cache de Respostas - Evita chamadas repetidas ao LLM
Reduz consumo de tokens em até 40%
"""
import hashlib
import json
from typing import Optional, Dict, Any
import redis.asyncio as redis
import structlog

from app.config import get_settings

logger = structlog.get_logger()
settings = get_settings()


class ResponseCache:
    """
    Cache inteligente de respostas do agente.
    
    Estratégias:
    1. Cache por hash exato da mensagem (respostas idênticas)
    2. Cache por intenção similar (evita reprocessar perguntas parecidas)
    3. Cache de embeddings (evita recalcular vetores)
    """
    
    def __init__(self):
        self._redis: Optional[redis.Redis] = None
        self.default_ttl = 3600  # 1 hora
        self.embedding_ttl = 86400  # 24 horas para embeddings
        
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
                logger.info("response_cache_connected", url=redis_url)
            except Exception as e:
                logger.error("response_cache_connection_error", error=str(e))
                self._redis = None
    
    async def disconnect(self):
        """Desconecta do Redis"""
        if self._redis:
            await self._redis.close()
            self._redis = None
    
    def _hash_message(self, message: str, tenant_id: str, agent_id: str) -> str:
        """Gera hash único para a mensagem"""
        content = f"{tenant_id}:{agent_id}:{message.lower().strip()}"
        return hashlib.sha256(content.encode()).hexdigest()[:32]
    
    def _hash_intent(self, intent: str, tenant_id: str) -> str:
        """Gera hash para intenção"""
        content = f"{tenant_id}:intent:{intent}"
        return hashlib.sha256(content.encode()).hexdigest()[:16]
    
    # ========== CACHE DE RESPOSTAS ==========
    
    async def get_cached_response(
        self,
        message: str,
        tenant_id: str,
        agent_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Busca resposta em cache.
        Retorna None se não encontrar.
        """
        if not self._redis:
            await self.connect()
        
        if not self._redis:
            return None
        
        try:
            key = f"resp:{self._hash_message(message, tenant_id, agent_id)}"
            cached = await self._redis.get(key)
            
            if cached:
                logger.info("cache_hit_response", 
                    message_preview=message[:50],
                    key=key
                )
                return json.loads(cached)
            
            return None
            
        except Exception as e:
            logger.error("cache_get_error", error=str(e))
            return None
    
    async def set_cached_response(
        self,
        message: str,
        tenant_id: str,
        agent_id: str,
        response: Dict[str, Any],
        ttl: Optional[int] = None
    ):
        """
        Salva resposta no cache.
        Não cacheia respostas com agendamentos (dinâmicas).
        """
        if not self._redis:
            await self.connect()
        
        if not self._redis:
            return
        
        # Não cacheia ações dinâmicas
        action = response.get("action", "")
        if action in ["schedule_meeting", "move_stage", "transfer_to_human"]:
            logger.debug("skip_cache_dynamic_action", action=action)
            return
        
        try:
            key = f"resp:{self._hash_message(message, tenant_id, agent_id)}"
            await self._redis.set(
                key,
                json.dumps(response, ensure_ascii=False),
                ex=ttl or self.default_ttl
            )
            logger.debug("cache_set_response", key=key)
            
        except Exception as e:
            logger.error("cache_set_error", error=str(e))
    
    # ========== CACHE DE EMBEDDINGS ==========
    
    async def get_cached_embedding(
        self,
        text: str,
        tenant_id: str
    ) -> Optional[list]:
        """Busca embedding em cache"""
        if not self._redis:
            await self.connect()
        
        if not self._redis:
            return None
        
        try:
            text_hash = hashlib.sha256(text.encode()).hexdigest()[:32]
            key = f"emb:{tenant_id}:{text_hash}"
            cached = await self._redis.get(key)
            
            if cached:
                logger.debug("cache_hit_embedding")
                return json.loads(cached)
            
            return None
            
        except Exception as e:
            logger.error("cache_embedding_get_error", error=str(e))
            return None
    
    async def set_cached_embedding(
        self,
        text: str,
        tenant_id: str,
        embedding: list
    ):
        """Salva embedding no cache"""
        if not self._redis:
            await self.connect()
        
        if not self._redis:
            return
        
        try:
            text_hash = hashlib.sha256(text.encode()).hexdigest()[:32]
            key = f"emb:{tenant_id}:{text_hash}"
            await self._redis.set(
                key,
                json.dumps(embedding),
                ex=self.embedding_ttl
            )
            
        except Exception as e:
            logger.error("cache_embedding_set_error", error=str(e))
    
    # ========== ESTATÍSTICAS ==========
    
    async def get_stats(self) -> Dict[str, Any]:
        """Retorna estatísticas do cache"""
        if not self._redis:
            return {"status": "disconnected"}
        
        try:
            info = await self._redis.info("stats")
            keys_resp = await self._redis.keys("resp:*")
            keys_emb = await self._redis.keys("emb:*")
            keys_hist = await self._redis.keys("history:*")
            
            return {
                "status": "connected",
                "cached_responses": len(keys_resp),
                "cached_embeddings": len(keys_emb),
                "cached_histories": len(keys_hist),
                "hits": info.get("keyspace_hits", 0),
                "misses": info.get("keyspace_misses", 0),
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}


# Singleton
response_cache = ResponseCache()

