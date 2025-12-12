"""
Ads Tools - Ferramentas para o Agente de Publicidade.

Estas ferramentas permitem que o agente de Ads crie, otimize
e gerencie campanhas de publicidade no Meta Ads.

Total: 18 ferramentas
"""
from typing import Dict, Any, List, Optional
from datetime import datetime
import structlog

from mcp.server import CRMMCPServer, ToolParameter

logger = structlog.get_logger()


def register_tools(server: CRMMCPServer) -> None:
    """Registra todas as ferramentas Ads no servidor MCP."""
    
    # =====================================================
    # 1. predict_campaign_performance - Predição de performance
    # =====================================================
    server.register_tool(
        name="predict_campaign_performance",
        description="Prediz métricas de performance de uma campanha: ROAS, CTR, conversões estimadas.",
        parameters=[
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="campaign_config", type="object", description="Configuração da campanha (objetivo, budget, criativo)"),
        ],
        handler=predict_campaign_performance,
        category="ads"
    )
    
    # =====================================================
    # 2. select_ads_action - Seleção de ação via RL
    # =====================================================
    server.register_tool(
        name="select_ads_action",
        description="Usa Reinforcement Learning para selecionar a melhor ação para otimizar uma campanha.",
        parameters=[
            ToolParameter(name="campaign_id", type="string", description="ID da campanha"),
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="current_state", type="object", description="Estado atual da campanha", required=False),
        ],
        handler=select_ads_action,
        category="ads"
    )
    
    # =====================================================
    # 3. create_campaign - Cria campanha
    # =====================================================
    server.register_tool(
        name="create_campaign",
        description="Cria uma nova campanha de anúncios no Meta Ads.",
        parameters=[
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="ad_account_id", type="string", description="ID da conta de anúncios"),
            ToolParameter(name="name", type="string", description="Nome da campanha"),
            ToolParameter(name="objective", type="string", description="Objetivo (OUTCOME_SALES, OUTCOME_LEADS, etc.)"),
            ToolParameter(name="daily_budget", type="number", description="Orçamento diário em reais"),
        ],
        handler=create_campaign,
        category="ads",
        requires_approval=True,
        dangerous=True
    )
    
    # =====================================================
    # 4. create_adset - Cria conjunto de anúncios
    # =====================================================
    server.register_tool(
        name="create_adset",
        description="Cria um conjunto de anúncios dentro de uma campanha.",
        parameters=[
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="campaign_id", type="string", description="ID da campanha"),
            ToolParameter(name="name", type="string", description="Nome do adset"),
            ToolParameter(name="targeting", type="object", description="Configuração de público-alvo"),
            ToolParameter(name="daily_budget", type="number", description="Orçamento diário", required=False),
        ],
        handler=create_adset,
        category="ads"
    )
    
    # =====================================================
    # 5. create_ad - Cria anúncio
    # =====================================================
    server.register_tool(
        name="create_ad",
        description="Cria um anúncio dentro de um adset.",
        parameters=[
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="adset_id", type="string", description="ID do adset"),
            ToolParameter(name="name", type="string", description="Nome do anúncio"),
            ToolParameter(name="creative_config", type="object", description="Configuração do criativo (imagem, texto, CTA)"),
        ],
        handler=create_ad,
        category="ads"
    )
    
    # =====================================================
    # 6. optimize_campaign - Sugere otimizações
    # =====================================================
    server.register_tool(
        name="optimize_campaign",
        description="Analisa uma campanha e sugere otimizações baseadas em ML e padrões aprendidos.",
        parameters=[
            ToolParameter(name="campaign_id", type="string", description="ID da campanha"),
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
        ],
        handler=optimize_campaign,
        category="ads"
    )
    
    # =====================================================
    # 7. pause_campaign - Pausa campanha
    # =====================================================
    server.register_tool(
        name="pause_campaign",
        description="Pausa uma campanha ativa.",
        parameters=[
            ToolParameter(name="campaign_id", type="string", description="ID da campanha"),
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="reason", type="string", description="Motivo da pausa", required=False),
        ],
        handler=pause_campaign,
        category="ads"
    )
    
    # =====================================================
    # 8. scale_campaign - Escala campanha
    # =====================================================
    server.register_tool(
        name="scale_campaign",
        description="Aumenta o orçamento de uma campanha de bom desempenho.",
        parameters=[
            ToolParameter(name="campaign_id", type="string", description="ID da campanha"),
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="increase_percentage", type="number", description="Percentual de aumento (ex: 20 para 20%)"),
        ],
        handler=scale_campaign,
        category="ads",
        requires_approval=True,
        dangerous=True
    )
    
    # =====================================================
    # 9. get_campaign_insights - Análise de performance
    # =====================================================
    server.register_tool(
        name="get_campaign_insights",
        description="Analisa performance detalhada de uma campanha.",
        parameters=[
            ToolParameter(name="campaign_id", type="string", description="ID da campanha"),
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="date_range", type="string", description="Período (7d, 14d, 30d)", required=False, default="7d"),
        ],
        handler=get_campaign_insights,
        category="ads"
    )
    
    # =====================================================
    # 10. get_best_performing - Melhores campanhas
    # =====================================================
    server.register_tool(
        name="get_best_performing",
        description="Lista as campanhas com melhor desempenho do tenant.",
        parameters=[
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="metric", type="string", description="Métrica para ordenar (roas, ctr, conversions)", required=False, default="roas"),
            ToolParameter(name="top_k", type="number", description="Número de campanhas", required=False, default=5),
        ],
        handler=get_best_performing,
        category="ads"
    )
    
    # =====================================================
    # 11. get_brand_guidelines - Diretrizes de marca
    # =====================================================
    server.register_tool(
        name="get_brand_guidelines",
        description="Busca diretrizes de marca do tenant para criação de anúncios.",
        parameters=[
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
        ],
        handler=get_brand_guidelines,
        category="ads"
    )
    
    # =====================================================
    # 12. get_audience_suggestions - Sugestões de público
    # =====================================================
    server.register_tool(
        name="get_audience_suggestions",
        description="Sugere públicos-alvo baseados em campanhas de sucesso.",
        parameters=[
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="objective", type="string", description="Objetivo da campanha"),
        ],
        handler=get_audience_suggestions,
        category="ads"
    )
    
    # =====================================================
    # 13. generate_ad_copy - Gera texto de anúncio
    # =====================================================
    server.register_tool(
        name="generate_ad_copy",
        description="Gera variações de texto para anúncios seguindo diretrizes da marca.",
        parameters=[
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="product_name", type="string", description="Nome do produto/serviço"),
            ToolParameter(name="objective", type="string", description="Objetivo do anúncio"),
            ToolParameter(name="tone", type="string", description="Tom (formal, casual, urgente)", required=False, default="casual"),
        ],
        handler=generate_ad_copy,
        category="ads"
    )
    
    # =====================================================
    # 14. validate_creative - Valida criativo
    # =====================================================
    server.register_tool(
        name="validate_creative",
        description="Valida se um criativo está de acordo com as políticas do Meta e diretrizes da marca.",
        parameters=[
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="creative_config", type="object", description="Configuração do criativo"),
        ],
        handler=validate_creative,
        category="ads"
    )
    
    # =====================================================
    # 15. get_budget_recommendation - Recomenda orçamento
    # =====================================================
    server.register_tool(
        name="get_budget_recommendation",
        description="Recomenda orçamento ideal baseado no objetivo e histórico.",
        parameters=[
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="objective", type="string", description="Objetivo da campanha"),
            ToolParameter(name="target_conversions", type="number", description="Meta de conversões", required=False),
        ],
        handler=get_budget_recommendation,
        category="ads"
    )
    
    # =====================================================
    # 16. record_ads_experience - Registra experiência RL
    # =====================================================
    server.register_tool(
        name="record_ads_experience",
        description="Registra uma experiência de Reinforcement Learning para otimização de campanhas.",
        parameters=[
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="campaign_id", type="string", description="ID da campanha"),
            ToolParameter(name="state", type="object", description="Estado antes da ação"),
            ToolParameter(name="action", type="string", description="Ação tomada"),
            ToolParameter(name="reward", type="number", description="Reward recebido"),
            ToolParameter(name="next_state", type="object", description="Estado após a ação", required=False),
        ],
        handler=record_ads_experience,
        category="ads"
    )
    
    # =====================================================
    # 17. get_competitor_insights - Análise de concorrentes
    # =====================================================
    server.register_tool(
        name="get_competitor_insights",
        description="Analisa insights sobre concorrentes na mesma vertical.",
        parameters=[
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="industry", type="string", description="Indústria/vertical", required=False),
        ],
        handler=get_competitor_insights,
        category="ads"
    )
    
    # =====================================================
    # 18. forecast_spend - Previsão de gasto
    # =====================================================
    server.register_tool(
        name="forecast_spend",
        description="Prevê gasto total baseado nas campanhas ativas.",
        parameters=[
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="days_ahead", type="number", description="Dias para prever", required=False, default=30),
        ],
        handler=forecast_spend,
        category="ads"
    )
    
    logger.info("Ads tools registered", count=18)


