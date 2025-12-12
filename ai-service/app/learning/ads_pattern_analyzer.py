"""
Ads Pattern Analyzer
Analisa padrões de campanhas bem-sucedidas e gera insights
"""
import json
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
import structlog
from openai import AsyncOpenAI

from app.config import get_settings

logger = structlog.get_logger()
settings = get_settings()


@dataclass
class WinningPattern:
    """Padrão de campanha vencedora"""
    id: str
    name: str
    objective: str
    avg_roas: float
    total_conversions: int
    budget_range: Tuple[float, float]
    targeting_characteristics: Dict[str, Any]
    creative_characteristics: Dict[str, Any]
    recommendations: List[str]
    confidence: float


@dataclass
class CreativeAnalysis:
    """Análise de performance de criativos"""
    total_creatives: int
    by_type: Dict[str, Dict[str, Any]]  # image, video, carousel
    top_performers: List[Dict[str, Any]]
    recommendations: List[str]


@dataclass
class AudienceInsight:
    """Insight sobre audiência"""
    audience_id: Optional[str]
    characteristics: Dict[str, Any]
    conversion_rate: float
    avg_value: float
    recommendations: List[str]


class AdsPatternAnalyzer:
    """
    Analisa padrões de campanhas bem-sucedidas
    - Identifica campanhas vencedoras
    - Compara performance de criativos
    - Identifica melhores audiências
    - Gera insights acionáveis
    """
    
    def __init__(self):
        self.openai = AsyncOpenAI(
            api_key=settings.openai_api_key,
            project=settings.openai_project_id if settings.openai_project_id else None
        )
        self._db_engine = None
    
    async def get_db_engine(self):
        """Lazy loading do engine do banco"""
        if self._db_engine is None:
            from sqlalchemy.ext.asyncio import create_async_engine
            db_url = settings.database_url
            if not db_url.startswith('postgresql+asyncpg://'):
                db_url = db_url.replace('postgresql://', 'postgresql+asyncpg://')
            self._db_engine = create_async_engine(db_url)
        return self._db_engine
    
    # ==========================================
    # ANÁLISE DE CAMPANHAS VENCEDORAS
    # ==========================================
    
    async def analyze_winning_campaigns(
        self,
        tenant_id: str,
        min_roas: float = 2.0,
        min_conversions: int = 5,
        days: int = 60
    ) -> List[WinningPattern]:
        """
        Identifica padrões em campanhas com ROAS acima do threshold
        """
        try:
            engine = await self.get_db_engine()
            
            async with engine.connect() as conn:
                from sqlalchemy import text
                
                # Busca campanhas com bom desempenho
                result = await conn.execute(text("""
                    SELECT 
                        c.id,
                        c.name,
                        c.objective,
                        c.daily_budget,
                        c.metadata,
                        COUNT(cv.id) as conversions,
                        SUM(cv.value) as total_value,
                        AVG(cv.days_to_convert) as avg_days_to_convert
                    FROM ad_campaigns c
                    JOIN ad_conversions cv ON cv.ad_campaign_id = c.id
                    WHERE c.tenant_id = :tenant_id
                    AND cv.converted_at > NOW() - :days * INTERVAL '1 day'
                    GROUP BY c.id
                    HAVING COUNT(cv.id) >= :min_conversions
                    ORDER BY SUM(cv.value) DESC
                """), {
                    'tenant_id': tenant_id,
                    'days': days,
                    'min_conversions': min_conversions
                })
                
                patterns = []
                
                for row in result.fetchall():
                    daily_budget = float(row.daily_budget) if row.daily_budget else 1
                    total_value = float(row.total_value or 0)
                    roas = total_value / (daily_budget * days)
                    
                    if roas < min_roas:
                        continue
                    
                    # Busca características dos adsets/targeting
                    targeting = await self._get_campaign_targeting(str(row.id))
                    
                    # Busca características dos criativos
                    creative_chars = await self._get_campaign_creative_characteristics(str(row.id))
                    
                    # Gera recomendações
                    recommendations = await self._generate_pattern_recommendations(
                        objective=row.objective,
                        roas=roas,
                        budget=daily_budget,
                        conversions=row.conversions,
                        targeting=targeting,
                        creative_chars=creative_chars
                    )
                    
                    patterns.append(WinningPattern(
                        id=str(row.id),
                        name=row.name,
                        objective=row.objective,
                        avg_roas=roas,
                        total_conversions=row.conversions,
                        budget_range=(daily_budget * 0.8, daily_budget * 1.5),
                        targeting_characteristics=targeting,
                        creative_characteristics=creative_chars,
                        recommendations=recommendations,
                        confidence=min(1.0, row.conversions / 20)  # Confiança baseada em volume
                    ))
                
                logger.info("winning_patterns_analyzed",
                    tenant_id=tenant_id,
                    patterns_found=len(patterns)
                )
                
                return patterns
                
        except Exception as e:
            logger.error("analyze_winning_campaigns_error", error=str(e))
            return []
    
    async def _get_campaign_targeting(self, campaign_id: str) -> Dict[str, Any]:
        """Busca características de targeting da campanha"""
        try:
            engine = await self.get_db_engine()
            
            async with engine.connect() as conn:
                from sqlalchemy import text
                
                result = await conn.execute(text("""
                    SELECT targeting, optimization_goal
                    FROM ad_adsets
                    WHERE ad_campaign_id = :campaign_id
                """), {'campaign_id': campaign_id})
                
                rows = result.fetchall()
                
                if not rows:
                    return {}
                
                # Agrega targeting de todos os adsets
                all_targeting = []
                optimization_goals = set()
                
                for row in rows:
                    targeting = json.loads(row.targeting) if isinstance(row.targeting, str) else (row.targeting or {})
                    all_targeting.append(targeting)
                    if row.optimization_goal:
                        optimization_goals.add(row.optimization_goal)
                
                return {
                    'optimization_goals': list(optimization_goals),
                    'targeting_samples': all_targeting[:3],  # Primeiros 3 como amostra
                    'total_adsets': len(rows)
                }
                
        except Exception as e:
            logger.error("get_campaign_targeting_error", error=str(e))
            return {}
    
    async def _get_campaign_creative_characteristics(
        self,
        campaign_id: str
    ) -> Dict[str, Any]:
        """Busca características dos criativos da campanha"""
        try:
            engine = await self.get_db_engine()
            
            async with engine.connect() as conn:
                from sqlalchemy import text
                
                result = await conn.execute(text("""
                    SELECT 
                        aa.name as ad_name,
                        aa.headline,
                        aa.description,
                        aa.call_to_action,
                        aa.metadata as ad_metadata
                    FROM ad_ads aa
                    JOIN ad_adsets adt ON adt.id = aa.ad_adset_id
                    WHERE adt.ad_campaign_id = :campaign_id
                """), {'campaign_id': campaign_id})
                
                rows = result.fetchall()
                
                if not rows:
                    return {}
                
                ctas = set()
                headline_lengths = []
                
                for row in rows:
                    if row.call_to_action:
                        ctas.add(row.call_to_action)
                    if row.headline:
                        headline_lengths.append(len(row.headline))
                
                return {
                    'total_ads': len(rows),
                    'call_to_actions': list(ctas),
                    'avg_headline_length': sum(headline_lengths) / len(headline_lengths) if headline_lengths else 0
                }
                
        except Exception as e:
            logger.error("get_creative_chars_error", error=str(e))
            return {}
    
    async def _generate_pattern_recommendations(
        self,
        objective: str,
        roas: float,
        budget: float,
        conversions: int,
        targeting: Dict[str, Any],
        creative_chars: Dict[str, Any]
    ) -> List[str]:
        """Gera recomendações baseadas no padrão"""
        recommendations = []
        
        # Recomendação de orçamento
        recommendations.append(
            f"Use orçamento entre R${budget*0.8:.0f} e R${budget*1.5:.0f}/dia para objetivo {objective}"
        )
        
        # Recomendação de otimização
        if targeting.get('optimization_goals'):
            goals = targeting['optimization_goals']
            if len(goals) == 1:
                recommendations.append(f"Otimize para {goals[0]} que demonstrou melhor performance")
        
        # Recomendação de CTA
        if creative_chars.get('call_to_actions'):
            ctas = creative_chars['call_to_actions']
            if ctas:
                recommendations.append(f"Use CTAs como: {', '.join(ctas[:3])}")
        
        # Recomendação baseada em ROAS
        if roas > 3:
            recommendations.append("Considere aumentar orçamento gradualmente - campanha com ROAS excelente")
        
        return recommendations
    
    # ==========================================
    # ANÁLISE DE CRIATIVOS
    # ==========================================
    
    async def compare_creative_performance(
        self,
        tenant_id: str,
        days: int = 30
    ) -> CreativeAnalysis:
        """
        Compara performance de diferentes tipos de criativos
        """
        try:
            engine = await self.get_db_engine()
            
            async with engine.connect() as conn:
                from sqlalchemy import text
                
                # Análise por tipo de criativo
                result = await conn.execute(text("""
                    SELECT 
                        ac.type,
                        COUNT(DISTINCT ac.id) as total_creatives,
                        COUNT(cv.id) as conversions,
                        SUM(cv.value) as total_value
                    FROM ad_creatives ac
                    LEFT JOIN ad_ads aa ON aa.ad_creative_id = ac.id
                    LEFT JOIN ad_conversions cv ON cv.ad_ad_id = aa.id
                        AND cv.converted_at > NOW() - :days * INTERVAL '1 day'
                    WHERE ac.tenant_id = :tenant_id
                    GROUP BY ac.type
                """), {
                    'tenant_id': tenant_id,
                    'days': days
                })
                
                by_type = {}
                total_creatives = 0
                
                for row in result.fetchall():
                    creative_type = row.type or 'unknown'
                    by_type[creative_type] = {
                        'count': row.total_creatives,
                        'conversions': row.conversions or 0,
                        'value': float(row.total_value or 0),
                        'conversion_rate': (row.conversions or 0) / row.total_creatives if row.total_creatives > 0 else 0
                    }
                    total_creatives += row.total_creatives
                
                # Top performers
                top_result = await conn.execute(text("""
                    SELECT 
                        ac.id,
                        ac.name,
                        ac.type,
                        COUNT(cv.id) as conversions,
                        SUM(cv.value) as total_value
                    FROM ad_creatives ac
                    JOIN ad_ads aa ON aa.ad_creative_id = ac.id
                    JOIN ad_conversions cv ON cv.ad_ad_id = aa.id
                    WHERE ac.tenant_id = :tenant_id
                    AND cv.converted_at > NOW() - :days * INTERVAL '1 day'
                    GROUP BY ac.id, ac.name, ac.type
                    ORDER BY COUNT(cv.id) DESC
                    LIMIT 5
                """), {
                    'tenant_id': tenant_id,
                    'days': days
                })
                
                top_performers = []
                for row in top_result.fetchall():
                    top_performers.append({
                        'id': str(row.id),
                        'name': row.name,
                        'type': row.type,
                        'conversions': row.conversions,
                        'value': float(row.total_value or 0)
                    })
                
                # Gera recomendações
                recommendations = self._generate_creative_recommendations(by_type)
                
                return CreativeAnalysis(
                    total_creatives=total_creatives,
                    by_type=by_type,
                    top_performers=top_performers,
                    recommendations=recommendations
                )
                
        except Exception as e:
            logger.error("compare_creative_performance_error", error=str(e))
            return CreativeAnalysis(
                total_creatives=0,
                by_type={},
                top_performers=[],
                recommendations=[]
            )
    
    def _generate_creative_recommendations(
        self,
        by_type: Dict[str, Dict[str, Any]]
    ) -> List[str]:
        """Gera recomendações de criativos"""
        recommendations = []
        
        if not by_type:
            return ["Faça upload de criativos para começar a analisar performance"]
        
        # Ordena por taxa de conversão
        sorted_types = sorted(
            by_type.items(),
            key=lambda x: x[1].get('conversion_rate', 0),
            reverse=True
        )
        
        if sorted_types:
            best_type = sorted_types[0]
            if best_type[1].get('conversion_rate', 0) > 0:
                recommendations.append(
                    f"Criativos do tipo '{best_type[0]}' têm melhor taxa de conversão"
                )
        
        # Verifica se falta algum tipo
        expected_types = ['image', 'video', 'carousel']
        missing = [t for t in expected_types if t not in by_type]
        
        if missing:
            recommendations.append(
                f"Experimente adicionar criativos do tipo: {', '.join(missing)}"
            )
        
        # Video vs Image
        if 'video' in by_type and 'image' in by_type:
            video_rate = by_type['video'].get('conversion_rate', 0)
            image_rate = by_type['image'].get('conversion_rate', 0)
            
            if video_rate > image_rate * 1.5:
                recommendations.append("Vídeos estão performando significativamente melhor que imagens")
            elif image_rate > video_rate * 1.5:
                recommendations.append("Imagens estão performando melhor que vídeos para este público")
        
        return recommendations
    
    # ==========================================
    # ANÁLISE DE AUDIÊNCIA
    # ==========================================
    
    async def identify_best_audiences(
        self,
        tenant_id: str,
        objective: str = None,
        days: int = 30
    ) -> List[AudienceInsight]:
        """
        Identifica públicos que mais convertem
        """
        try:
            engine = await self.get_db_engine()
            
            async with engine.connect() as conn:
                from sqlalchemy import text
                
                # Agrupa por adset (que representa uma audiência)
                sql = """
                    SELECT 
                        adt.id as adset_id,
                        adt.name as adset_name,
                        adt.targeting,
                        COUNT(cv.id) as conversions,
                        SUM(cv.value) as total_value,
                        AVG(cv.value) as avg_value
                    FROM ad_adsets adt
                    JOIN ad_campaigns c ON c.id = adt.ad_campaign_id
                    LEFT JOIN ad_ads aa ON aa.ad_adset_id = adt.id
                    LEFT JOIN ad_conversions cv ON cv.ad_ad_id = aa.id
                        AND cv.converted_at > NOW() - :days * INTERVAL '1 day'
                    WHERE c.tenant_id = :tenant_id
                """
                
                params = {'tenant_id': tenant_id, 'days': days}
                
                if objective:
                    sql += " AND c.objective = :objective"
                    params['objective'] = objective
                
                sql += """
                    GROUP BY adt.id, adt.name, adt.targeting
                    HAVING COUNT(cv.id) > 0
                    ORDER BY COUNT(cv.id) DESC
                    LIMIT 10
                """
                
                result = await conn.execute(text(sql), params)
                
                insights = []
                
                for row in result.fetchall():
                    targeting = json.loads(row.targeting) if isinstance(row.targeting, str) else (row.targeting or {})
                    
                    # Gera recomendações para esta audiência
                    recommendations = self._generate_audience_recommendations(
                        targeting,
                        row.conversions,
                        float(row.avg_value or 0)
                    )
                    
                    insights.append(AudienceInsight(
                        audience_id=str(row.adset_id),
                        characteristics={
                            'name': row.adset_name,
                            'targeting': targeting
                        },
                        conversion_rate=row.conversions / 100,  # Placeholder
                        avg_value=float(row.avg_value or 0),
                        recommendations=recommendations
                    ))
                
                return insights
                
        except Exception as e:
            logger.error("identify_best_audiences_error", error=str(e))
            return []
    
    def _generate_audience_recommendations(
        self,
        targeting: Dict[str, Any],
        conversions: int,
        avg_value: float
    ) -> List[str]:
        """Gera recomendações para audiência"""
        recommendations = []
        
        if conversions >= 10:
            recommendations.append("Audiência com volume consistente - considere escalar")
        
        if avg_value > 100:
            recommendations.append("Alto valor médio de conversão - audiência premium")
        
        # Analisa targeting
        if 'geo_locations' in targeting:
            geo = targeting['geo_locations']
            if isinstance(geo, dict) and 'cities' in geo:
                recommendations.append(f"Foco em cidades específicas está funcionando bem")
        
        if 'interests' in targeting:
            recommendations.append("Segmentação por interesses está gerando resultados")
        
        return recommendations
    
    # ==========================================
    # INSIGHTS CONSOLIDADOS
    # ==========================================
    
    async def get_consolidated_insights(
        self,
        tenant_id: str,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Retorna insights consolidados para o tenant
        """
        # Análises em paralelo
        winning_patterns = await self.analyze_winning_campaigns(
            tenant_id, min_roas=1.5, min_conversions=3, days=days
        )
        
        creative_analysis = await self.compare_creative_performance(tenant_id, days)
        
        audience_insights = await self.identify_best_audiences(tenant_id, days=days)
        
        # Consolida
        return {
            'period_days': days,
            'winning_campaigns': {
                'count': len(winning_patterns),
                'patterns': [
                    {
                        'name': p.name,
                        'objective': p.objective,
                        'roas': round(p.avg_roas, 2),
                        'conversions': p.total_conversions,
                        'recommendations': p.recommendations[:2]
                    }
                    for p in winning_patterns[:5]
                ]
            },
            'creative_performance': {
                'total': creative_analysis.total_creatives,
                'by_type': {
                    k: {
                        'count': v['count'],
                        'conversions': v['conversions'],
                        'rate': round(v['conversion_rate'], 3)
                    }
                    for k, v in creative_analysis.by_type.items()
                },
                'top_performers': creative_analysis.top_performers[:3],
                'recommendations': creative_analysis.recommendations
            },
            'audience_insights': {
                'count': len(audience_insights),
                'top_audiences': [
                    {
                        'name': a.characteristics.get('name', 'Unknown'),
                        'avg_value': round(a.avg_value, 2),
                        'recommendations': a.recommendations[:2]
                    }
                    for a in audience_insights[:5]
                ]
            },
            'generated_at': datetime.utcnow().isoformat()
        }


# Singleton
ads_pattern_analyzer = AdsPatternAnalyzer()


def get_ads_pattern_analyzer() -> AdsPatternAnalyzer:
    """Retorna instância singleton do serviço"""
    return ads_pattern_analyzer

