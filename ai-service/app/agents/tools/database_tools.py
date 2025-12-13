"""
Tools para interação com o banco de dados via API Laravel.

Estas tools permitem ao agente buscar e atualizar dados
no CRM sem acesso direto ao banco.
"""

import httpx
import structlog
from typing import Optional, Dict, Any, List
from langchain.tools import tool

from app.config import get_settings

logger = structlog.get_logger()

# URL base da API do Laravel
LARAVEL_API_URL = None


def _run_async(coro):
    """Helper para executar coroutines em threads sem event loop."""
    import asyncio
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        # Não há event loop rodando - criar um novo
        return asyncio.run(coro)
    else:
        # Já há um event loop - usar nest_asyncio ou criar task
        import nest_asyncio
        nest_asyncio.apply()
        return loop.run_until_complete(coro)


def _get_laravel_url() -> str:
    """Retorna URL da API Laravel."""
    global LARAVEL_API_URL
    if LARAVEL_API_URL is None:
        settings = get_settings()
        LARAVEL_API_URL = settings.LARAVEL_API_URL
    return LARAVEL_API_URL


async def _call_laravel_api(
    method: str,
    endpoint: str,
    tenant_id: str,
    data: Optional[Dict] = None,
    use_internal: bool = True,
) -> Dict[str, Any]:
    """Helper para chamar API do Laravel."""
    settings = get_settings()
    
    # Usa rota interna para evitar autenticação
    if use_internal:
        url = f"{_get_laravel_url()}/api/internal/{endpoint}"
        headers = {
            "Content-Type": "application/json",
            "X-Tenant-ID": tenant_id,
            "X-Internal-Key": settings.LARAVEL_INTERNAL_KEY,
        }
    else:
        url = f"{_get_laravel_url()}/api/{endpoint}"
        headers = {
            "Content-Type": "application/json",
            "X-Tenant-ID": tenant_id,
        }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        if method.upper() == "GET":
            response = await client.get(url, headers=headers, params=data)
        elif method.upper() == "POST":
            response = await client.post(url, headers=headers, json=data)
        elif method.upper() == "PUT":
            response = await client.put(url, headers=headers, json=data)
        else:
            raise ValueError(f"Método não suportado: {method}")
        
        if response.status_code >= 400:
            logger.error(
                "Laravel API error",
                endpoint=endpoint,
                status=response.status_code,
                body=response.text[:500]
            )
            raise Exception(f"Erro na API: {response.status_code}")
        
        return response.json()


@tool
def get_tenant_config(tenant_id: str) -> Dict[str, Any]:
    """
    Busca configurações do tenant incluindo contas Meta, página e pixel.
    
    Args:
        tenant_id: ID do tenant no CRM
        
    Returns:
        Dict com:
        - ad_accounts: Lista de contas de anúncio
        - default_account: Conta padrão com page_id, pixel_id
        - settings: Configurações gerais
    """
    logger.info("Getting tenant config", tenant_id=tenant_id)
    
    try:
        # Busca contas de anúncio
        accounts = _run_async(
            _call_laravel_api("GET", "ads/accounts", tenant_id)
        )
        
        accounts_data = accounts.get("data", accounts)
        if isinstance(accounts_data, list) and len(accounts_data) > 0:
            default_account = accounts_data[0]
        else:
            default_account = None
        
        return {
            "success": True,
            "tenant_id": tenant_id,
            "ad_accounts": accounts_data,
            "default_account": {
                "id": default_account.get("id") if default_account else None,
                "name": default_account.get("name") if default_account else None,
                "platform_account_id": default_account.get("platform_account_id") if default_account else None,
                "page_id": default_account.get("page_id") if default_account else None,
                "pixel_id": default_account.get("pixel_id") if default_account else None,
                "access_token": "***" if default_account and default_account.get("access_token") else None,
            } if default_account else None,
            "message": f"✅ Configuração carregada. {len(accounts_data)} conta(s) encontrada(s)."
        }
        
    except Exception as e:
        logger.error("Failed to get tenant config", error=str(e))
        return {
            "success": False,
            "error": str(e),
            "message": f"❌ Erro ao buscar configurações: {str(e)}"
        }