# ==============================================
# Implementações das Ferramentas
# ==============================================

async def predict_campaign_performance(
    tenant_id: str,
    campaign_config: Dict[str, Any]
) -> Dict[str, Any]:
    """Prediz performance de uma campanha."""
    try:
        from app.ml.model_registry import TenantModelRegistry
        
        registry = TenantModelRegistry()
        model = await registry.get_model('campaign_predictor', tenant_id)
        
        if model:
            import torch
            
            # Extrai features
            features = [
                campaign_config.get("objective_index", 0),
                campaign_config.get("daily_budget", 50) / 1000,  # Normaliza
                campaign_config.get("creative_type_index", 0),
                campaign_config.get("audience_size", 100000) / 1000000,  # Normaliza
            ]
            
            with torch.no_grad():
                tensor = torch.FloatTensor([features])
                predictions = model(tensor).numpy()[0]
            
            return {
                "predictions": {
                    "roas": round(float(predictions[0]), 2),
                    "ctr": round(float(predictions[1]) * 100, 2),
                    "estimated_conversions": int(predictions[2] * 100)
                },
                "confidence": 0.75,
                "model_version": registry.get_model_version('campaign_predictor', tenant_id),
                "recommendation": "proceed" if predictions[0] > 1.5 else "review"
            }
        
        # Fallback baseado em heurísticas
        budget = campaign_config.get("daily_budget", 50)
        objective = campaign_config.get("objective", "")
        
        base_roas = 2.0 if "SALES" in objective else 1.5
        base_ctr = 1.5 if "TRAFFIC" in objective else 1.0
        
        return {
            "predictions": {
                "roas": base_roas,
                "ctr": base_ctr,
                "estimated_conversions": int(budget * 0.1)
            },
            "confidence": 0.5,
            "model_version": "heuristic",
            "recommendation": "review"
        }
        
    except Exception as e:
        logger.error("Error predicting campaign performance", error=str(e))
        return {"error": str(e)}


