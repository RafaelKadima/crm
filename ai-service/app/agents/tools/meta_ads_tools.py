"""
Tools para interação com a API do Meta Ads.

Estas tools são chamadas pelo agente para criar campanhas,
adsets, ads e fazer upload de criativos.
"""

import httpx
import structlog
from typing import Optional, Dict, Any
from langchain.tools import tool

from app.config import get_settings

logger = structlog.get_logger()

# URL base da API do Laravel
LARAVEL_API_URL = None


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
    access_token: Optional[str] = None
) -> Dict[str, Any]:
    """Helper para chamar API do Laravel."""
    url = f"{_get_laravel_url()}/api/{endpoint}"
    
    headers = {
        "Content-Type": "application/json",
        "X-Tenant-ID": tenant_id,
    }
    
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"
    
    async with httpx.AsyncClient(timeout=60.0) as client:
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
            raise Exception(f"Erro na API: {response.status_code} - {response.text[:200]}")
        
        return response.json()


@tool
def create_meta_campaign(
    tenant_id: str,
    account_id: str,
    name: str,
    objective: str,
    daily_budget: float,
    status: str = "PAUSED"
) -> Dict[str, Any]:
    """
    Cria uma campanha no Meta Ads.
    
    Args:
        tenant_id: ID do tenant no CRM
        account_id: ID da conta de anúncios (ad_account_id no CRM)
        name: Nome da campanha
        objective: Objetivo (OUTCOME_SALES, OUTCOME_LEADS, OUTCOME_AWARENESS, OUTCOME_TRAFFIC)
        daily_budget: Orçamento diário em reais
        status: PAUSED (padrão) ou ACTIVE
        
    Returns:
        Dict com campaign_id e status da criação
    """
    import asyncio
    
    logger.info(
        "Creating Meta campaign",
        tenant_id=tenant_id,
        name=name,
        objective=objective,
        daily_budget=daily_budget
    )
    
    try:
        # Chama endpoint do Laravel que faz a criação no Meta
        result = asyncio.get_event_loop().run_until_complete(
            _call_laravel_api(
                "POST",
                "ads/agent/create-campaign",
                tenant_id,
                {
                    "tenant_id": tenant_id,
                    "ad_account_id": account_id,
                    "platform": "meta",
                    "campaign": {
                        "name": name,
                        "objective": objective,
                        "daily_budget": daily_budget,
                        "status": status,
                    },
                    "adsets": [],
                    "ads": [],
                }
            )
        )
        
        return {
            "success": True,
            "campaign_id": result.get("campaign", {}).get("id"),
            "platform_campaign_id": result.get("campaign", {}).get("platform_campaign_id"),
            "message": f"✅ Campanha '{name}' criada com sucesso!"
        }
        
    except Exception as e:
        logger.error("Failed to create campaign", error=str(e))
        return {
            "success": False,
            "error": str(e),
            "message": f"❌ Erro ao criar campanha: {str(e)}"
        }


@tool
def create_meta_adset(
    tenant_id: str,
    account_id: str,
    campaign_id: str,
    name: str,
    optimization_goal: str = "LINK_CLICKS",
    targeting: Optional[Dict] = None,
    status: str = "PAUSED"
) -> Dict[str, Any]:
    """
    Cria um conjunto de anúncios (adset) no Meta Ads.
    
    Args:
        tenant_id: ID do tenant no CRM
        account_id: ID da conta de anúncios
        campaign_id: ID da campanha (no CRM)
        name: Nome do adset
        optimization_goal: LINK_CLICKS, OFFSITE_CONVERSIONS, LANDING_PAGE_VIEWS
        targeting: Segmentação (age_min, age_max, geo_locations, interests)
        status: PAUSED (padrão) ou ACTIVE
        
    Returns:
        Dict com adset_id e status
    """
    import asyncio
    
    logger.info(
        "Creating Meta adset",
        campaign_id=campaign_id,
        name=name
    )
    
    # Targeting padrão se não fornecido
    if targeting is None:
        targeting = {
            "age_min": 18,
            "age_max": 65,
            "geo_locations": {"countries": ["BR"]},
        }
    
    try:
        # Endpoint interno para criar adset
        result = asyncio.get_event_loop().run_until_complete(
            _call_laravel_api(
                "POST",
                "internal/ads/create-adset",
                tenant_id,
                {
                    "campaign_id": campaign_id,
                    "name": name,
                    "optimization_goal": optimization_goal,
                    "targeting": targeting,
                    "status": status,
                }
            )
        )
        
        return {
            "success": True,
            "adset_id": result.get("adset", {}).get("id"),
            "platform_adset_id": result.get("adset", {}).get("platform_adset_id"),
            "message": f"✅ Adset '{name}' criado com sucesso!"
        }
        
    except Exception as e:
        logger.error("Failed to create adset", error=str(e))
        return {
            "success": False,
            "error": str(e),
            "message": f"❌ Erro ao criar adset: {str(e)}"
        }


