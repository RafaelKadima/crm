"""
Ads Intelligence Router
Endpoints para análise de performance de campanhas de anúncios
e criação automatizada via Agente de IA.
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import statistics
from datetime import datetime
import structlog

from app.services.ads_agent_service import get_ads_agent

logger = structlog.get_logger()
router = APIRouter(prefix="/ads", tags=["Ads Intelligence"])


# =============================================================================
# SCHEMAS
# =============================================================================

class MetricData(BaseModel):
    date: str
    spend: float
    impressions: int
    clicks: int
    conversions: int
    ctr: float
    cpc: float
    cpm: float
    roas: float


class EntityMetrics(BaseModel):
    entity_id: str
    entity_name: str
    entity_type: str  # campaign, adset, ad
    metrics: List[MetricData]


class PerformanceAnalysisRequest(BaseModel):
    tenant_id: str
    entities: List[EntityMetrics]


class AnomalyDetectionRequest(BaseModel):
    tenant_id: str
    entity_id: str
    entity_type: str
    metrics: List[MetricData]
    baseline_days: int = 14


class RecommendationRequest(BaseModel):
    tenant_id: str
    entity_id: str
    entity_type: str
    entity_name: str
    current_metrics: Dict[str, float]
    historical_avg: Dict[str, float]


class Insight(BaseModel):
    type: str
    severity: str
    title: str
    description: str
    recommendation: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    suggested_action: Optional[Dict[str, Any]] = None


class PerformanceAnalysisResponse(BaseModel):
    insights: List[Insight]
    summary: Dict[str, Any]


class AnomalyResponse(BaseModel):
    has_anomaly: bool
    anomalies: List[Dict[str, Any]]


class RecommendationResponse(BaseModel):
    recommendations: List[Insight]


# =============================================================================
# HELPERS
# =============================================================================

def calculate_performance_score(metrics: Dict[str, float], benchmarks: Dict[str, float]) -> float:
    """
    Calcula um score de performance baseado em métricas vs benchmarks.
    Score de 0 a 100.
    """
    score = 50.0  # Base score
    
    # CTR: maior é melhor
    if benchmarks.get('ctr', 0) > 0:
        ctr_ratio = metrics.get('ctr', 0) / benchmarks['ctr']
        score += (ctr_ratio - 1) * 20  # +/- 20 pontos por 100% variação
    
    # CPC: menor é melhor
    if benchmarks.get('cpc', 0) > 0:
        cpc_ratio = benchmarks['cpc'] / max(metrics.get('cpc', 0.01), 0.01)
        score += (cpc_ratio - 1) * 15
    
    # ROAS: maior é melhor
    if benchmarks.get('roas', 0) > 0:
        roas_ratio = metrics.get('roas', 0) / benchmarks['roas']
        score += (roas_ratio - 1) * 25
    
    # Normaliza entre 0 e 100
    return max(0, min(100, score))


def detect_trend(values: List[float], window: int = 3) -> str:
    """
    Detecta tendência em uma série de valores.
    Retorna: 'up', 'down', 'stable'
    """
    if len(values) < window * 2:
        return 'stable'
    
    first_avg = statistics.mean(values[:window])
    last_avg = statistics.mean(values[-window:])
    
    change_pct = ((last_avg - first_avg) / first_avg * 100) if first_avg > 0 else 0
    
    if change_pct > 10:
        return 'up'
    elif change_pct < -10:
        return 'down'
    return 'stable'


def calculate_zscore(value: float, mean: float, std: float) -> float:
    """Calcula Z-score para detecção de anomalias."""
    if std == 0:
        return 0
    return (value - mean) / std


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.post("/analyze-performance", response_model=PerformanceAnalysisResponse)
async def analyze_performance(request: PerformanceAnalysisRequest):
    """
    Analisa a performance de múltiplas entidades e gera insights.
    """
    insights: List[Insight] = []
    
    total_spend = 0
    total_conversions = 0
    best_performers = []
    worst_performers = []
    
    for entity in request.entities:
        if not entity.metrics:
            continue
        
        # Calcula médias
        avg_ctr = statistics.mean([m.ctr for m in entity.metrics]) if entity.metrics else 0
        avg_cpc = statistics.mean([m.cpc for m in entity.metrics]) if entity.metrics else 0
        avg_roas = statistics.mean([m.roas for m in entity.metrics]) if entity.metrics else 0
        total_entity_spend = sum(m.spend for m in entity.metrics)
        total_entity_conv = sum(m.conversions for m in entity.metrics)
        
        total_spend += total_entity_spend
        total_conversions += total_entity_conv
        
        # Detecta tendências
        ctr_values = [m.ctr for m in entity.metrics]
        ctr_trend = detect_trend(ctr_values)
        
        # Insight: Queda de CTR
        if ctr_trend == 'down' and len(ctr_values) >= 5:
            first_ctr = statistics.mean(ctr_values[:3])
            last_ctr = statistics.mean(ctr_values[-3:])
            drop_pct = ((first_ctr - last_ctr) / first_ctr * 100) if first_ctr > 0 else 0
            
            if drop_pct > 20:
                insights.append(Insight(
                    type="performance_drop",
                    severity="warning" if drop_pct < 40 else "critical",
                    title=f"Queda de CTR em {entity.entity_name}",
                    description=f"O CTR caiu {drop_pct:.1f}% nos últimos dias.",
                    recommendation="Revise os criativos e público-alvo desta campanha.",
                    data={
                        "entity_id": entity.entity_id,
                        "entity_type": entity.entity_type,
                        "previous_ctr": first_ctr,
                        "current_ctr": last_ctr,
                        "drop_percent": drop_pct
                    }
                ))
        
        # Classificação de performance
        score = calculate_performance_score(
            {"ctr": avg_ctr, "cpc": avg_cpc, "roas": avg_roas},
            {"ctr": 1.5, "cpc": 2.0, "roas": 2.0}  # Benchmarks padrão
        )
        
        if score >= 70:
            best_performers.append({
                "entity_id": entity.entity_id,
                "entity_name": entity.entity_name,
                "score": score
            })
        elif score < 40 and total_entity_spend > 10:
            worst_performers.append({
                "entity_id": entity.entity_id,
                "entity_name": entity.entity_name,
                "score": score
            })
    
    # Insight: Anúncios vencedores
    for performer in best_performers[:3]:
        insights.append(Insight(
            type="winner_ad",
            severity="success",
            title=f"🏆 Alto desempenho: {performer['entity_name']}",
            description=f"Score de {performer['score']:.0f}/100. Performance acima da média.",
            recommendation="Considere aumentar o orçamento para esta entidade.",
            data=performer
        ))
    
    # Insight: Sugestão de pausar
    for performer in worst_performers[:3]:
        insights.append(Insight(
            type="suggestion",
            severity="warning",
            title=f"Baixo desempenho: {performer['entity_name']}",
            description=f"Score de {performer['score']:.0f}/100. Considere pausar ou otimizar.",
            recommendation="Pause este anúncio e redirecione o orçamento.",
            data=performer,
            suggested_action={
                "type": "pause_ad",
                "entity_id": performer["entity_id"]
            }
        ))
    
    return PerformanceAnalysisResponse(
        insights=insights,
        summary={
            "total_entities": len(request.entities),
            "total_spend": total_spend,
            "total_conversions": total_conversions,
            "best_performers_count": len(best_performers),
            "worst_performers_count": len(worst_performers),
            "insights_generated": len(insights)
        }
    )


@router.post("/detect-anomalies", response_model=AnomalyResponse)
async def detect_anomalies(request: AnomalyDetectionRequest):
    """
    Detecta anomalias nas métricas de uma entidade usando Z-score.
    """
    if len(request.metrics) < request.baseline_days + 1:
        return AnomalyResponse(has_anomaly=False, anomalies=[])
    
    anomalies = []
    
    # Métricas a analisar
    metrics_to_check = ['spend', 'ctr', 'cpc', 'conversions']
    
    for metric_name in metrics_to_check:
        values = [getattr(m, metric_name) for m in request.metrics]
        
        # Usa os primeiros N dias como baseline
        baseline = values[:request.baseline_days]
        recent = values[request.baseline_days:]
        
        if not baseline or not recent:
            continue
        
        mean = statistics.mean(baseline)
        std = statistics.stdev(baseline) if len(baseline) > 1 else 0
        
        for i, value in enumerate(recent):
            zscore = calculate_zscore(value, mean, std)
            
            # Anomalia se Z-score > 2 (positivo ou negativo)
            if abs(zscore) > 2:
                anomalies.append({
                    "metric": metric_name,
                    "date": request.metrics[request.baseline_days + i].date,
                    "value": value,
                    "expected": mean,
                    "zscore": zscore,
                    "direction": "spike" if zscore > 0 else "drop"
                })
    
    return AnomalyResponse(
        has_anomaly=len(anomalies) > 0,
        anomalies=anomalies
    )


@router.post("/generate-recommendations", response_model=RecommendationResponse)
async def generate_recommendations(request: RecommendationRequest):
    """
    Gera recomendações baseadas em métricas atuais vs histórico.
    """
    recommendations: List[Insight] = []
    
    current = request.current_metrics
    historical = request.historical_avg
    
    # Recomendação: CPC alto
    if current.get('cpc', 0) > historical.get('cpc', 0) * 1.3:
        recommendations.append(Insight(
            type="suggestion",
            severity="warning",
            title=f"CPC acima da média: {request.entity_name}",
            description=f"CPC atual (R$ {current.get('cpc', 0):.2f}) está 30%+ acima da média (R$ {historical.get('cpc', 0):.2f}).",
            recommendation="Considere pausar ou reduzir orçamento.",
            data={
                "current_cpc": current.get('cpc'),
                "historical_cpc": historical.get('cpc'),
                "increase_pct": ((current.get('cpc', 0) / historical.get('cpc', 1)) - 1) * 100
            },
            suggested_action={
                "type": "decrease_budget",
                "entity_type": request.entity_type,
                "entity_id": request.entity_id,
                "params": {"percent": 20}
            }
        ))
    
    # Recomendação: ROAS alto - escalar
    if current.get('roas', 0) > historical.get('roas', 0) * 1.5 and current.get('roas', 0) > 2:
        recommendations.append(Insight(
            type="opportunity",
            severity="success",
            title=f"Oportunidade de escala: {request.entity_name}",
            description=f"ROAS atual ({current.get('roas', 0):.2f}x) está excelente!",
            recommendation="Considere aumentar o orçamento para aproveitar o momento.",
            data={
                "current_roas": current.get('roas'),
                "historical_roas": historical.get('roas')
            },
            suggested_action={
                "type": "increase_budget",
                "entity_type": request.entity_type,
                "entity_id": request.entity_id,
                "params": {"percent": 30}
            }
        ))
    
    # Recomendação: CTR baixo
    if current.get('ctr', 0) < historical.get('ctr', 0) * 0.7:
        recommendations.append(Insight(
            type="suggestion",
            severity="warning",
            title=f"CTR em queda: {request.entity_name}",
            description=f"CTR atual ({current.get('ctr', 0):.2f}%) está 30%+ abaixo da média.",
            recommendation="Atualize os criativos ou refine o público-alvo.",
            data={
                "current_ctr": current.get('ctr'),
                "historical_ctr": historical.get('ctr')
            }
        ))
    
    # Recomendação: Sem conversões
    if current.get('conversions', 0) == 0 and current.get('spend', 0) > 50:
        recommendations.append(Insight(
            type="budget_alert",
            severity="critical",
            title=f"Gasto sem conversões: {request.entity_name}",
            description=f"R$ {current.get('spend', 0):.2f} gastos sem nenhuma conversão.",
            recommendation="Pause imediatamente e revise a estratégia.",
            data={
                "spend": current.get('spend'),
                "conversions": 0
            },
            suggested_action={
                "type": "pause_ad",
                "entity_type": request.entity_type,
                "entity_id": request.entity_id
            }
        ))
    
    return RecommendationResponse(recommendations=recommendations)


@router.get("/health")
async def health_check():
    """Health check do módulo de Ads."""
    return {"status": "healthy", "module": "ads_intelligence"}


# =============================================================================
# AGENTE DE CRIAÇÃO DE CAMPANHAS
# =============================================================================

class CampaignBriefing(BaseModel):
    """Briefing para criação de campanha pelo agente."""
    product_name: str
    product_description: str
    target_audience: str
    objective: str = "conversions"  # conversions, traffic, awareness, leads
    daily_budget: float
    duration_days: int = 7
    landing_page_url: str
    creative_urls: List[str] = []
    tone_of_voice: str = "profissional"  # profissional, casual, urgente, inspirador
    key_benefits: List[str] = []
    call_to_action: str = "Saiba Mais"


class CreateCampaignRequest(BaseModel):
    """Request para criar campanha via agente."""
    tenant_id: str
    ad_account_id: str
    briefing: CampaignBriefing
    platform: str = "meta"  # meta, google
    auto_publish: bool = False  # Se False, cria pausada para revisão


class OptimizeCampaignRequest(BaseModel):
    """Request para otimizar campanha existente."""
    tenant_id: str
    campaign_id: str
    auto_execute: bool = False  # Se True, executa ações seguras automaticamente


class ScaleCampaignRequest(BaseModel):
    """Request para escalar campanha vencedora."""
    tenant_id: str
    campaign_id: str
    scale_factor: float = 1.5  # 1.5 = aumentar 50%
    strategy: str = "gradual"  # gradual, aggressive, duplicate


class GenerateVariationsRequest(BaseModel):
    """Request para gerar novas variações de anúncio."""
    tenant_id: str
    campaign_id: str
    num_variations: int = 3


class GenerateCopyRequest(BaseModel):
    """Request para gerar apenas copies (sem criar campanha)."""
    product_name: str
    product_description: str
    target_audience: str
    tone_of_voice: str = "profissional"
    key_benefits: List[str] = []
    num_variations: int = 5


@router.post("/agent/create-campaign")
async def agent_create_campaign(request: CreateCampaignRequest, background_tasks: BackgroundTasks):
    """
    🤖 Cria uma campanha completa usando o Agente de IA.
    
    O agente irá:
    1. Analisar o briefing
    2. Gerar estratégia de campanha otimizada
    3. Criar copies de alta conversão
    4. Definir segmentação de público
    5. Criar a campanha na plataforma (pausada por padrão)
    
    Retorna a campanha criada e a estratégia utilizada.
    """
    logger.info("Agent creating campaign", 
               tenant_id=request.tenant_id,
               product=request.briefing.product_name,
               platform=request.platform)
    
    try:
        agent = get_ads_agent()
        
        result = await agent.create_campaign_from_briefing(
            tenant_id=request.tenant_id,
            ad_account_id=request.ad_account_id,
            briefing=request.briefing.model_dump(),
            platform=request.platform
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error"))
        
        return {
            "success": True,
            "message": "Campanha criada com sucesso!" + (" (pausada para revisão)" if not request.auto_publish else ""),
            "campaign": result.get("campaign"),
            "strategy": result.get("strategy"),
            "copies_generated": len(result.get("copies", [])),
            "targeting": result.get("targeting")
        }
        
    except Exception as e:
        logger.error("Failed to create campaign via agent", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/agent/optimize-campaign")
async def agent_optimize_campaign(request: OptimizeCampaignRequest):
    """
    🔧 Analisa e otimiza uma campanha existente.
    
    O agente irá:
    1. Analisar performance atual
    2. Identificar pontos de melhoria
    3. Gerar ações de otimização
    4. Executar ações seguras (se auto_execute=True)
    
    Retorna análise e lista de ações recomendadas.
    """
    logger.info("Agent optimizing campaign",
               tenant_id=request.tenant_id,
               campaign_id=request.campaign_id)
    
    try:
        agent = get_ads_agent()
        
        result = await agent.analyze_and_optimize(
            tenant_id=request.tenant_id,
            campaign_id=request.campaign_id
        )
        
        return {
            "success": True,
            "campaign_id": request.campaign_id,
            "analysis": result.get("analysis"),
            "recommended_actions": result.get("recommended_actions"),
            "auto_executed": result.get("auto_executable") if request.auto_execute else [],
            "pending_approval": result.get("requires_approval")
        }
        
    except Exception as e:
        logger.error("Failed to optimize campaign", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/agent/scale-campaign")
async def agent_scale_campaign(request: ScaleCampaignRequest):
    """
    📈 Cria plano para escalar uma campanha vencedora.
    
    Estratégias disponíveis:
    - gradual: Aumenta 20% a cada 2 dias (menor risco)
    - aggressive: Aumenta imediatamente (maior risco)
    - duplicate: Duplica campanha com novo público
    
    Retorna plano de escala para aprovação.
    """
    logger.info("Agent scaling campaign",
               tenant_id=request.tenant_id,
               campaign_id=request.campaign_id,
               strategy=request.strategy)
    
    try:
        agent = get_ads_agent()
        
        result = await agent.scale_winning_campaign(
            tenant_id=request.tenant_id,
            campaign_id=request.campaign_id,
            scale_factor=request.scale_factor,
            strategy=request.strategy
        )
        
        return {
            "success": True,
            "campaign_id": request.campaign_id,
            "scale_plan": result.get("scale_plan"),
            "status": result.get("status"),
            "message": "Plano de escala gerado. Aguardando aprovação."
        }
        
    except Exception as e:
        logger.error("Failed to scale campaign", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/agent/generate-variations")
async def agent_generate_variations(request: GenerateVariationsRequest):
    """
    ✨ Gera novas variações de anúncio baseado nos winners.
    
    Analisa os anúncios de melhor performance e cria
    novas variações mantendo os elementos que funcionam.
    
    Retorna variações para revisão e publicação.
    """
    logger.info("Agent generating variations",
               tenant_id=request.tenant_id,
               campaign_id=request.campaign_id)
    
    try:
        agent = get_ads_agent()
        
        variations = await agent.generate_new_ad_variations(
            tenant_id=request.tenant_id,
            campaign_id=request.campaign_id,
            num_variations=request.num_variations
        )
        
        return {
            "success": True,
            "campaign_id": request.campaign_id,
            "variations": variations,
            "count": len(variations),
            "message": f"{len(variations)} novas variações geradas para revisão."
        }
        
    except Exception as e:
        logger.error("Failed to generate variations", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/agent/generate-copy")
async def agent_generate_copy(request: GenerateCopyRequest):
    """
    ✍️ Gera apenas copies de anúncio (sem criar campanha).
    
    Útil para:
    - Testar ideias antes de criar campanha
    - Gerar copies para campanhas existentes
    - Inspiração para equipe de marketing
    
    Retorna variações de copy otimizadas.
    """
    logger.info("Agent generating copies",
               product=request.product_name)
    
    try:
        agent = get_ads_agent()
        
        # Usa o método interno de geração de copies
        briefing = {
            "product_name": request.product_name,
            "product_description": request.product_description,
            "target_audience": request.target_audience,
            "tone_of_voice": request.tone_of_voice,
            "key_benefits": request.key_benefits
        }
        
        # Gera estratégia simplificada primeiro
        strategy = {"campaign_name": f"Campanha - {request.product_name}"}
        
        copies = await agent._generate_ad_copies(briefing, strategy)
        
        return {
            "success": True,
            "copies": copies[:request.num_variations],
            "count": min(len(copies), request.num_variations),
            "message": "Copies gerados com sucesso!"
        }
        
    except Exception as e:
        logger.error("Failed to generate copies", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

