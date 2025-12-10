"""
Módulo de Cache - Performance otimizada com Redis
"""
from .response_cache import response_cache
from .history_cache import history_cache

__all__ = ["response_cache", "history_cache"]