@tool
def list_available_creatives(
    tenant_id: str,
    status: str = "ready",
    creative_type: Optional[str] = None,
    limit: int = 10
) -> Dict[str, Any]:
    """
    Lista criativos disponíveis para uso.
    
    Args:
        tenant_id: ID do tenant
        status: Filtro de status (ready, uploaded, used)
        creative_type: Filtro por tipo (image, video)
        limit: Número máximo de resultados
        
    Returns:
        Lista de criativos com id, name, type, file_url
    """
    logger.info(
        "Listing creatives",
        tenant_id=tenant_id,
        status=status,
        type=creative_type
    )
    
    try:
        params = {
            "status": status,
            "per_page": limit,
        }
        if creative_type:
            params["type"] = creative_type
        
        result = _run_async(
            _call_laravel_api("GET", "ads/creatives", tenant_id, params)
        )
        
        creatives = result.get("data", result)
        
        # Formata para resposta simplificada
        creative_list = []
        for c in creatives:
            creative_list.append({
                "id": c.get("id"),
                "name": c.get("name"),
                "type": c.get("type"),
                "status": c.get("status"),
                "file_url": c.get("file_url") or c.get("external_url"),
                "thumbnail_url": c.get("thumbnail_url"),
            })
        
        return {
            "success": True,
            "creatives": creative_list,
            "total": len(creative_list),
            "message": f"✅ {len(creative_list)} criativo(s) encontrado(s) com status '{status}'."
        }
        
    except Exception as e:
        logger.error("Failed to list creatives", error=str(e))
        return {
            "success": False,
            "error": str(e),
            "creatives": [],
            "message": f"❌ Erro ao listar criativos: {str(e)}"
        }


@tool
def list_available_copies(
    tenant_id: str,
    status: str = "approved",
    limit: int = 10
) -> Dict[str, Any]:
    """
    Lista copies disponíveis para uso.
    
    Args:
        tenant_id: ID do tenant
        status: Filtro de status (draft, approved, used)
        limit: Número máximo de resultados
        
    Returns:
        Lista de copies com id, name, headline, primary_text, call_to_action
    """
    logger.info(
        "Listing copies",
        tenant_id=tenant_id,
        status=status
    )
    
    try:
        params = {
            "status": status,
            "per_page": limit,
        }
        
        result = _run_async(
            _call_laravel_api("GET", "ads/copies", tenant_id, params)
        )
        
        copies = result.get("data", result)
        
        copy_list = []
        for c in copies:
            copy_list.append({
                "id": c.get("id"),
                "name": c.get("name"),
                "headline": c.get("headline"),
                "primary_text": c.get("primary_text"),
                "description": c.get("description"),
                "call_to_action": c.get("call_to_action"),
                "hook_type": c.get("hook_type"),
                "effectiveness": c.get("estimated_effectiveness"),
            })
        
        return {
            "success": True,
            "copies": copy_list,
            "total": len(copy_list),
            "message": f"✅ {len(copy_list)} copy(ies) encontrada(s) com status '{status}'."
        }
        
    except Exception as e:
        logger.error("Failed to list copies", error=str(e))
        return {
            "success": False,
            "error": str(e),
            "copies": [],
            "message": f"❌ Erro ao listar copies: {str(e)}"
        }


@tool
def get_creative_by_id(tenant_id: str, creative_id: str) -> Dict[str, Any]:
    """
    Busca um criativo específico pelo ID.
    
    Args:
        tenant_id: ID do tenant
        creative_id: ID do criativo
        
    Returns:
        Dados completos do criativo
    """
    try:
        result = _run_async(
            _call_laravel_api("GET", f"ads/creatives/{creative_id}", tenant_id)
        )
        
        creative = result.get("data", result)
        
        return {
            "success": True,
            "creative": {
                "id": creative.get("id"),
                "name": creative.get("name"),
                "type": creative.get("type"),
                "status": creative.get("status"),
                "file_url": creative.get("file_url") or creative.get("external_url"),
                "thumbnail_url": creative.get("thumbnail_url"),
                "width": creative.get("width"),
                "height": creative.get("height"),
                "platform_media_id": creative.get("platform_media_id"),
            },
            "message": f"✅ Criativo '{creative.get('name')}' encontrado."
        }
        
    except Exception as e:
        logger.error("Failed to get creative", error=str(e))
        return {
            "success": False,
            "error": str(e),
            "message": f"❌ Criativo não encontrado: {str(e)}"
        }