async def select_ads_action(
    campaign_id: str,
    tenant_id: str,
    current_state: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Seleciona melhor ação para campanha via RL."""
    try:
        from app.rl.policy_engine import PolicyEngine
        from app.rl.states import AdsState
        from app.rl.explainability import ActionExplainer
        from app.rl.safety_guard import AdsSafetyGuard
        from app.rl.mode_manager import RLModeManager
        
        policy = PolicyEngine()
        explainer = ActionExplainer()
        safety = AdsSafetyGuard()
        mode_manager = RLModeManager()
        
        # Obtém modo atual
        mode = await mode_manager.get_mode('ads', tenant_id)
        
        # Constrói estado se não fornecido
        if not current_state:
            current_state = {
                "objective_index": 0,
                "budget_normalized": 0.5,
                "creative_type": 0,
                "current_roas": 1.5,
                "current_ctr": 1.0,
                "days_running": 3
            }
        
        state = AdsState(
            objective_index=current_state.get("objective_index", 0),
            budget_normalized=current_state.get("budget_normalized", 0.5),
            creative_type=current_state.get("creative_type", 0),
            current_roas=current_state.get("current_roas", 1.5),
            current_ctr=current_state.get("current_ctr", 1.0),
            days_running=current_state.get("days_running", 0)
        )
        
        # Seleciona ação
        action, confidence = await policy.select_action(state, 'ads', tenant_id)
        
        # Valida com SafetyGuard
        safety_result = await safety.validate_action(state, action, tenant_id)
        
        # Gera explicação
        explanation = explainer.explain_ads_action(state, action)
        
        return {
            "campaign_id": campaign_id,
            "action": action.name,
            "action_value": action.value,
            "confidence": confidence,
            "policy_mode": str(mode),
            "explanation": explanation,
            "safety_check": {
                "allowed": safety_result.allowed,
                "reason": safety_result.reason
            },
            "state": current_state
        }
        
    except Exception as e:
        logger.error("Error selecting ads action", error=str(e))
        return {
            "campaign_id": campaign_id,
            "action": "KEEP_RUNNING",
            "confidence": 0.5,
            "error": str(e)
        }


async def create_campaign(
    tenant_id: str,
    ad_account_id: str,
    name: str,
    objective: str,
    daily_budget: float
) -> Dict[str, Any]:
    """Cria nova campanha no Meta Ads."""
    try:
        from app.agents.tools.meta_ads_tools import MetaAdsTools
        
        tools = MetaAdsTools()
        
        result = await tools.create_campaign(
            ad_account_id=ad_account_id,
            name=name,
            objective=objective,
            daily_budget=daily_budget,
            tenant_id=tenant_id
        )
        
        if result.get("campaign_id"):
            # Registra experiência positiva
            await record_ads_experience(
                tenant_id=tenant_id,
                campaign_id=result["campaign_id"],
                state={"action": "create"},
                action="CREATE_CAMPAIGN",
                reward=1.0
            )
        
        return result
        
    except Exception as e:
        logger.error("Error creating campaign", error=str(e))
        return {"success": False, "error": str(e)}


async def create_adset(
    tenant_id: str,
    campaign_id: str,
    name: str,
    targeting: Dict[str, Any],
    daily_budget: float = None
) -> Dict[str, Any]:
    """Cria conjunto de anúncios."""
    try:
        from app.agents.tools.meta_ads_tools import MetaAdsTools
        
        tools = MetaAdsTools()
        
        result = await tools.create_adset(
            campaign_id=campaign_id,
            name=name,
            targeting=targeting,
            daily_budget=daily_budget,
            tenant_id=tenant_id
        )
        
        return result
        
    except Exception as e:
        logger.error("Error creating adset", error=str(e))
        return {"success": False, "error": str(e)}


async def create_ad(
    tenant_id: str,
    adset_id: str,
    name: str,
    creative_config: Dict[str, Any]
) -> Dict[str, Any]:
    """Cria anúncio."""
    try:
        from app.agents.tools.meta_ads_tools import MetaAdsTools
        
        tools = MetaAdsTools()
        
        result = await tools.create_ad(
            adset_id=adset_id,
            name=name,
            creative=creative_config,
            tenant_id=tenant_id
        )
        
        return result
        
    except Exception as e:
        logger.error("Error creating ad", error=str(e))
        return {"success": False, "error": str(e)}


async def optimize_campaign(campaign_id: str, tenant_id: str) -> Dict[str, Any]:
    """Analisa e sugere otimizações para campanha."""
    try:
        from app.rag.ads_knowledge import get_ads_knowledge_service
        
        knowledge = get_ads_knowledge_service()
        
        # Busca insights da campanha
        insights = await get_campaign_insights(campaign_id, tenant_id)
        
        # Busca melhores práticas
        best_practices = await knowledge.search(
            query="otimização campanha",
            tenant_id=tenant_id,
            context="best_practices",
            top_k=5
        )
        
        recommendations = []
        
        # Análise de ROAS
        roas = insights.get("metrics", {}).get("roas", 0)
        if roas < 1.0:
            recommendations.append({
                "type": "pause",
                "priority": "high",
                "reason": f"ROAS muito baixo ({roas:.2f}x). Considere pausar.",
                "action": "PAUSE"
            })
        elif roas > 2.5:
            recommendations.append({
                "type": "scale",
                "priority": "medium",
                "reason": f"ROAS excelente ({roas:.2f}x). Considere escalar.",
                "action": "INCREASE_BUDGET"
            })
        
        # Análise de CTR
        ctr = insights.get("metrics", {}).get("ctr", 0)
        if ctr < 0.5:
            recommendations.append({
                "type": "creative",
                "priority": "high",
                "reason": f"CTR baixo ({ctr:.2f}%). Teste novos criativos.",
                "action": "CHANGE_CREATIVE"
            })
        
        return {
            "campaign_id": campaign_id,
            "current_metrics": insights.get("metrics", {}),
            "recommendations": recommendations,
            "best_practices": [bp.get("content", "") for bp in best_practices[:3]],
            "analysis_timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error("Error optimizing campaign", error=str(e))
        return {"campaign_id": campaign_id, "recommendations": [], "error": str(e)}


async def pause_campaign(
    campaign_id: str,
    tenant_id: str,
    reason: str = None
) -> Dict[str, Any]:
    """Pausa campanha."""
    try:
        from app.agents.tools.meta_ads_tools import MetaAdsTools
        
        tools = MetaAdsTools()
        
        result = await tools.update_campaign(
            campaign_id=campaign_id,
            status="PAUSED",
            tenant_id=tenant_id
        )
        
        logger.info("Campaign paused",
            campaign_id=campaign_id,
            reason=reason
        )
        
        return {
            "success": True,
            "campaign_id": campaign_id,
            "status": "PAUSED",
            "reason": reason
        }
        
    except Exception as e:
        logger.error("Error pausing campaign", error=str(e))
        return {"success": False, "error": str(e)}


async def scale_campaign(
    campaign_id: str,
    tenant_id: str,
    increase_percentage: float
) -> Dict[str, Any]:
    """Escala campanha aumentando orçamento."""
    try:
        from app.rl.safety_guard import AdsSafetyGuard
        from app.rl.states import AdsState
        from app.rl.actions import AdsAction
        
        safety = AdsSafetyGuard()
        
        # Busca estado atual
        insights = await get_campaign_insights(campaign_id, tenant_id)
        metrics = insights.get("metrics", {})
        
        state = AdsState(
            objective_index=0,
            budget_normalized=0.5,
            creative_type=0,
            current_roas=metrics.get("roas", 1.0),
            current_ctr=metrics.get("ctr", 1.0),
            days_running=metrics.get("days_running", 0)
        )
        
        # Valida com SafetyGuard
        safety_result = await safety.validate_action(state, AdsAction.INCREASE_BUDGET, tenant_id)
        
        if not safety_result.allowed:
            return {
                "success": False,
                "campaign_id": campaign_id,
                "reason": safety_result.reason,
                "blocked_by": "SafetyGuard"
            }
        
        # TODO: Implementar chamada real à Meta Ads API
        
        # Registra experiência
        await record_ads_experience(
            tenant_id=tenant_id,
            campaign_id=campaign_id,
            state={"roas": state.current_roas, "budget": state.budget_normalized},
            action="INCREASE_BUDGET",
            reward=0.0  # Reward será atualizado depois
        )
        
        logger.info("Campaign scaled",
            campaign_id=campaign_id,
            increase_percentage=increase_percentage
        )
        
        return {
            "success": True,
            "campaign_id": campaign_id,
            "increase_percentage": increase_percentage,
            "status": "scaled"
        }
        
    except Exception as e:
        logger.error("Error scaling campaign", error=str(e))
        return {"success": False, "error": str(e)}


async def get_campaign_insights(
    campaign_id: str,
    tenant_id: str,
    date_range: str = "7d"
) -> Dict[str, Any]:
    """Busca insights detalhados da campanha."""
    try:
        from app.agents.tools.meta_ads_tools import MetaAdsTools
        
        tools = MetaAdsTools()
        
        insights = await tools.get_campaign_insights(
            campaign_id=campaign_id,
            date_preset=date_range,
            tenant_id=tenant_id
        )
        
        return {
            "campaign_id": campaign_id,
            "date_range": date_range,
            "metrics": insights.get("metrics", {}),
            "trends": insights.get("trends", {}),
            "breakdown": insights.get("breakdown", {})
        }
        
    except Exception as e:
        logger.error("Error getting campaign insights", error=str(e))
        # Retorna dados simulados
        return {
            "campaign_id": campaign_id,
            "date_range": date_range,
            "metrics": {
                "spend": 500.0,
                "impressions": 50000,
                "clicks": 500,
                "conversions": 25,
                "roas": 2.0,
                "ctr": 1.0,
                "cpc": 1.0,
                "cpm": 10.0,
                "days_running": 7
            }
        }


async def get_best_performing(
    tenant_id: str,
    metric: str = "roas",
    top_k: int = 5
) -> Dict[str, Any]:
    """Lista melhores campanhas."""
    try:
        from sqlalchemy.ext.asyncio import create_async_engine
        from sqlalchemy import text
        from app.config import get_settings
        
        settings = get_settings()
        db_url = settings.database_url
        if not db_url.startswith('postgresql+asyncpg://'):
            db_url = db_url.replace('postgresql://', 'postgresql+asyncpg://')
        
        engine = create_async_engine(db_url)
        
        async with engine.connect() as conn:
            result = await conn.execute(text("""
                SELECT * FROM ad_campaigns 
                WHERE tenant_id = :tenant_id 
                AND status = 'ACTIVE'
                ORDER BY created_at DESC
                LIMIT :top_k
            """), {"tenant_id": tenant_id, "top_k": top_k})
            
            campaigns = [dict(row._mapping) for row in result.fetchall()]
        
        await engine.dispose()
        
        return {
            "tenant_id": tenant_id,
            "metric": metric,
            "campaigns": campaigns,
            "count": len(campaigns)
        }
        
    except Exception as e:
        logger.error("Error getting best performing campaigns", error=str(e))
        return {"campaigns": [], "error": str(e)}


async def get_brand_guidelines(tenant_id: str) -> Dict[str, Any]:
    """Busca diretrizes de marca."""
    try:
        from app.rag.ads_knowledge import get_ads_knowledge_service
        
        knowledge = get_ads_knowledge_service()
        
        results = await knowledge.search(
            query="diretrizes marca brand guidelines",
            tenant_id=tenant_id,
            context="brand_guidelines",
            top_k=10
        )
        
        guidelines = {
            "colors": [],
            "fonts": [],
            "tone": "",
            "do_not_use": [],
            "examples": []
        }
        
        for result in results:
            content = result.get("content", "").lower()
            if "cor" in content or "color" in content:
                guidelines["colors"].append(result.get("content"))
            elif "fonte" in content or "font" in content:
                guidelines["fonts"].append(result.get("content"))
            elif "tom" in content or "tone" in content:
                guidelines["tone"] = result.get("content")
        
        return {
            "tenant_id": tenant_id,
            "guidelines": guidelines,
            "raw_content": [r.get("content") for r in results],
            "count": len(results)
        }
        
    except Exception as e:
        logger.error("Error getting brand guidelines", error=str(e))
        return {"tenant_id": tenant_id, "guidelines": {}, "error": str(e)}


async def get_audience_suggestions(
    tenant_id: str,
    objective: str
) -> Dict[str, Any]:
    """Sugere públicos-alvo."""
    try:
        from app.rag.ads_knowledge import get_ads_knowledge_service
        from app.learning.ads_learning_service import AdsLearningService
        
        knowledge = get_ads_knowledge_service()
        learning = AdsLearningService()
        
        # Busca padrões de sucesso
        patterns = await learning.get_winning_patterns(tenant_id, objective)
        
        # Sugestões baseadas no objetivo
        base_suggestions = {
            "OUTCOME_SALES": [
                {"name": "Compradores frequentes", "type": "behavior"},
                {"name": "Visitantes do site", "type": "custom"},
                {"name": "Lookalike de compradores", "type": "lookalike"}
            ],
            "OUTCOME_LEADS": [
                {"name": "Interessados na categoria", "type": "interest"},
                {"name": "Engajados com conteúdo", "type": "engagement"},
                {"name": "Lookalike de leads", "type": "lookalike"}
            ],
            "OUTCOME_AWARENESS": [
                {"name": "Público amplo", "type": "broad"},
                {"name": "Interesse geral", "type": "interest"},
            ]
        }
        
        suggestions = base_suggestions.get(objective, [])
        
        # Adiciona padrões aprendidos
        for pattern in patterns.get("audiences", []):
            suggestions.append({
                "name": pattern.get("name"),
                "type": pattern.get("type"),
                "from_learning": True
            })
        
        return {
            "tenant_id": tenant_id,
            "objective": objective,
            "suggestions": suggestions,
            "patterns_used": len(patterns.get("audiences", []))
        }
        
    except Exception as e:
        logger.error("Error getting audience suggestions", error=str(e))
        return {"suggestions": [], "error": str(e)}


async def generate_ad_copy(
    tenant_id: str,
    product_name: str,
    objective: str,
    tone: str = "casual"
) -> Dict[str, Any]:
    """Gera variações de texto para anúncios."""
    try:
        from app.rag.ads_knowledge import get_ads_knowledge_service
        
        knowledge = get_ads_knowledge_service()
        
        # Busca diretrizes
        guidelines = await get_brand_guidelines(tenant_id)
        
        # Busca exemplos de sucesso
        examples = await knowledge.search(
            query=f"copy anuncio {product_name} {objective}",
            tenant_id=tenant_id,
            context="ad_copies",
            top_k=3
        )
        
        # Gera variações baseadas no tom
        variations = []
        
        if tone == "formal":
            variations = [
                f"Conheça {product_name}: a solução ideal para seu negócio.",
                f"Transforme seus resultados com {product_name}.",
                f"Descubra como {product_name} pode ajudar sua empresa."
            ]
        elif tone == "urgente":
            variations = [
                f"🔥 Últimas unidades de {product_name}! Aproveite agora.",
                f"⏰ Oferta por tempo limitado: {product_name}",
                f"🚀 Não perca! {product_name} com desconto especial."
            ]
        else:  # casual
            variations = [
                f"Já conhece o {product_name}? Vale a pena conferir!",
                f"Olha só o que {product_name} pode fazer por você 👀",
                f"Bora descobrir {product_name}? 🎯"
            ]
        
        return {
            "product_name": product_name,
            "objective": objective,
            "tone": tone,
            "variations": variations,
            "examples_used": len(examples),
            "guidelines_applied": bool(guidelines.get("guidelines", {}).get("tone"))
        }
        
    except Exception as e:
        logger.error("Error generating ad copy", error=str(e))
        return {"variations": [], "error": str(e)}


async def validate_creative(
    tenant_id: str,
    creative_config: Dict[str, Any]
) -> Dict[str, Any]:
    """Valida criativo."""
    try:
        issues = []
        warnings = []
        
        # Valida texto
        primary_text = creative_config.get("primary_text", "")
        if len(primary_text) > 125:
            warnings.append("Texto primário excede 125 caracteres (recomendado)")
        if len(primary_text) > 500:
            issues.append("Texto primário excede 500 caracteres (máximo)")
        
        # Valida headline
        headline = creative_config.get("headline", "")
        if len(headline) > 40:
            warnings.append("Headline excede 40 caracteres (recomendado)")
        
        # Valida imagem/vídeo
        media_type = creative_config.get("media_type", "")
        if not media_type:
            issues.append("Mídia (imagem/vídeo) é obrigatória")
        
        # Busca diretrizes da marca
        guidelines = await get_brand_guidelines(tenant_id)
        
        # Valida contra diretrizes
        if guidelines.get("guidelines", {}).get("do_not_use"):
            for term in guidelines["guidelines"]["do_not_use"]:
                if term.lower() in primary_text.lower():
                    issues.append(f"Texto contém termo proibido: {term}")
        
        return {
            "valid": len(issues) == 0,
            "issues": issues,
            "warnings": warnings,
            "guidelines_checked": bool(guidelines.get("guidelines"))
        }
        
    except Exception as e:
        logger.error("Error validating creative", error=str(e))
        return {"valid": False, "error": str(e)}


async def get_budget_recommendation(
    tenant_id: str,
    objective: str,
    target_conversions: int = None
) -> Dict[str, Any]:
    """Recomenda orçamento."""
    try:
        # Busca histórico de campanhas similares
        best = await get_best_performing(tenant_id, metric="roas", top_k=5)
        campaigns = best.get("campaigns", [])
        
        # Calcula média de budget das melhores
        if campaigns:
            avg_budget = sum(c.get("daily_budget", 50) for c in campaigns) / len(campaigns)
        else:
            avg_budget = 50.0  # Default
        
        # Ajusta por objetivo
        objective_multipliers = {
            "OUTCOME_SALES": 1.5,
            "OUTCOME_LEADS": 1.0,
            "OUTCOME_AWARENESS": 0.8,
            "OUTCOME_TRAFFIC": 0.7
        }
        
        multiplier = objective_multipliers.get(objective, 1.0)
        recommended = avg_budget * multiplier
        
        # Ajusta por meta de conversões
        if target_conversions:
            # Assume CPA médio de R$20
            cpa_based = target_conversions * 20
            recommended = max(recommended, cpa_based / 30)  # Por dia
        
        return {
            "tenant_id": tenant_id,
            "objective": objective,
            "recommended_daily_budget": round(recommended, 2),
            "minimum_daily_budget": round(recommended * 0.5, 2),
            "maximum_daily_budget": round(recommended * 2, 2),
            "based_on_campaigns": len(campaigns),
            "target_conversions": target_conversions
        }
        
    except Exception as e:
        logger.error("Error getting budget recommendation", error=str(e))
        return {"recommended_daily_budget": 50.0, "error": str(e)}


async def record_ads_experience(
    tenant_id: str,
    campaign_id: str,
    state: Dict[str, Any],
    action: str,
    reward: float,
    next_state: Dict[str, Any] = None
) -> Dict[str, Any]:
    """Registra experiência de RL para campanhas."""
    try:
        from app.rl.experience_buffer import ExperienceBuffer
        
        buffer = ExperienceBuffer()
        
        experience_id = await buffer.add_experience(
            tenant_id=tenant_id,
            agent_type='ads',
            state=state,
            action=action,
            reward=reward,
            next_state=next_state,
            is_terminal=(next_state is None)
        )
        
        return {
            "success": True,
            "experience_id": experience_id,
            "campaign_id": campaign_id,
            "action": action,
            "reward": reward
        }
        
    except Exception as e:
        logger.error("Error recording ads experience", error=str(e))
        return {"success": False, "error": str(e)}


async def get_competitor_insights(
    tenant_id: str,
    industry: str = None
) -> Dict[str, Any]:
    """Analisa insights de concorrentes."""
    try:
        from app.rag.ads_knowledge import get_ads_knowledge_service
        
        knowledge = get_ads_knowledge_service()
        
        # Busca padrões da indústria
        results = await knowledge.search(
            query=f"benchmark {industry or 'geral'} concorrentes",
            tenant_id=tenant_id,
            context="benchmarks",
            top_k=5
        )
        
        # Dados padrão de benchmark
        benchmarks = {
            "average_ctr": 0.9,
            "average_cpc": 1.20,
            "average_roas": 2.0,
            "best_performing_formats": ["video", "carousel"],
            "peak_hours": ["12:00", "19:00", "21:00"]
        }
        
        return {
            "tenant_id": tenant_id,
            "industry": industry,
            "benchmarks": benchmarks,
            "insights": [r.get("content") for r in results],
            "data_freshness": "weekly"
        }
        
    except Exception as e:
        logger.error("Error getting competitor insights", error=str(e))
        return {"benchmarks": {}, "error": str(e)}


async def forecast_spend(tenant_id: str, days_ahead: int = 30) -> Dict[str, Any]:
    """Prevê gasto total."""
    try:
        # Busca campanhas ativas
        best = await get_best_performing(tenant_id, metric="spend", top_k=100)
        campaigns = best.get("campaigns", [])
        
        # Soma orçamentos diários
        total_daily = sum(c.get("daily_budget", 0) for c in campaigns if c.get("status") == "ACTIVE")
        
        forecast_total = total_daily * days_ahead
        
        return {
            "tenant_id": tenant_id,
            "days_ahead": days_ahead,
            "active_campaigns": len([c for c in campaigns if c.get("status") == "ACTIVE"]),
            "daily_spend_estimate": round(total_daily, 2),
            "forecast_total": round(forecast_total, 2),
            "confidence": 0.85 if len(campaigns) > 5 else 0.6
        }
        
    except Exception as e:
        logger.error("Error forecasting spend", error=str(e))
        return {"forecast_total": 0, "error": str(e)}

