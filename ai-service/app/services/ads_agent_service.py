"""
Ads Campaign Agent Service
Agente de IA para criar e gerenciar campanhas de anúncios no Meta e Google Ads.
"""

import json
import structlog
from typing import Optional, List, Dict, Any
from datetime import datetime
from openai import OpenAI
import httpx

logger = structlog.get_logger()


class AdsCampaignAgent:
    """
    Agente de IA para gerenciamento autônomo de campanhas de anúncios.
    
    Capacidades:
    - Criar campanhas completas (campanha → adset → anúncio)
    - Gerar copies otimizados (headlines, descrições, CTAs)
    - Sugerir segmentação de público
    - Otimizar campanhas em execução
    - Escalar campanhas vencedoras
    """
    
    def __init__(self, openai_api_key: str, laravel_api_url: str, openai_project_id: str = None):
        self.client = OpenAI(
            api_key=openai_api_key,
            project=openai_project_id,
        )
        self.laravel_api_url = laravel_api_url
        self.model = "gpt-4o"
        
    # =========================================================================
    # CRIAÇÃO DE CAMPANHAS
    # =========================================================================
    
    async def create_campaign_from_briefing(
        self,
        tenant_id: str,
        ad_account_id: str,
        briefing: Dict[str, Any],
        platform: str = "meta"
    ) -> Dict[str, Any]:
        """
        Cria uma campanha completa a partir de um briefing.
        
        Args:
            tenant_id: ID do tenant
            ad_account_id: ID da conta de anúncio
            briefing: {
                "product_name": "Nome do produto",
                "product_description": "Descrição do produto",
                "target_audience": "Descrição do público-alvo",
                "objective": "conversions|traffic|awareness|leads",
                "daily_budget": 100.00,
                "duration_days": 7,
                "landing_page_url": "https://...",
                "creative_urls": ["url1", "url2"],  # URLs das imagens/vídeos
                "tone_of_voice": "profissional|casual|urgente|inspirador",
                "key_benefits": ["benefício 1", "benefício 2"],
                "call_to_action": "Saiba Mais|Compre Agora|Cadastre-se",
            }
            platform: "meta" ou "google"
            
        Returns:
            Dict com IDs da campanha criada e status
        """
        logger.info("Creating campaign from briefing", 
                   tenant_id=tenant_id, 
                   product=briefing.get("product_name"))
        
        try:
            # 1. Gera estratégia de campanha
            strategy = await self._generate_campaign_strategy(briefing)
            
            # 2. Gera copies dos anúncios
            copies = await self._generate_ad_copies(briefing, strategy)
            
            # 3. Sugere segmentação de público
            targeting = await self._generate_targeting(briefing, platform)
            
            # 4. Cria a campanha na plataforma
            if platform == "meta":
                result = await self._create_meta_campaign(
                    tenant_id=tenant_id,
                    ad_account_id=ad_account_id,
                    briefing=briefing,
                    strategy=strategy,
                    copies=copies,
                    targeting=targeting
                )
            else:
                result = await self._create_google_campaign(
                    tenant_id=tenant_id,
                    ad_account_id=ad_account_id,
                    briefing=briefing,
                    strategy=strategy,
                    copies=copies,
                    targeting=targeting
                )
            
            return {
                "success": True,
                "platform": platform,
                "campaign": result,
                "strategy": strategy,
                "copies": copies,
                "targeting": targeting
            }
            
        except Exception as e:
            logger.error("Failed to create campaign", error=str(e))
            return {
                "success": False,
                "error": str(e)
            }
    
    async def _generate_campaign_strategy(self, briefing: Dict[str, Any]) -> Dict[str, Any]:
        """Gera estratégia de campanha usando IA."""
        
        prompt = f"""Você é um especialista em mídia paga com anos de experiência em Meta Ads e Google Ads.
        
Analise o briefing abaixo e crie uma estratégia de campanha otimizada:

BRIEFING:
- Produto: {briefing.get('product_name')}
- Descrição: {briefing.get('product_description')}
- Público-alvo: {briefing.get('target_audience')}
- Objetivo: {briefing.get('objective')}
- Orçamento diário: R$ {briefing.get('daily_budget')}
- Duração: {briefing.get('duration_days')} dias
- Benefícios principais: {', '.join(briefing.get('key_benefits', []))}

Retorne um JSON com a estratégia:
{{
    "campaign_name": "Nome sugerido para a campanha",
    "campaign_objective": "CONVERSIONS|TRAFFIC|REACH|LEAD_GENERATION",
    "optimization_goal": "OFFSITE_CONVERSIONS|LINK_CLICKS|IMPRESSIONS|LEAD_GENERATION",
    "bid_strategy": "LOWEST_COST|COST_CAP|BID_CAP",
    "recommended_budget_split": {{
        "testing_phase_days": 3,
        "testing_budget_percent": 30,
        "scaling_budget_percent": 70
    }},
    "adset_structure": {{
        "num_adsets": 2,
        "strategy": "Descrição da estratégia de divisão de adsets"
    }},
    "recommended_placements": ["feed", "stories", "reels"],
    "schedule_recommendation": "Descrição de quando rodar os anúncios",
    "success_metrics": ["CPA", "ROAS", "CTR"],
    "kpi_targets": {{
        "target_cpa": 50.00,
        "target_roas": 3.0,
        "target_ctr": 1.5
    }},
    "optimization_tips": ["dica 1", "dica 2", "dica 3"]
}}

Responda APENAS com o JSON, sem explicações adicionais."""

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            response_format={"type": "json_object"}
        )
        
        return json.loads(response.choices[0].message.content)
    
    async def _generate_ad_copies(
        self, 
        briefing: Dict[str, Any], 
        strategy: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Gera múltiplas variações de copy para os anúncios."""
        
        prompt = f"""Você é um copywriter especialista em anúncios de alta conversão.

BRIEFING:
- Produto: {briefing.get('product_name')}
- Descrição: {briefing.get('product_description')}
- Público-alvo: {briefing.get('target_audience')}
- Tom de voz: {briefing.get('tone_of_voice', 'profissional')}
- Benefícios: {', '.join(briefing.get('key_benefits', []))}
- CTA desejado: {briefing.get('call_to_action', 'Saiba Mais')}
- URL: {briefing.get('landing_page_url')}

ESTRATÉGIA DA CAMPANHA:
{json.dumps(strategy, indent=2, ensure_ascii=False)}

Crie 5 variações de anúncio otimizadas para conversão.

Retorne um JSON com array de copies:
{{
    "copies": [
        {{
            "variation_name": "Variação A - Foco em benefício",
            "primary_text": "Texto principal do anúncio (máx 125 caracteres para melhor performance)",
            "headline": "Headline chamativo (máx 40 caracteres)",
            "description": "Descrição complementar (máx 30 caracteres)",
            "call_to_action": "LEARN_MORE|SHOP_NOW|SIGN_UP|CONTACT_US|DOWNLOAD|GET_OFFER",
            "hook_type": "curiosity|benefit|urgency|social_proof|question",
            "estimated_effectiveness": 85
        }}
    ]
}}

REGRAS:
- Cada variação deve ter um ângulo/hook diferente
- Use gatilhos mentais (escassez, prova social, autoridade)
- Headlines devem ser impactantes e diretos
- Primary text deve gerar curiosidade ou desejo
- Mantenha consistência com o tom de voz solicitado

Responda APENAS com o JSON."""

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.8,
            response_format={"type": "json_object"}
        )
        
        result = json.loads(response.choices[0].message.content)
        return result.get("copies", [])
    
    async def _generate_targeting(
        self, 
        briefing: Dict[str, Any],
        platform: str
    ) -> Dict[str, Any]:
        """Gera sugestão de segmentação de público."""
        
        prompt = f"""Você é um especialista em segmentação de público para {platform.upper()} Ads.

BRIEFING:
- Produto: {briefing.get('product_name')}
- Descrição: {briefing.get('product_description')}
- Público-alvo descrito: {briefing.get('target_audience')}

Crie uma segmentação detalhada para {platform.upper()} Ads.

Retorne um JSON:
{{
    "targeting_strategy": "Descrição da estratégia de segmentação",
    "audiences": [
        {{
            "name": "Nome do público",
            "type": "interest|lookalike|custom|broad",
            "description": "Descrição do público",
            "age_min": 25,
            "age_max": 54,
            "genders": ["male", "female"],
            "locations": [
                {{"type": "country", "value": "BR"}},
                {{"type": "region", "value": "São Paulo"}}
            ],
            "interests": [
                {{"id": "interesse_id", "name": "Nome do interesse"}}
            ],
            "behaviors": [
                {{"id": "behavior_id", "name": "Nome do comportamento"}}
            ],
            "exclusions": ["público a excluir"],
            "estimated_reach": "1M - 5M",
            "priority": 1
        }}
    ],
    "placements": {{
        "automatic": false,
        "platforms": ["facebook", "instagram"],
        "positions": ["feed", "stories", "reels", "right_column"]
    }},
    "optimization_suggestions": [
        "Sugestão 1",
        "Sugestão 2"
    ]
}}

Responda APENAS com o JSON."""

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            response_format={"type": "json_object"}
        )
        
        return json.loads(response.choices[0].message.content)
    
    async def _create_meta_campaign(
        self,
        tenant_id: str,
        ad_account_id: str,
        briefing: Dict[str, Any],
        strategy: Dict[str, Any],
        copies: List[Dict[str, Any]],
        targeting: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Cria campanha no Meta Ads via API do Laravel."""
        
        # Prepara payload para o Laravel
        payload = {
            "tenant_id": tenant_id,
            "ad_account_id": ad_account_id,
            "campaign": {
                "name": strategy.get("campaign_name"),
                "objective": strategy.get("campaign_objective"),
                "status": "PAUSED",  # Sempre cria pausada para revisão
                "daily_budget": briefing.get("daily_budget"),
                "bid_strategy": strategy.get("bid_strategy"),
            },
            "adsets": [],
            "ads": []
        }
        
        # Cria adsets baseado na estratégia
        audiences = targeting.get("audiences", [])
        for i, audience in enumerate(audiences[:strategy.get("adset_structure", {}).get("num_adsets", 2)]):
            adset = {
                "name": f"{strategy.get('campaign_name')} - {audience.get('name')}",
                "optimization_goal": strategy.get("optimization_goal"),
                "billing_event": "IMPRESSIONS",
                "targeting": {
                    "age_min": audience.get("age_min", 18),
                    "age_max": audience.get("age_max", 65),
                    "genders": audience.get("genders", []),
                    "geo_locations": audience.get("locations", []),
                    "interests": audience.get("interests", []),
                    "behaviors": audience.get("behaviors", []),
                },
                "placements": targeting.get("placements", {})
            }
            payload["adsets"].append(adset)
        
        # Cria anúncios com os copies gerados
        creative_urls = briefing.get("creative_urls", [])
        for copy in copies[:3]:  # Máximo 3 variações por enquanto
            ad = {
                "name": copy.get("variation_name"),
                "creative": {
                    "primary_text": copy.get("primary_text"),
                    "headline": copy.get("headline"),
                    "description": copy.get("description"),
                    "call_to_action": copy.get("call_to_action"),
                    "link_url": briefing.get("landing_page_url"),
                    "image_url": creative_urls[0] if creative_urls else None
                }
            }
            payload["ads"].append(ad)
        
        # Envia para o Laravel criar na API do Meta
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.laravel_api_url}/api/ads/agent/create-campaign",
                json=payload,
                headers={"X-Tenant-ID": tenant_id}
            )
            
            if response.status_code != 200:
                raise Exception(f"Failed to create campaign: {response.text}")
            
            return response.json()
    
    async def _create_google_campaign(
        self,
        tenant_id: str,
        ad_account_id: str,
        briefing: Dict[str, Any],
        strategy: Dict[str, Any],
        copies: List[Dict[str, Any]],
        targeting: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Cria campanha no Google Ads via API do Laravel."""
        
        # Implementação similar ao Meta, adaptada para Google Ads
        payload = {
            "tenant_id": tenant_id,
            "ad_account_id": ad_account_id,
            "platform": "google",
            "campaign": {
                "name": strategy.get("campaign_name"),
                "campaign_type": "SEARCH" if briefing.get("objective") == "traffic" else "PERFORMANCE_MAX",
                "budget": briefing.get("daily_budget"),
                "bidding_strategy": "MAXIMIZE_CONVERSIONS",
                "status": "PAUSED"
            },
            "ad_groups": [],
            "ads": []
        }
        
        # Para Google, criamos ad groups em vez de adsets
        for copy in copies[:3]:
            ad_group = {
                "name": copy.get("variation_name"),
                "targeting": targeting
            }
            payload["ad_groups"].append(ad_group)
            
            # Responsive Search Ad
            ad = {
                "type": "RESPONSIVE_SEARCH_AD",
                "headlines": [
                    copy.get("headline"),
                    briefing.get("product_name"),
                    copy.get("primary_text")[:30] if copy.get("primary_text") else ""
                ],
                "descriptions": [
                    copy.get("description"),
                    copy.get("primary_text")[:90] if copy.get("primary_text") else ""
                ],
                "final_url": briefing.get("landing_page_url")
            }
            payload["ads"].append(ad)
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.laravel_api_url}/api/ads/agent/create-campaign",
                json=payload,
                headers={"X-Tenant-ID": tenant_id}
            )
            
            if response.status_code != 200:
                raise Exception(f"Failed to create campaign: {response.text}")
            
            return response.json()
    
    # =========================================================================
    # OTIMIZAÇÃO DE CAMPANHAS
    # =========================================================================
    
    async def analyze_and_optimize(
        self,
        tenant_id: str,
        campaign_id: str
    ) -> Dict[str, Any]:
        """
        Analisa uma campanha existente e sugere/executa otimizações.
        """
        
        # Busca dados da campanha
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.laravel_api_url}/api/ads/campaigns/{campaign_id}/full-report",
                headers={"X-Tenant-ID": tenant_id}
            )
            
            if response.status_code != 200:
                raise Exception("Failed to fetch campaign data")
            
            campaign_data = response.json()
        
        # Analisa com IA
        analysis = await self._analyze_campaign_performance(campaign_data)
        
        # Gera ações de otimização
        actions = await self._generate_optimization_actions(campaign_data, analysis)
        
        return {
            "campaign_id": campaign_id,
            "analysis": analysis,
            "recommended_actions": actions,
            "auto_executable": [a for a in actions if a.get("auto_executable")],
            "requires_approval": [a for a in actions if not a.get("auto_executable")]
        }
    
    async def _analyze_campaign_performance(
        self, 
        campaign_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Analisa performance da campanha com IA."""
        
        prompt = f"""Analise os dados desta campanha de anúncios e forneça insights:

DADOS DA CAMPANHA:
{json.dumps(campaign_data, indent=2, ensure_ascii=False)}

Retorne um JSON com a análise:
{{
    "overall_health": "excellent|good|needs_attention|critical",
    "health_score": 85,
    "summary": "Resumo executivo da performance",
    "strengths": ["ponto forte 1", "ponto forte 2"],
    "weaknesses": ["ponto fraco 1", "ponto fraco 2"],
    "opportunities": ["oportunidade 1", "oportunidade 2"],
    "threats": ["ameaça 1"],
    "top_performing_ads": ["ad_id_1", "ad_id_2"],
    "underperforming_ads": ["ad_id_3"],
    "budget_efficiency": {{
        "score": 75,
        "recommendation": "Descrição"
    }},
    "audience_insights": {{
        "best_performing_segment": "Descrição",
        "recommended_expansion": "Descrição"
    }},
    "creative_insights": {{
        "winning_elements": ["elemento 1", "elemento 2"],
        "suggested_tests": ["teste A/B 1", "teste A/B 2"]
    }}
}}

Responda APENAS com o JSON."""

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
            response_format={"type": "json_object"}
        )
        
        return json.loads(response.choices[0].message.content)
    
    async def _generate_optimization_actions(
        self,
        campaign_data: Dict[str, Any],
        analysis: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Gera lista de ações de otimização."""
        
        prompt = f"""Com base na análise da campanha, sugira ações concretas de otimização:

ANÁLISE:
{json.dumps(analysis, indent=2, ensure_ascii=False)}

DADOS DA CAMPANHA:
{json.dumps(campaign_data, indent=2, ensure_ascii=False)}

Retorne um JSON com ações de otimização:
{{
    "actions": [
        {{
            "action_id": "unique_id",
            "action_type": "pause_ad|scale_budget|adjust_bid|change_targeting|create_variation|pause_adset",
            "priority": "high|medium|low",
            "entity_type": "campaign|adset|ad",
            "entity_id": "id_da_entidade",
            "entity_name": "Nome da entidade",
            "description": "Descrição clara da ação",
            "reason": "Justificativa baseada em dados",
            "expected_impact": "Impacto esperado",
            "parameters": {{
                "current_value": 100,
                "new_value": 150,
                "change_percent": 50
            }},
            "auto_executable": true,
            "risk_level": "low|medium|high",
            "estimated_improvement": "+15% ROAS"
        }}
    ]
}}

REGRAS:
- Priorize ações de alto impacto e baixo risco
- Inclua justificativa baseada em dados para cada ação
- Marque como auto_executable apenas ações seguras (pausar underperformers, pequenos ajustes de bid)
- Ações de alto risco (aumentar orçamento >50%, mudar targeting) devem requerer aprovação

Responda APENAS com o JSON."""

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
            response_format={"type": "json_object"}
        )
        
        result = json.loads(response.choices[0].message.content)
        return result.get("actions", [])
    
    # =========================================================================
    # ESCALA DE CAMPANHAS
    # =========================================================================
    
    async def scale_winning_campaign(
        self,
        tenant_id: str,
        campaign_id: str,
        scale_factor: float = 1.5,
        strategy: str = "gradual"
    ) -> Dict[str, Any]:
        """
        Escala uma campanha vencedora.
        
        Estratégias:
        - gradual: Aumenta 20% a cada 2 dias
        - aggressive: Aumenta 50% imediatamente
        - duplicate: Duplica a campanha com novo público
        """
        
        logger.info("Scaling campaign", 
                   campaign_id=campaign_id, 
                   scale_factor=scale_factor,
                   strategy=strategy)
        
        # Busca dados da campanha
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.laravel_api_url}/api/ads/campaigns/{campaign_id}",
                headers={"X-Tenant-ID": tenant_id}
            )
            campaign = response.json()
        
        # Gera plano de escala
        scale_plan = await self._generate_scale_plan(campaign, scale_factor, strategy)
        
        return {
            "campaign_id": campaign_id,
            "scale_plan": scale_plan,
            "status": "pending_approval"
        }
    
    async def _generate_scale_plan(
        self,
        campaign: Dict[str, Any],
        scale_factor: float,
        strategy: str
    ) -> Dict[str, Any]:
        """Gera plano detalhado de escala."""
        
        current_budget = campaign.get("daily_budget", 0)
        target_budget = current_budget * scale_factor
        
        if strategy == "gradual":
            # Escala gradual: 20% a cada 2 dias
            steps = []
            step_budget = current_budget
            step_increase = 0.2
            days = 0
            
            while step_budget < target_budget:
                step_budget = min(step_budget * (1 + step_increase), target_budget)
                days += 2
                steps.append({
                    "day": days,
                    "budget": round(step_budget, 2),
                    "increase_percent": round((step_budget / current_budget - 1) * 100, 1)
                })
            
            return {
                "strategy": "gradual",
                "current_budget": current_budget,
                "target_budget": target_budget,
                "total_days": days,
                "steps": steps,
                "risk_level": "low",
                "recommendation": "Escala gradual recomendada para manter performance estável"
            }
            
        elif strategy == "aggressive":
            return {
                "strategy": "aggressive",
                "current_budget": current_budget,
                "target_budget": target_budget,
                "steps": [{
                    "day": 1,
                    "budget": target_budget,
                    "increase_percent": (scale_factor - 1) * 100
                }],
                "risk_level": "high",
                "recommendation": "Escala agressiva pode causar instabilidade. Monitore de perto."
            }
            
        elif strategy == "duplicate":
            return {
                "strategy": "duplicate",
                "current_budget": current_budget,
                "new_campaign_budget": current_budget,
                "total_budget": current_budget * 2,
                "actions": [
                    "Manter campanha original",
                    "Criar cópia com novo público lookalike",
                    "Testar novos placements na cópia"
                ],
                "risk_level": "medium",
                "recommendation": "Duplicação permite testar novos públicos sem afetar campanha vencedora"
            }
        
        return {}
    
    # =========================================================================
    # GERAÇÃO DE NOVOS CRIATIVOS
    # =========================================================================
    
    async def generate_new_ad_variations(
        self,
        tenant_id: str,
        campaign_id: str,
        num_variations: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Gera novas variações de anúncio baseado nos winners da campanha.
        """
        
        # Busca dados da campanha e anúncios
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.laravel_api_url}/api/ads/campaigns/{campaign_id}/ads",
                headers={"X-Tenant-ID": tenant_id}
            )
            ads = response.json().get("data", [])
        
        # Identifica os winners
        winners = sorted(ads, key=lambda x: x.get("performance_score", 0), reverse=True)[:2]
        
        if not winners:
            return []
        
        # Gera novas variações baseadas nos winners
        prompt = f"""Analise estes anúncios de alta performance e crie {num_variations} novas variações:

ANÚNCIOS VENCEDORES:
{json.dumps(winners, indent=2, ensure_ascii=False)}

Crie variações que:
1. Mantenham os elementos que funcionam (hooks, estrutura)
2. Testem novos ângulos e abordagens
3. Variem o tom de voz sutilmente
4. Testem diferentes gatilhos mentais

Retorne um JSON:
{{
    "variations": [
        {{
            "name": "Variação baseada em [Winner Name] - Ângulo X",
            "primary_text": "Texto principal",
            "headline": "Headline",
            "description": "Descrição",
            "call_to_action": "CTA",
            "inspiration": "Baseado no anúncio X, testando Y",
            "hypothesis": "Hipótese que esta variação testa"
        }}
    ]
}}

Responda APENAS com o JSON."""

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.9,
            response_format={"type": "json_object"}
        )
        
        result = json.loads(response.choices[0].message.content)
        return result.get("variations", [])


# Instância global do agente
ads_agent: Optional[AdsCampaignAgent] = None


def get_ads_agent() -> AdsCampaignAgent:
    """Retorna instância do agente de Ads."""
    global ads_agent
    
    if ads_agent is None:
        from app.config import get_settings
        settings = get_settings()
        
        if not settings.openai_api_key:
            raise ValueError("OPENAI_API_KEY não configurada no .env do AI Service")
        
        ads_agent = AdsCampaignAgent(
            openai_api_key=settings.openai_api_key,
            laravel_api_url=settings.LARAVEL_API_URL,
            openai_project_id=settings.openai_project_id
        )
    
    return ads_agent