@tool
def get_copy_by_id(tenant_id: str, copy_id: str) -> Dict[str, Any]:
    """
    Busca uma copy específica pelo ID.
    
    Args:
        tenant_id: ID do tenant
        copy_id: ID da copy
        
    Returns:
        Dados completos da copy
    """
    try:
        result = _run_async(
            _call_laravel_api("GET", f"ads/copies/{copy_id}", tenant_id)
        )
        
        copy = result.get("data", result)
        
        return {
            "success": True,
            "copy": {
                "id": copy.get("id"),
                "name": copy.get("name"),
                "headline": copy.get("headline"),
                "primary_text": copy.get("primary_text"),
                "description": copy.get("description"),
                "call_to_action": copy.get("call_to_action"),
                "link_url": copy.get("link_url"),
                "hook_type": copy.get("hook_type"),
                "effectiveness": copy.get("estimated_effectiveness"),
            },
            "message": f"✅ Copy '{copy.get('name')}' encontrada."
        }
        
    except Exception as e:
        logger.error("Failed to get copy", error=str(e))
        return {
            "success": False,
            "error": str(e),
            "message": f"❌ Copy não encontrada: {str(e)}"
        }


@tool
def save_campaign_to_database(
    tenant_id: str,
    campaign_data: Dict[str, Any],
    platform_campaign_id: str
) -> Dict[str, Any]:
    """
    Salva ou atualiza uma campanha criada pelo AGENTE no banco de dados.
    Marca automaticamente created_by='agent' para rastreamento de origem.
    
    Args:
        tenant_id: ID do tenant
        campaign_data: Dados da campanha (name, objective, daily_budget, etc.)
        platform_campaign_id: ID da campanha no Meta
        
    Returns:
        ID da campanha salva
    """
    logger.info(
        "Saving campaign to database",
        tenant_id=tenant_id,
        platform_id=platform_campaign_id
    )
    
    try:
        result = _run_async(
            _call_laravel_api(
                "POST",
                "ads/save-campaign",
                tenant_id,
                {
                    **campaign_data,
                    "platform_campaign_id": platform_campaign_id,
                    "created_by": "agent",  # Marca como criada pelo agente IA
                }
            )
        )
        
        return {
            "success": True,
            "campaign_id": result.get("campaign", {}).get("id"),
            "created_by": "agent",
            "message": "✅ Campanha salva no banco de dados (origem: agente IA)."
        }
        
    except Exception as e:
        logger.error("Failed to save campaign", error=str(e))
        return {
            "success": False,
            "error": str(e),
            "message": f"❌ Erro ao salvar campanha: {str(e)}"
        }


@tool
def update_creative_status(
    tenant_id: str,
    creative_id: str,
    status: str
) -> Dict[str, Any]:
    """
    Atualiza o status de um criativo.
    
    Args:
        tenant_id: ID do tenant
        creative_id: ID do criativo
        status: Novo status (uploaded, processing, ready, used, error)
        
    Returns:
        Status da atualização
    """
    try:
        result = _run_async(
            _call_laravel_api(
                "PUT",
                f"ads/creatives/{creative_id}",
                tenant_id,
                {"status": status}
            )
        )
        
        return {
            "success": True,
            "message": f"✅ Status do criativo atualizado para '{status}'."
        }
        
    except Exception as e:
        logger.error("Failed to update creative status", error=str(e))
        return {
            "success": False,
            "error": str(e),
            "message": f"❌ Erro ao atualizar criativo: {str(e)}"
        }


@tool
def update_copy_status(
    tenant_id: str,
    copy_id: str,
    status: str
) -> Dict[str, Any]:
    """
    Atualiza o status de uma copy.
    
    Args:
        tenant_id: ID do tenant
        copy_id: ID da copy
        status: Novo status (draft, approved, used)
        
    Returns:
        Status da atualização
    """
    try:
        if status == "approved":
            endpoint = f"ads/copies/{copy_id}/approve"
            method = "POST"
            data = None
        else:
            endpoint = f"ads/copies/{copy_id}"
            method = "PUT"
            data = {"status": status}
        
        result = _run_async(
            _call_laravel_api(method, endpoint, tenant_id, data)
        )
        
        return {
            "success": True,
            "message": f"✅ Status da copy atualizado para '{status}'."
        }
        
    except Exception as e:
        logger.error("Failed to update copy status", error=str(e))
        return {
            "success": False,
            "error": str(e),
            "message": f"❌ Erro ao atualizar copy: {str(e)}"
        }



