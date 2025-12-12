"""
Data Loader - Carrega dados de treino do banco de dados.

Responsável por:
- Carregar dados de leads para treino do LeadScoreNet
- Carregar dados de campanhas para treino do CampaignPredictorNet
- Carregar experiências de RL para treino de políticas
"""
import json
import numpy as np
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime, timedelta
import structlog

from app.config import get_settings
from app.ml.models.lead_score_net import LeadScoreNet
from app.ml.models.campaign_predictor import CampaignPredictorNet

logger = structlog.get_logger()
settings = get_settings()


class TrainingDataLoader:
    """
    Carrega dados de treino do banco para modelos ML.
    """
    
    def __init__(self):
        self._db_engine = None
    
    async def get_db_engine(self):
        """Lazy loading do engine do banco."""
        if self._db_engine is None:
            from sqlalchemy.ext.asyncio import create_async_engine
            db_url = settings.database_url
            if not db_url.startswith('postgresql+asyncpg://'):
                db_url = db_url.replace('postgresql://', 'postgresql+asyncpg://')
            self._db_engine = create_async_engine(db_url)
        return self._db_engine
    
    async def load_lead_score_data(
        self,
        tenant_id: Optional[str] = None,
        days: int = 90,
        min_samples: int = 50
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Carrega dados de leads para treinar LeadScoreNet.
        
        Args:
            tenant_id: ID do tenant (None para global)
            days: Dias de histórico para usar
            min_samples: Mínimo de amostras necessárias
        
        Returns:
            Tuple (features, labels) como arrays numpy
        """
        try:
            engine = await self.get_db_engine()
            
            async with engine.connect() as conn:
                from sqlalchemy import text
                
                since_date = datetime.utcnow() - timedelta(days=days)
                
                # Query para buscar leads com outcome conhecido
                sql = """
                    SELECT 
                        l.id,
                        l.score,
                        l.temperature,
                        ps.position as stage_index,
                        l.metadata,
                        CASE WHEN l.status = 'won' THEN 1 ELSE 0 END as converted
                    FROM leads l
                    LEFT JOIN pipeline_stages ps ON l.stage_id = ps.id
                    WHERE l.created_at > :since_date
                    AND l.status IN ('won', 'lost')
                """
                
                params = {'since_date': since_date}
                
                if tenant_id:
                    sql += " AND l.tenant_id = :tenant_id"
                    params['tenant_id'] = tenant_id
                
                result = await conn.execute(text(sql), params)
                rows = result.fetchall()
                
                if len(rows) < min_samples:
                    logger.warning("insufficient_lead_data",
                        tenant_id=tenant_id,
                        count=len(rows),
                        min_required=min_samples
                    )
                    return np.array([]), np.array([])
                
                features_list = []
                labels_list = []
                
                for row in rows:
                    # Extrai metadata
                    metadata = json.loads(row.metadata) if row.metadata and isinstance(row.metadata, str) else (row.metadata or {})
                    
                    # Monta dados do lead para extração de features
                    lead_data = {
                        'lead_score': row.score or 0,
                        'temperature': row.temperature or 'unknown',
                        'stage_index': row.stage_index or 0,
                        'intent': metadata.get('last_intent', 'unclear'),
                        'intent_confidence': metadata.get('intent_confidence', 0),
                        'num_messages': metadata.get('message_count', 0),
                        'time_since_last_msg': 0,  # Não disponível historicamente
                        'avg_response_time': metadata.get('avg_response_time', 0),
                        'sentiment': metadata.get('sentiment', 0),
                        'has_objection': metadata.get('has_objection', False),
                        'objection_count': metadata.get('objection_count', 0),
                        'budget_mentioned': metadata.get('budget_mentioned', False),
                        'timeline_mentioned': metadata.get('timeline_mentioned', False),
                        'decision_maker': metadata.get('decision_maker', False),
                        'rag_context_relevance': metadata.get('rag_relevance', 0),
                    }
                    
                    features = LeadScoreNet.extract_features(lead_data)
                    features_list.append(features)
                    labels_list.append(row.converted)
                
                logger.info("lead_score_data_loaded",
                    tenant_id=tenant_id,
                    samples=len(features_list),
                    positive_rate=sum(labels_list) / len(labels_list) if labels_list else 0
                )
                
                return np.array(features_list), np.array(labels_list)
                
        except Exception as e:
            logger.error("load_lead_score_data_error", error=str(e))
            return np.array([]), np.array([])
    
    async def load_campaign_data(
        self,
        tenant_id: Optional[str] = None,
        days: int = 90,
        min_samples: int = 30
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Carrega dados de campanhas para treinar CampaignPredictorNet.
        
        Args:
            tenant_id: ID do tenant (None para global)
            days: Dias de histórico
            min_samples: Mínimo de amostras
        
        Returns:
            Tuple (features, targets) como arrays numpy
            targets são [roas, ctr, conversion_rate]
        """
        try:
            engine = await self.get_db_engine()
            
            async with engine.connect() as conn:
                from sqlalchemy import text
                
                since_date = datetime.utcnow() - timedelta(days=days)
                
                sql = """
                    SELECT 
                        ac.id,
                        ac.objective,
                        ac.daily_budget,
                        ac.spend,
                        ac.impressions,
                        ac.clicks,
                        ac.conversions,
                        ac.roas,
                        ac.ctr,
                        ac.metadata
                    FROM ad_campaigns ac
                    WHERE ac.created_at > :since_date
                    AND ac.impressions > 100
                    AND ac.status IN ('ACTIVE', 'PAUSED', 'COMPLETED')
                """
                
                params = {'since_date': since_date}
                
                if tenant_id:
                    sql += " AND ac.tenant_id = :tenant_id"
                    params['tenant_id'] = tenant_id
                
                result = await conn.execute(text(sql), params)
                rows = result.fetchall()
                
                if len(rows) < min_samples:
                    logger.warning("insufficient_campaign_data",
                        tenant_id=tenant_id,
                        count=len(rows),
                        min_required=min_samples
                    )
                    return np.array([]), np.array([])
                
                # Calcula histórico para features
                historical_data = await self._get_historical_averages(conn, tenant_id)
                
                features_list = []
                targets_list = []
                
                for row in rows:
                    metadata = json.loads(row.metadata) if row.metadata and isinstance(row.metadata, str) else (row.metadata or {})
                    
                    campaign_data = {
                        'objective': row.objective or '',
                        'daily_budget': row.daily_budget or 0,
                        'creative_type': metadata.get('creative_type', 'image'),
                        'audience_size': metadata.get('audience_size', 1000000),
                        'is_retargeting': metadata.get('is_retargeting', False),
                        'lookalike_score': metadata.get('lookalike_score', 0.5),
                        'seasonal_factor': metadata.get('seasonal_factor', 0.5),
                    }
                    
                    features = CampaignPredictorNet.extract_features(campaign_data, historical_data)
                    features_list.append(features)
                    
                    # Targets reais
                    roas = row.roas or 0
                    ctr = row.ctr or 0
                    conversion_rate = (row.conversions / row.clicks) if row.clicks > 0 else 0
                    
                    targets_list.append([roas, ctr, conversion_rate])
                
                logger.info("campaign_data_loaded",
                    tenant_id=tenant_id,
                    samples=len(features_list)
                )
                
                return np.array(features_list), np.array(targets_list)
                
        except Exception as e:
            logger.error("load_campaign_data_error", error=str(e))
            return np.array([]), np.array([])
    
    async def _get_historical_averages(
        self,
        conn,
        tenant_id: Optional[str]
    ) -> Dict[str, float]:
        """Calcula médias históricas para features."""
        from sqlalchemy import text
        
        sql = """
            SELECT 
                AVG(ctr) as avg_ctr,
                AVG(roas) as avg_roas,
                AVG(CASE WHEN conversions > 0 THEN spend / conversions ELSE 0 END) as avg_cpa
            FROM ad_campaigns
            WHERE impressions > 100
        """
        
        if tenant_id:
            sql += " AND tenant_id = :tenant_id"
            result = await conn.execute(text(sql), {'tenant_id': tenant_id})
        else:
            result = await conn.execute(text(sql))
        
        row = result.fetchone()
        
        return {
            'avg_ctr': float(row.avg_ctr or 1.0),
            'avg_roas': float(row.avg_roas or 1.0),
            'avg_cpa': float(row.avg_cpa or 50),
        }
    
    async def load_rl_experiences(
        self,
        agent_type: str,
        tenant_id: Optional[str] = None,
        days: int = 30,
        limit: int = 10000
    ) -> List[Dict[str, Any]]:
        """
        Carrega experiências de RL para treino de políticas.
        
        Returns:
            Lista de experiências com state, action, reward, next_state
        """
        try:
            engine = await self.get_db_engine()
            
            async with engine.connect() as conn:
                from sqlalchemy import text
                
                since_date = datetime.utcnow() - timedelta(days=days)
                
                sql = """
                    SELECT 
                        state,
                        action,
                        reward,
                        next_state,
                        is_terminal
                    FROM rl_experiences
                    WHERE agent_type = :agent_type
                    AND reward_received = true
                    AND created_at > :since_date
                """
                
                params = {
                    'agent_type': agent_type,
                    'since_date': since_date,
                }
                
                if tenant_id:
                    sql += " AND tenant_id = :tenant_id"
                    params['tenant_id'] = tenant_id
                
                sql += f" ORDER BY created_at DESC LIMIT {limit}"
                
                result = await conn.execute(text(sql), params)
                rows = result.fetchall()
                
                experiences = []
                for row in rows:
                    experiences.append({
                        'state': json.loads(row.state) if isinstance(row.state, str) else row.state,
                        'action': int(row.action),
                        'reward': float(row.reward),
                        'next_state': json.loads(row.next_state) if row.next_state and isinstance(row.next_state, str) else row.next_state,
                        'is_terminal': row.is_terminal,
                    })
                
                logger.info("rl_experiences_loaded",
                    agent_type=agent_type,
                    tenant_id=tenant_id,
                    count=len(experiences)
                )
                
                return experiences
                
        except Exception as e:
            logger.error("load_rl_experiences_error", error=str(e))
            return []


# Singleton
training_data_loader = TrainingDataLoader()


def get_training_data_loader() -> TrainingDataLoader:
    """Retorna instância singleton do loader."""
    return training_data_loader