@tool
def create_meta_ad(
    tenant_id: str,
    account_id: str,
    adset_id: str,
    name: str,
    creative_id: str,
    copy_id: Optional[str] = None,
    headline: Optional[str] = None,
    primary_text: Optional[str] = None,
    description: Optional[str] = None,
    call_to_action: str = "LEARN_MORE",
    link_url: Optional[str] = None,
    status: str = "PAUSED"
) -> Dict[str, Any]:
    """
    Cria um anúncio no Meta Ads.
    
    Args:
        tenant_id: ID do tenant no CRM
        account_id: ID da conta de anúncios
        adset_id: ID do adset (no CRM)
        name: Nome do anúncio
        creative_id: ID do criativo (imagem/vídeo)
        copy_id: ID da copy (se usar copy salva) - opcional
        headline: Título do anúncio (se não usar copy_id)
        primary_text: Texto principal (se não usar copy_id)
        description: Descrição (se não usar copy_id)
        call_to_action: LEARN_MORE, SHOP_NOW, SIGN_UP, etc.
        link_url: URL de destino
        status: PAUSED (padrão) ou ACTIVE
        
    Returns:
        Dict com ad_id e status
    """
    import asyncio
    
    logger.info(
        "Creating Meta ad",
        adset_id=adset_id,
        name=name,
        creative_id=creative_id
    )
    
    try:
        result = asyncio.get_event_loop().run_until_complete(
            _call_laravel_api(
                "POST",
                "internal/ads/create-ad",
                tenant_id,
                {
                    "adset_id": adset_id,
                    "name": name,
                    "creative_id": creative_id,
                    "copy_id": copy_id,
                    "creative": {
                        "headline": headline,
                        "primary_text": primary_text,
                        "description": description,
                        "call_to_action": call_to_action,
                        "link_url": link_url,
                    },
                    "status": status,
                }
            )
        )
        
        return {
            "success": True,
            "ad_id": result.get("ad", {}).get("id"),
            "platform_ad_id": result.get("ad", {}).get("platform_ad_id"),
            "message": f"✅ Anúncio '{name}' criado com sucesso!"
        }
        
    except Exception as e:
        logger.error("Failed to create ad", error=str(e))
        return {
            "success": False,
            "error": str(e),
            "message": f"❌ Erro ao criar anúncio: {str(e)}"
        }


@tool
def upload_creative_to_meta(
    tenant_id: str,
    account_id: str,
    creative_id: str,
    page_id: str
) -> Dict[str, Any]:
    """
    Faz upload de um criativo para o Meta Ads.
    
    Args:
        tenant_id: ID do tenant
        account_id: ID da conta de anúncios
        creative_id: ID do criativo no CRM
        page_id: ID da página do Facebook
        
    Returns:
        Dict com platform_media_id e status
    """
    import asyncio
    
    logger.info(
        "Uploading creative to Meta",
        creative_id=creative_id,
        page_id=page_id
    )
    
    try:
        result = asyncio.get_event_loop().run_until_complete(
            _call_laravel_api(
                "POST",
                "internal/ads/upload-creative",
                tenant_id,
                {
                    "creative_id": creative_id,
                    "account_id": account_id,
                    "page_id": page_id,
                }
            )
        )
        
        return {
            "success": True,
            "platform_media_id": result.get("platform_media_id"),
            "platform_hash": result.get("platform_hash"),
            "message": "✅ Criativo enviado para o Meta com sucesso!"
        }
        
    except Exception as e:
        logger.error("Failed to upload creative", error=str(e))
        return {
            "success": False,
            "error": str(e),
            "message": f"❌ Erro ao enviar criativo: {str(e)}"
        }


@tool
def get_meta_campaign_status(
    tenant_id: str,
    campaign_id: str
) -> Dict[str, Any]:
    """
    Verifica o status de uma campanha no Meta Ads.
    
    Args:
        tenant_id: ID do tenant
        campaign_id: ID da campanha no CRM
        
    Returns:
        Dict com status da campanha
    """
    import asyncio
    
    try:
        result = asyncio.get_event_loop().run_until_complete(
            _call_laravel_api(
                "GET",
                f"ads/campaigns/{campaign_id}",
                tenant_id
            )
        )
        
        campaign = result.get("data", result)
        
        return {
            "success": True,
            "campaign_id": campaign.get("id"),
            "name": campaign.get("name"),
            "status": campaign.get("status"),
            "objective": campaign.get("objective"),
            "daily_budget": campaign.get("daily_budget"),
            "spend": campaign.get("spend"),
            "impressions": campaign.get("impressions"),
            "clicks": campaign.get("clicks"),
        }
        
    except Exception as e:
        logger.error("Failed to get campaign status", error=str(e))
        return {
            "success": False,
            "error": str(e),
        }


