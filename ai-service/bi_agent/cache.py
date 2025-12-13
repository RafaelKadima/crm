"""
BI Cache - Cache Redis para métricas
=====================================

Responsável por cachear métricas e análises para evitar
recalcular a cada requisição.
"""

import logging
import os
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Callable
import hashlib

logger = logging.getLogger(__name__)

# Tenta importar Redis
try:
    import redis.asyncio as redis
    REDIS_AVAILABLE = True
except ImportError:
    try:
        import aioredis as redis
        REDIS_AVAILABLE = True
    except ImportError:
        REDIS_AVAILABLE = False
        logger.warning("Redis não disponível. Cache desabilitado.")

# Configuração
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
DEFAULT_TTL = 300  # 5 minutos
METRICS_TTL = 300  # 5 minutos para métricas
ANALYSIS_TTL = 600  # 10 minutos para análises
PREDICTION_TTL = 1800  # 30 minutos para predições


class BICache:
    """
    Cache Redis para o BI Agent.
    
    Funcionalidades:
    - Cache de métricas com TTL configurável
    - Invalidação por padrão (pattern)
    - Cache de análises e predições
    """
    
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        self.prefix = f"bi_cache:{tenant_id}:"
        self._redis: Optional[redis.Redis] = None
        self._connected = False
    
    async def _get_redis(self) -> Optional[redis.Redis]:
        """Obtém conexão Redis."""
        if not REDIS_AVAILABLE:
            return None
        
        if self._redis is None:
            try:
                self._redis = redis.from_url(REDIS_URL, decode_responses=True)
                await self._redis.ping()
                self._connected = True
                logger.info(f"[BICache] Conectado ao Redis")
            except Exception as e:
                logger.warning(f"[BICache] Não foi possível conectar ao Redis: {e}")
                self._connected = False
                return None
        
        return self._redis
    
    async def get(self, key: str) -> Optional[Dict]:
        """
        Busca valor do cache.
        
        Args:
            key: Chave de cache (sem prefixo)
        
        Returns:
            Valor deserializado ou None se não encontrado
        """
        client = await self._get_redis()
        if not client:
            return None
        
        try:
            full_key = f"{self.prefix}{key}"
            value = await client.get(full_key)
            
            if value:
                logger.debug(f"[BICache] Cache hit: {key}")
                return json.loads(value)
            
            logger.debug(f"[BICache] Cache miss: {key}")
            return None
            
        except Exception as e:
            logger.warning(f"[BICache] Erro ao buscar cache: {e}")
            return None
    
    async def set(
        self,
        key: str,
        value: Dict,
        ttl: int = DEFAULT_TTL
    ) -> bool:
        """
        Define valor no cache.
        
        Args:
            key: Chave de cache (sem prefixo)
            value: Valor a ser cacheado
            ttl: Tempo de vida em segundos
        
        Returns:
            True se sucesso, False se falhou
        """
        client = await self._get_redis()
        if not client:
            return False
        
        try:
            full_key = f"{self.prefix}{key}"
            serialized = json.dumps(value, default=str)
            await client.setex(full_key, ttl, serialized)
            logger.debug(f"[BICache] Cache set: {key} (TTL: {ttl}s)")
            return True
            
        except Exception as e:
            logger.warning(f"[BICache] Erro ao definir cache: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """
        Remove valor do cache.
        
        Args:
            key: Chave de cache (sem prefixo)
        """
        client = await self._get_redis()
        if not client:
            return False
        
        try:
            full_key = f"{self.prefix}{key}"
            await client.delete(full_key)
            logger.debug(f"[BICache] Cache deleted: {key}")
            return True
            
        except Exception as e:
            logger.warning(f"[BICache] Erro ao deletar cache: {e}")
            return False
    
    async def invalidate_pattern(self, pattern: str) -> int:
        """
        Invalida todas as chaves que correspondem ao padrão.
        
        Args:
            pattern: Padrão glob (ex: "metrics:*")
        
        Returns:
            Número de chaves removidas
        """
        client = await self._get_redis()
        if not client:
            return 0
        
        try:
            full_pattern = f"{self.prefix}{pattern}"
            keys = []
            
            async for key in client.scan_iter(match=full_pattern):
                keys.append(key)
            
            if keys:
                await client.delete(*keys)
                logger.info(f"[BICache] Invalidadas {len(keys)} chaves: {pattern}")
            
            return len(keys)
            
        except Exception as e:
            logger.warning(f"[BICache] Erro ao invalidar pattern: {e}")
            return 0
    
    async def get_or_set(
        self,
        key: str,
        factory: Callable,
        ttl: int = DEFAULT_TTL
    ) -> Dict:
        """
        Busca do cache ou executa factory se não encontrado.
        
        Args:
            key: Chave de cache
            factory: Função async que gera o valor
            ttl: TTL do cache
        
        Returns:
            Valor do cache ou gerado pela factory
        """
        # Tenta buscar do cache
        cached = await self.get(key)
        if cached is not None:
            return cached
        
        # Executa factory
        value = await factory()
        
        # Cacheia resultado
        await self.set(key, value, ttl)
        
        return value
    
    # =========== Métodos especializados para BI ===========
    
    async def get_metrics(self, area: str, period: str) -> Optional[Dict]:
        """Busca métricas cacheadas por área e período."""
        key = f"metrics:{area}:{period}"
        return await self.get(key)
    
    async def set_metrics(self, area: str, period: str, data: Dict) -> bool:
        """Cacheia métricas por área e período."""
        key = f"metrics:{area}:{period}"
        return await self.set(key, data, METRICS_TTL)
    
    async def get_analysis(self, analysis_type: str, params_hash: str) -> Optional[Dict]:
        """Busca análise cacheada."""
        key = f"analysis:{analysis_type}:{params_hash}"
        return await self.get(key)
    
    async def set_analysis(self, analysis_type: str, params_hash: str, data: Dict) -> bool:
        """Cacheia análise."""
        key = f"analysis:{analysis_type}:{params_hash}"
        return await self.set(key, data, ANALYSIS_TTL)
    
    async def get_prediction(self, prediction_type: str) -> Optional[Dict]:
        """Busca predição cacheada."""
        key = f"prediction:{prediction_type}"
        return await self.get(key)
    
    async def set_prediction(self, prediction_type: str, data: Dict) -> bool:
        """Cacheia predição."""
        key = f"prediction:{prediction_type}"
        return await self.set(key, data, PREDICTION_TTL)
    
    async def get_executive_summary(self, period: str) -> Optional[Dict]:
        """Busca resumo executivo cacheado."""
        key = f"executive_summary:{period}"
        return await self.get(key)
    
    async def set_executive_summary(self, period: str, data: Dict) -> bool:
        """Cacheia resumo executivo."""
        key = f"executive_summary:{period}"
        return await self.set(key, data, METRICS_TTL)
    
    async def invalidate_metrics(self) -> int:
        """Invalida todas as métricas."""
        return await self.invalidate_pattern("metrics:*")
    
    async def invalidate_analysis(self) -> int:
        """Invalida todas as análises."""
        return await self.invalidate_pattern("analysis:*")
    
    async def invalidate_all(self) -> int:
        """Invalida todo o cache do tenant."""
        return await self.invalidate_pattern("*")
    
    @staticmethod
    def hash_params(params: Dict) -> str:
        """Gera hash dos parâmetros para uso como chave."""
        sorted_params = json.dumps(params, sort_keys=True, default=str)
        return hashlib.md5(sorted_params.encode()).hexdigest()[:12]
    
    async def close(self):
        """Fecha conexão Redis."""
        if self._redis:
            await self._redis.close()
            self._redis = None
            self._connected = False
    
    async def stats(self) -> Dict[str, Any]:
        """Retorna estatísticas do cache."""
        client = await self._get_redis()
        if not client:
            return {"available": False}
        
        try:
            # Conta chaves do tenant
            count = 0
            async for _ in client.scan_iter(match=f"{self.prefix}*"):
                count += 1
            
            return {
                "available": True,
                "connected": self._connected,
                "keys_count": count,
                "prefix": self.prefix,
            }
            
        except Exception as e:
            return {
                "available": False,
                "error": str(e),
            }


class CachedDataAnalyzer:
    """
    Wrapper do DataAnalyzer com cache automático.
    """
    
    def __init__(self, analyzer, cache: BICache):
        self.analyzer = analyzer
        self.cache = cache
    
    async def collect_sales_metrics(self, period: str = "30d") -> Dict:
        """Métricas de vendas com cache."""
        cached = await self.cache.get_metrics("sales", period)
        if cached:
            return cached
        
        data = await self.analyzer.collect_sales_metrics(period)
        await self.cache.set_metrics("sales", period, data)
        return data
    
    async def collect_marketing_metrics(self, period: str = "30d") -> Dict:
        """Métricas de marketing com cache."""
        cached = await self.cache.get_metrics("marketing", period)
        if cached:
            return cached
        
        data = await self.analyzer.collect_marketing_metrics(period)
        await self.cache.set_metrics("marketing", period, data)
        return data
    
    async def collect_support_metrics(self, period: str = "30d") -> Dict:
        """Métricas de suporte com cache."""
        cached = await self.cache.get_metrics("support", period)
        if cached:
            return cached
        
        data = await self.analyzer.collect_support_metrics(period)
        await self.cache.set_metrics("support", period, data)
        return data
    
    async def collect_financial_metrics(self, period: str = "30d") -> Dict:
        """Métricas financeiras com cache."""
        cached = await self.cache.get_metrics("financial", period)
        if cached:
            return cached
        
        data = await self.analyzer.collect_financial_metrics(period)
        await self.cache.set_metrics("financial", period, data)
        return data
    
    async def get_executive_summary(self, period: str = "30d") -> Dict:
        """Resumo executivo com cache."""
        cached = await self.cache.get_executive_summary(period)
        if cached:
            return cached
        
        data = await self.analyzer.get_executive_summary(period)
        await self.cache.set_executive_summary(period, data)
        return data

