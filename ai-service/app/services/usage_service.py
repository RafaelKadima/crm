"""
Serviço para registrar uso de tokens no Laravel
"""
import httpx
import structlog
from typing import Optional, Dict, Any

from app.config import get_settings

logger = structlog.get_logger()
settings = get_settings()


class UsageService:
    """
    Serviço responsável por comunicar com o Laravel para:
    - Registrar uso de tokens de IA
    - Verificar limites de uso
    - Obter resumo de uso do tenant
    """
    
    def __init__(self):
        self.base_url = settings.LARAVEL_API_URL
        self.internal_key = settings.LARAVEL_INTERNAL_KEY
    
    async def log_ai_usage(
        self,
        tenant_id: str,
        input_tokens: int,
        output_tokens: int,
        model: str = "gpt-4o-mini",
        lead_id: Optional[str] = None,
        ticket_id: Optional[str] = None,
        agent_id: Optional[str] = None,
        action_type: Optional[str] = None,
        response_time_ms: Optional[int] = None,
        from_cache: bool = False,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Registra uso de tokens no Laravel.
        
        Returns:
            Dict com informações do log criado e status de uso, ou None se falhar
        """
        if not self.internal_key:
            logger.warning("LARAVEL_INTERNAL_KEY not configured, skipping usage tracking")
            return None
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{self.base_url}/api/internal/ai-usage",
                    json={
                        "tenant_id": tenant_id,
                        "lead_id": lead_id,
                        "ticket_id": ticket_id,
                        "agent_id": agent_id,
                        "model": model,
                        "input_tokens": input_tokens,
                        "output_tokens": output_tokens,
                        "action_type": action_type,
                        "response_time_ms": response_time_ms,
                        "from_cache": from_cache,
                        "metadata": metadata,
                    },
                    headers={
                        "X-Internal-Key": self.internal_key,
                        "Content-Type": "application/json",
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    logger.info(
                        "ai_usage_logged",
                        tenant_id=tenant_id,
                        tokens=input_tokens + output_tokens,
                        cost_brl=data.get("cost_brl")
                    )
                    return data
                elif response.status_code == 429:
                    logger.warning(
                        "ai_usage_limit_exceeded",
                        tenant_id=tenant_id,
                        response=response.json()
                    )
                    return {"error": "limit_exceeded", **response.json()}
                else:
                    logger.error(
                        "ai_usage_log_failed",
                        tenant_id=tenant_id,
                        status_code=response.status_code,
                        response=response.text
                    )
                    return None
                    
        except Exception as e:
            logger.error("ai_usage_log_error", error=str(e), tenant_id=tenant_id)
            return None
    
    async def check_ai_access(self, tenant_id: str) -> Dict[str, Any]:
        """
        Verifica se o tenant pode usar IA.
        
        Returns:
            Dict com 'allowed' (bool) e 'message' se não permitido
        """
        if not self.internal_key:
            return {"allowed": True, "message": "Internal key not configured"}
        
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.post(
                    f"{self.base_url}/api/internal/ai-usage/check",
                    json={"tenant_id": tenant_id},
                    headers={
                        "X-Internal-Key": self.internal_key,
                        "Content-Type": "application/json",
                    }
                )
                
                if response.status_code == 200:
                    return response.json()
                else:
                    logger.error(
                        "check_ai_access_failed",
                        tenant_id=tenant_id,
                        status_code=response.status_code
                    )
                    return {"allowed": True, "message": "Check failed, allowing"}
                    
        except Exception as e:
            logger.error("check_ai_access_error", error=str(e), tenant_id=tenant_id)
            return {"allowed": True, "message": f"Error: {str(e)}"}
    
    async def get_usage_summary(self, tenant_id: str) -> Optional[Dict[str, Any]]:
        """
        Obtém resumo de uso do tenant.
        """
        if not self.internal_key:
            return None
        
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.post(
                    f"{self.base_url}/api/internal/usage/summary",
                    json={"tenant_id": tenant_id},
                    headers={
                        "X-Internal-Key": self.internal_key,
                        "Content-Type": "application/json",
                    }
                )
                
                if response.status_code == 200:
                    return response.json()
                return None
                    
        except Exception as e:
            logger.error("get_usage_summary_error", error=str(e), tenant_id=tenant_id)
            return None


# Singleton
usage_service = UsageService()