@tool
def get_ad_account_insights(
    tenant_id: str,
    ad_account_id: str,
    date_preset: str = "last_7d"
) -> Dict[str, Any]:
    """
    Busca insights/métricas de uma conta de anúncios diretamente da API do Meta Ads.
    
    Args:
        tenant_id: ID do tenant
        ad_account_id: ID da conta de anúncios no CRM
        date_preset: Período de análise (today, yesterday, last_7d, last_14d, last_30d, this_month, last_month)
        
    Returns:
        Dict com métricas da conta (spend, impressions, clicks, conversions, ROAS, etc.)
    """
    import asyncio
    
    try:
        result = asyncio.get_event_loop().run_until_complete(
            _call_laravel_api(
                "GET",
                f"ads/accounts/{ad_account_id}/insights",
                tenant_id,
                {"date_preset": date_preset}
            )
        )
        
        data = result.get("data", result)
        
        return {
            "success": True,
            "ad_account_id": ad_account_id,
            "period": date_preset,
            "spend": data.get("spend", 0),
            "impressions": data.get("impressions", 0),
            "clicks": data.get("clicks", 0),
            "reach": data.get("reach", 0),
            "ctr": data.get("ctr", 0),
            "cpc": data.get("cpc", 0),
            "cpm": data.get("cpm", 0),
            "conversions": data.get("conversions", 0),
            "conversion_value": data.get("conversion_value", 0),
            "roas": data.get("roas", 0),
            "cost_per_conversion": data.get("cost_per_conversion", 0),
            "campaigns_active": data.get("campaigns_active", 0),
        }
        
    except Exception as e:
        logger.error("Failed to get account insights", error=str(e))
        return {
            "success": False,
            "error": str(e),
        }


@tool
def get_campaigns_insights(
    tenant_id: str,
    ad_account_id: str,
    date_preset: str = "last_7d"
) -> Dict[str, Any]:
    """
    Busca insights de todas as campanhas de uma conta de anúncios.
    
    Args:
        tenant_id: ID do tenant
        ad_account_id: ID da conta de anúncios no CRM
        date_preset: Período de análise (today, yesterday, last_7d, last_14d, last_30d)
        
    Returns:
        Dict com lista de campanhas e suas métricas
    """
    import asyncio
    
    try:
        result = asyncio.get_event_loop().run_until_complete(
            _call_laravel_api(
                "GET",
                f"ads/accounts/{ad_account_id}/campaigns/insights",
                tenant_id,
                {"date_preset": date_preset}
            )
        )
        
        campaigns = result.get("data", result.get("campaigns", []))
        
        # Formata resposta
        formatted_campaigns = []
        for campaign in campaigns:
            formatted_campaigns.append({
                "id": campaign.get("id"),
                "name": campaign.get("name"),
                "status": campaign.get("status"),
                "objective": campaign.get("objective"),
                "spend": campaign.get("spend", 0),
                "impressions": campaign.get("impressions", 0),
                "clicks": campaign.get("clicks", 0),
                "ctr": campaign.get("ctr", 0),
                "cpc": campaign.get("cpc", 0),
                "conversions": campaign.get("conversions", 0),
                "roas": campaign.get("roas", 0),
            })
        
        # Ordena por spend (maior primeiro)
        formatted_campaigns.sort(key=lambda x: x.get("spend", 0), reverse=True)
        
        return {
            "success": True,
            "ad_account_id": ad_account_id,
            "period": date_preset,
            "total_campaigns": len(formatted_campaigns),
            "campaigns": formatted_campaigns[:10],  # Top 10
        }
        
    except Exception as e:
        logger.error("Failed to get campaigns insights", error=str(e))
        return {
            "success": False,
            "error": str(e),
        }


@tool
def get_campaign_detailed_insights(
    tenant_id: str,
    campaign_id: str,
    date_preset: str = "last_7d"
) -> Dict[str, Any]:
    """
    Busca insights detalhados de uma campanha específica, incluindo breakdown por dia.
    
    Args:
        tenant_id: ID do tenant
        campaign_id: ID da campanha
        date_preset: Período de análise
        
    Returns:
        Dict com métricas detalhadas e evolução por dia
    """
    import asyncio
    
    try:
        result = asyncio.get_event_loop().run_until_complete(
            _call_laravel_api(
                "GET",
                f"ads/campaigns/{campaign_id}/detailed-insights",
                tenant_id,
                {"date_preset": date_preset}
            )
        )
        
        data = result.get("data", result)
        
        return {
            "success": True,
            "campaign_id": campaign_id,
            "name": data.get("name"),
            "status": data.get("status"),
            "objective": data.get("objective"),
            "period": date_preset,
            "summary": {
                "spend": data.get("spend", 0),
                "impressions": data.get("impressions", 0),
                "clicks": data.get("clicks", 0),
                "ctr": data.get("ctr", 0),
                "cpc": data.get("cpc", 0),
                "cpm": data.get("cpm", 0),
                "conversions": data.get("conversions", 0),
                "roas": data.get("roas", 0),
                "frequency": data.get("frequency", 0),
            },
            "daily_breakdown": data.get("daily_breakdown", []),
            "adsets": data.get("adsets", []),
            "insights": data.get("insights", []),
        }
        
    except Exception as e:
        logger.error("Failed to get campaign detailed insights", error=str(e))
        return {
            "success": False,
            "error": str(e),
        }

