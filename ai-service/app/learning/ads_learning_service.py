"""
Ads Learning Service
Aprende com performance real de campanhas e feedback de marketers
"""
import json
import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass
import structlog
from openai import AsyncOpenAI

from app.config import get_settings
from app.rag.ads_knowledge import get_ads_knowledge_service

logger = structlog.get_logger()
settings = get_settings()


@dataclass
class ConversionEvent:
    """Evento de conversão recebido do CRM"""
    conversion_id: str
    campaign_id: str
    adset_id: Optional[str]
    ad_id: Optional[str]
    event_type: str
    value: float
    lead_id: str
    stage_from: Optional[str]
    stage_to: str
    days_to_convert: Optional[int]
    utm_data: Dict[str, Any]


@dataclass
class CampaignFeedback:
    """Feedback do marketer sobre campanha"""
    campaign_id: str
    rating: str  # positive, negative, neutral
    score: Optional[int]
    feedback: str
    categories: List[str]


@dataclass
class CampaignInsights:
    """Insights gerados sobre uma campanha"""
    campaign_id: str
    total_conversions: int
    total_value: float
    avg_days_to_convert: float
    conversion_rate: float
    top_performing_ads: List[str]
    recommendations: List[str]
    patterns_detected: List[str]


class AdsLearningService:
    """
    Serviço de aprendizado para campanhas de Ads
    - Aprende com conversões reais
    - Processa feedback de marketers
    - Identifica padrões de sucesso
    - Gera insights e recomendações
    """
    
    def __init__(self):
        self.openai = AsyncOpenAI(api_key=settings.openai_api_key)
        self.knowledge_service = get_ads_knowledge_service()
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
    # PROCESSAR CONVERSÕES
    # ==========================================
    
    async def record_conversion(self, event: ConversionEvent) -> Dict[str, Any]:
        """
        Registra conversão e atualiza métricas da campanha
        Também identifica padrões emergentes
        """
        try:
            logger.info("recording_conversion",
                campaign_id=event.campaign_id,
                event_type=event.event_type,
                value=event.value
            )
            
            # Busca dados da campanha
            campaign_data = await self._get_campaign_data(event.campaign_id)
            
            if not campaign_data:
                logger.warning("campaign_not_found", campaign_id=event.campaign_id)
                return {"success": False, "error": "Campaign not found"}
            
            # Atualiza métricas agregadas (em memória/cache)
            await self._update_campaign_metrics(event, campaign_data)
            
            # Verifica se há padrões emergentes
            patterns = await self._check_for_patterns(
                tenant_id=campaign_data['tenant_id'],
                campaign_id=event.campaign_id
            )
            
            # Se há padrões significativos, salva como conhecimento
            if patterns:
                for pattern in patterns:
                    await self.knowledge_service.save_campaign_pattern(
                        tenant_id=campaign_data['tenant_id'],
                        name=pattern['name'],
                        objective=campaign_data.get('objective', ''),
                        conditions=pattern['conditions'],
                        success_metrics=pattern['metrics'],
                        recommendations=pattern['recommendations'],
                        source_campaign_ids=[event.campaign_id]
                    )
                    
                    logger.info("pattern_saved",
                        pattern_name=pattern['name'],
                        campaign_id=event.campaign_id
                    )
            
            return {
                "success": True,
                "patterns_detected": len(patterns) if patterns else 0
            }
            
        except Exception as e:
            logger.error("record_conversion_error", error=str(e))
            return {"success": False, "error": str(e)}
    
    async def _get_campaign_data(self, campaign_id: str) -> Optional[Dict[str, Any]]:
        """Busca dados da campanha no banco"""
        try:
            engine = await self.get_db_engine()
            
            async with engine.connect() as conn:
                from sqlalchemy import text
                
                result = await conn.execute(text("""
                    SELECT id, tenant_id, name, objective, status, 
                           daily_budget, metadata, created_at
                    FROM ad_campaigns
                    WHERE id = :id
                """), {'id': campaign_id})
                
                row = result.fetchone()
                
                if row:
                    return {
                        'id': str(row.id),
                        'tenant_id': str(row.tenant_id),
                        'name': row.name,
                        'objective': row.objective,
                        'status': row.status,
                        'daily_budget': float(row.daily_budget) if row.daily_budget else 0,
                        'metadata': json.loads(row.metadata) if isinstance(row.metadata, str) else (row.metadata or {}),
                        'created_at': row.created_at.isoformat() if row.created_at else None
                    }
                return None
                
        except Exception as e:
            logger.error("get_campaign_data_error", error=str(e))
            return None
    
    async def _update_campaign_metrics(
        self,
        event: ConversionEvent,
        campaign_data: Dict[str, Any]
    ) -> None:
        """Atualiza métricas da campanha com a nova conversão"""
        # Esta função pode atualizar um cache Redis ou métricas agregadas
        # Por agora, apenas loga
        logger.info("updating_campaign_metrics",
            campaign_id=event.campaign_id,
            event_type=event.event_type,
            value=event.value
        )
    
    async def _check_for_patterns(
        self,
        tenant_id: str,
        campaign_id: str
    ) -> List[Dict[str, Any]]:
        """
        Verifica se há padrões emergentes com base nas conversões
        """
        try:
            engine = await self.get_db_engine()
            
            async with engine.connect() as conn:
                from sqlalchemy import text
                
                # Busca conversões recentes da campanha
                result = await conn.execute(text("""
                    SELECT 
                        event_type,
                        COUNT(*) as count,
                        SUM(value) as total_value,
                        AVG(days_to_convert) as avg_days
                    FROM ad_conversions
                    WHERE ad_campaign_id = :campaign_id
                    AND converted_at > NOW() - INTERVAL '30 days'
                    GROUP BY event_type
                """), {'campaign_id': campaign_id})
                
                rows = result.fetchall()
                
                patterns = []
                
                # Analisa métricas
                total_conversions = sum(row.count for row in rows)
                total_value = sum(row.total_value or 0 for row in rows)
                
                # Se tem conversões significativas, pode ter um padrão
                if total_conversions >= 5 and total_value > 0:
                    # Busca dados da campanha para enriquecer o padrão
                    campaign = await self._get_campaign_data(campaign_id)
                    
                    if campaign:
                        pattern = {
                            'name': f"Padrão de sucesso - {campaign['objective']}",
                            'conditions': {
                                'objective': campaign['objective'],
                                'min_budget': campaign['daily_budget'] * 0.8,
                            },
                            'metrics': {
                                'conversions': total_conversions,
                                'value': total_value,
                                'roas': total_value / (campaign['daily_budget'] * 30) if campaign['daily_budget'] > 0 else 0
                            },
                            'recommendations': []
                        }
                        
                        # Gera recomendações com IA
                        recommendations = await self._generate_recommendations(
                            campaign, total_conversions, total_value
                        )
                        pattern['recommendations'] = recommendations
                        
                        patterns.append(pattern)
                
                return patterns
                
        except Exception as e:
            logger.error("check_patterns_error", error=str(e))
            return []
    
    async def _generate_recommendations(
        self,
        campaign: Dict[str, Any],
        conversions: int,
        value: float
    ) -> List[str]:
        """Gera recomendações usando IA"""
        try:
            prompt = f"""
Analise os dados desta campanha de ads e gere 3 recomendações específicas:

Campanha: {campaign['name']}
Objetivo: {campaign['objective']}
Orçamento diário: R$ {campaign['daily_budget']}
Conversões (30 dias): {conversions}
Valor total: R$ {value:.2f}
ROAS estimado: {value / (campaign['daily_budget'] * 30):.2f}x

Responda APENAS com uma lista JSON de 3 strings com recomendações práticas.
Exemplo: ["Recomendação 1", "Recomendação 2", "Recomendação 3"]
"""
            
            response = await self.openai.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=500
            )
            
            content = response.choices[0].message.content.strip()
            recommendations = json.loads(content)
            
            return recommendations if isinstance(recommendations, list) else []
            
        except Exception as e:
            logger.error("generate_recommendations_error", error=str(e))
            return ["Mantenha o orçamento atual que está performando bem"]
    
    # ==========================================
    # PROCESSAR FEEDBACK
    # ==========================================
    
    async def process_marketer_feedback(self, feedback: CampaignFeedback) -> Dict[str, Any]:
        """
        Processa feedback do marketer sobre uma campanha
        Extrai aprendizados e salva na base de conhecimento
        """
        try:
            logger.info("processing_feedback",
                campaign_id=feedback.campaign_id,
                rating=feedback.rating
            )
            
            # Busca dados da campanha
            campaign_data = await self._get_campaign_data(feedback.campaign_id)
            
            if not campaign_data:
                return {"success": False, "error": "Campaign not found"}
            
            # Extrai insight do feedback usando IA
            insight = await self._extract_insight_from_feedback(feedback, campaign_data)
            
            if insight and feedback.rating != 'neutral':
                # Salva como best practice (positivo) ou regra (negativo)
                if feedback.rating == 'positive':
                    await self.knowledge_service.add_best_practice(
                        tenant_id=campaign_data['tenant_id'],
                        title=f"Aprendizado: {campaign_data['name']}",
                        content=insight,
                        tags=feedback.categories + ['feedback', 'positive'],
                        source_campaign_id=feedback.campaign_id
                    )
                else:
                    await self.knowledge_service.add_knowledge(
                        tenant_id=campaign_data['tenant_id'],
                        title=f"Evitar: {campaign_data['name']}",
                        content=insight,
                        category='guidelines',
                        priority=7,
                        tags=feedback.categories + ['feedback', 'negative'],
                        source='learned'
                    )
            
            # Marca feedback como processado no banco
            await self._mark_feedback_processed(feedback.campaign_id, insight)
            
            return {
                "success": True,
                "insight": insight
            }
            
        except Exception as e:
            logger.error("process_feedback_error", error=str(e))
            return {"success": False, "error": str(e)}
    
    async def _extract_insight_from_feedback(
        self,
        feedback: CampaignFeedback,
        campaign: Dict[str, Any]
    ) -> Optional[str]:
        """Extrai insight estruturado do feedback usando IA"""
        try:
            rating_desc = {
                'positive': 'POSITIVO - O que funcionou bem',
                'negative': 'NEGATIVO - O que deve ser evitado',
                'neutral': 'NEUTRO - Observação'
            }
            
            prompt = f"""
Extraia um insight estruturado do feedback do marketer sobre esta campanha de ads.

Campanha: {campaign['name']}
Objetivo: {campaign['objective']}
Avaliação: {rating_desc.get(feedback.rating, feedback.rating)}
Score: {feedback.score}/5
Categorias: {', '.join(feedback.categories)}
Feedback: {feedback.feedback}

Escreva um insight conciso (máx 2 parágrafos) que possa ser usado para melhorar campanhas futuras.
Foque em aspectos práticos e acionáveis.
"""
            
            response = await self.openai.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.5,
                max_tokens=300
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error("extract_insight_error", error=str(e))
            return None
    
    async def _mark_feedback_processed(
        self,
        campaign_id: str,
        insight: Optional[str]
    ) -> None:
        """Marca feedback como processado no banco"""
        try:
            engine = await self.get_db_engine()
            
            async with engine.begin() as conn:
                from sqlalchemy import text
                
                await conn.execute(text("""
                    UPDATE ad_campaign_feedback
                    SET is_processed = true, 
                        processed_at = NOW(),
                        learned_insight = :insight
                    WHERE ad_campaign_id = :campaign_id
                    AND is_processed = false
                """), {
                    'campaign_id': campaign_id,
                    'insight': insight
                })
                
        except Exception as e:
            logger.error("mark_feedback_processed_error", error=str(e))
    
    # ==========================================
    # ANÁLISE DE PERFORMANCE
    # ==========================================
    
    async def analyze_campaign_performance(
        self,
        campaign_id: str
    ) -> Optional[CampaignInsights]:
        """
        Analisa performance de uma campanha e gera insights
        """
        try:
            campaign_data = await self._get_campaign_data(campaign_id)
            
            if not campaign_data:
                return None
            
            engine = await self.get_db_engine()
            
            async with engine.connect() as conn:
                from sqlalchemy import text
                
                # Métricas de conversão
                conv_result = await conn.execute(text("""
                    SELECT 
                        COUNT(*) as total,
                        SUM(value) as total_value,
                        AVG(days_to_convert) as avg_days
                    FROM ad_conversions
                    WHERE ad_campaign_id = :campaign_id
                """), {'campaign_id': campaign_id})
                
                conv_row = conv_result.fetchone()
                
                # Top performing ads
                ads_result = await conn.execute(text("""
                    SELECT aa.name, COUNT(c.id) as conversions
                    FROM ad_ads aa
                    JOIN ad_adsets adt ON adt.id = aa.ad_adset_id
                    LEFT JOIN ad_conversions c ON c.ad_ad_id = aa.id
                    WHERE adt.ad_campaign_id = :campaign_id
                    GROUP BY aa.id, aa.name
                    ORDER BY conversions DESC
                    LIMIT 5
                """), {'campaign_id': campaign_id})
                
                top_ads = [row.name for row in ads_result.fetchall()]
                
                total_conversions = conv_row.total or 0
                total_value = float(conv_row.total_value or 0)
                avg_days = float(conv_row.avg_days or 0)
                
                # Calcula taxa de conversão estimada
                # (isso seria mais preciso com dados de impressões/cliques)
                conversion_rate = min(total_conversions / 100, 1.0)  # Placeholder
                
                # Gera recomendações
                recommendations = await self._generate_recommendations(
                    campaign_data,
                    total_conversions,
                    total_value
                )
                
                return CampaignInsights(
                    campaign_id=campaign_id,
                    total_conversions=total_conversions,
                    total_value=total_value,
                    avg_days_to_convert=avg_days,
                    conversion_rate=conversion_rate,
                    top_performing_ads=top_ads,
                    recommendations=recommendations,
                    patterns_detected=[]
                )
                
        except Exception as e:
            logger.error("analyze_campaign_error", error=str(e))
            return None
    
    # ==========================================
    # APRENDIZADO CONTÍNUO
    # ==========================================
    
    async def learn_from_successful_campaigns(
        self,
        tenant_id: str,
        min_roas: float = 2.0,
        min_conversions: int = 10
    ) -> int:
        """
        Analisa campanhas bem-sucedidas e extrai padrões
        Retorna número de padrões aprendidos
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
                        SUM(cv.value) as total_value
                    FROM ad_campaigns c
                    JOIN ad_conversions cv ON cv.ad_campaign_id = c.id
                    WHERE c.tenant_id = :tenant_id
                    AND cv.converted_at > NOW() - INTERVAL '60 days'
                    GROUP BY c.id
                    HAVING COUNT(cv.id) >= :min_conversions
                """), {
                    'tenant_id': tenant_id,
                    'min_conversions': min_conversions
                })
                
                patterns_saved = 0
                
                for row in result.fetchall():
                    daily_budget = float(row.daily_budget) if row.daily_budget else 1
                    roas = float(row.total_value or 0) / (daily_budget * 60)
                    
                    if roas >= min_roas:
                        # Esta é uma campanha de sucesso - extrai padrão
                        await self.knowledge_service.save_campaign_pattern(
                            tenant_id=tenant_id,
                            name=f"Padrão de sucesso: {row.objective}",
                            objective=row.objective,
                            conditions={
                                'objective': row.objective,
                                'min_budget': daily_budget * 0.8,
                                'max_budget': daily_budget * 1.5,
                            },
                            success_metrics={
                                'roas': roas,
                                'conversions': row.conversions,
                                'value': float(row.total_value or 0)
                            },
                            recommendations=[
                                f"Usar orçamento entre R${daily_budget*0.8:.0f} e R${daily_budget*1.5:.0f}/dia",
                                f"Objetivo {row.objective} performa bem para este tenant"
                            ],
                            source_campaign_ids=[str(row.id)]
                        )
                        patterns_saved += 1
                
                logger.info("learning_completed",
                    tenant_id=tenant_id,
                    patterns_saved=patterns_saved
                )
                
                return patterns_saved
                
        except Exception as e:
            logger.error("learn_from_campaigns_error", error=str(e))
            return 0


# Singleton
ads_learning_service = AdsLearningService()


def get_ads_learning_service() -> AdsLearningService:
    """Retorna instância singleton do serviço"""
    return ads_learning_service