@tool
def list_ad_campaigns(
    tenant_id: str,
    ad_account_id: str = None,
    status: str = None,
    created_by: str = None
) -> Dict[str, Any]:
    """
    Lista campanhas de anúncios do banco de dados local.
    
    Args:
        tenant_id: ID do tenant
        ad_account_id: ID da conta de anúncios (opcional, filtra por conta)
        status: Status da campanha (ACTIVE, PAUSED, etc) (opcional)
        created_by: Filtro por origem (agent, human, external) (opcional)
        
    Returns:
        Dict com lista de campanhas e estatísticas por origem
    """
    logger.info(
        'Listing ad campaigns',
        tenant_id=tenant_id,
        ad_account_id=ad_account_id,
        status=status,
        created_by=created_by
    )
    
    try:
        params = {}
        if ad_account_id:
            params['ad_account_id'] = ad_account_id
        if status:
            params['status'] = status
        if created_by:
            params['created_by'] = created_by
            
        result = _run_async(
            _call_laravel_api('GET', 'ads/campaigns', tenant_id, params)
        )
        
        campaigns = result.get('campaigns', result.get('data', []))
        by_origin = result.get('by_origin', {})
        
        # Formata resposta
        formatted = []
        for c in campaigns:
            formatted.append({
                'id': c.get('id'),
                'name': c.get('name'),
                'status': c.get('status'),
                'objective': c.get('objective'),
                'spend': c.get('spend', 0),
                'impressions': c.get('impressions', 0),
                'clicks': c.get('clicks', 0),
                'created_by': c.get('created_by', 'external'),
            })
        
        return {
            'success': True,
            'tenant_id': tenant_id,
            'total_campaigns': len(formatted),
            'campaigns': formatted,
            'by_origin': by_origin,
            'message': f'✅ Encontradas {len(formatted)} campanha(s). Agente: {by_origin.get("agent", 0)}, Humano: {by_origin.get("human", 0)}, Externo: {by_origin.get("external", 0)}'
        }
        
    except Exception as e:
        logger.error('Failed to list campaigns', error=str(e))
        return {
            'success': False,
            'error': str(e),
        }


@tool
def sync_and_list_campaigns(
    tenant_id: str,
    ad_account_id: str
) -> Dict[str, Any]:
    """
    SINCRONIZA campanhas do Meta Ads e retorna lista atualizada.
    Use esta tool para ter acesso a TODAS as campanhas, não só as criadas pelo agente.
    
    Esta tool:
    1. Sincroniza campanhas do Meta Ads Manager para o banco local
    2. Preserva a origem (created_by) de campanhas existentes
    3. Marca novas campanhas como 'external'
    4. Retorna lista completa com estatísticas por origem
    
    Args:
        tenant_id: ID do tenant
        ad_account_id: ID da conta de anúncios no CRM (obrigatório)
        
    Returns:
        Dict com campanhas sincronizadas, total e estatísticas por origem (agent/human/external)
    """
    logger.info(
        'Syncing and listing campaigns',
        tenant_id=tenant_id,
        ad_account_id=ad_account_id
    )
    
    try:
        result = _run_async(
            _call_laravel_api(
                'POST',
                'ads/campaigns/sync',
                tenant_id,
                {'ad_account_id': ad_account_id}
            )
        )
        
        campaigns = result.get('campaigns', [])
        by_origin = result.get('by_origin', {})
        synced = result.get('synced', 0)
        
        # Formata resposta
        formatted = []
        for c in campaigns:
            formatted.append({
                'id': c.get('id'),
                'name': c.get('name'),
                'status': c.get('status'),
                'objective': c.get('objective'),
                'spend': c.get('spend', 0),
                'impressions': c.get('impressions', 0),
                'clicks': c.get('clicks', 0),
                'ctr': c.get('ctr', 0),
                'cpc': c.get('cpc', 0),
                'roas': c.get('roas', 0),
                'created_by': c.get('created_by', 'external'),
            })
        
        # Contadores
        active_count = len([c for c in formatted if c['status'] == 'ACTIVE'])
        paused_count = len([c for c in formatted if c['status'] == 'PAUSED'])
        
        return {
            'success': True,
            'tenant_id': tenant_id,
            'ad_account_id': ad_account_id,
            'synced_from_meta': synced,
            'total_campaigns': len(formatted),
            'active_campaigns': active_count,
            'paused_campaigns': paused_count,
            'campaigns': formatted,
            'by_origin': by_origin,
            'message': f'✅ Sincronizado! {synced} campanhas do Meta. Total: {len(formatted)} (Ativas: {active_count}, Pausadas: {paused_count}). Por origem - Agente IA: {by_origin.get("agent", 0)}, Humano: {by_origin.get("human", 0)}, Externo: {by_origin.get("external", 0)}'
        }
        
    except Exception as e:
        logger.error('Failed to sync and list campaigns', error=str(e))
        return {
            'success': False,
            'error': str(e),
            'message': f'❌ Erro ao sincronizar campanhas: {str(e)}'
        }
