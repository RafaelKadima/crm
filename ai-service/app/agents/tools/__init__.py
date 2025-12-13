"""
Tools para o Agente Orquestrador de Ads.

Cada tool é uma função que pode ser chamada pelo agente
para executar ações específicas.
"""

from .meta_ads_tools import (
    create_meta_campaign,
    create_meta_adset,
    create_meta_ad,
    upload_creative_to_meta,
    get_meta_campaign_status,
    get_ad_account_insights,
    get_campaigns_insights,
    get_campaign_detailed_insights,
)

from .database_tools import (
    get_tenant_config,
    list_available_creatives,
    list_available_copies,
    get_creative_by_id,
    get_copy_by_id,
    save_campaign_to_database,
    update_creative_status,
    update_copy_status,
    list_ad_campaigns,
    sync_and_list_campaigns,
)

__all__ = [
    # Meta Ads Tools
    'create_meta_campaign',
    'create_meta_adset',
    'create_meta_ad',
    'upload_creative_to_meta',
    'get_meta_campaign_status',
    'get_ad_account_insights',
    'get_campaigns_insights',
    'get_campaign_detailed_insights',
    # Database Tools
    'get_tenant_config',
    'list_available_creatives',
    'list_available_copies',
    'get_creative_by_id',
    'get_copy_by_id',
    'save_campaign_to_database',
    'update_creative_status',
    'update_copy_status',
    'list_ad_campaigns',
    'sync_and_list_campaigns',
]
