"""
Knowledge Base Service específico para Ads
Gerencia conhecimento, regras e padrões aprendidos de campanhas
"""
import json
import uuid
from typing import List, Optional, Dict, Any
from dataclasses import dataclass
from datetime import datetime, timedelta
import structlog

from app.config import get_settings
from app.rag.vector_store import VectorStore
from app.models.schemas import KnowledgeChunk

logger = structlog.get_logger()
settings = get_settings()


@dataclass
class AdsKnowledgeItem:
    """Item de conhecimento de Ads"""
    id: str
    title: str
    content: str
    context: str
    category: str
    priority: int
    tags: List[str]
    metadata: Dict[str, Any]
    similarity: float = 0.0


@dataclass
class CampaignPattern:
    """Padrão aprendido de campanhas"""
    id: str
    name: str
    objective: str
    conditions: Dict[str, Any]
    success_metrics: Dict[str, float]
    recommendations: List[str]
    usage_count: int
    success_rate: float


@dataclass
class AdsSearchResult:
    """Resultado de busca no knowledge base de Ads"""
    items: List[AdsKnowledgeItem]
    patterns: List[CampaignPattern]
    query: str
    total_items: int


class AdsKnowledgeService:
    """
    Serviço de Knowledge Base para Ads
    Gerencia regras, melhores práticas e padrões aprendidos
    """
    
    def __init__(self):
        self.vector_store = VectorStore()
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
    # BUSCA DE CONHECIMENTO
    # ==========================================
    
    async def search_ads_rules(
        self,
        query: str,
        tenant_id: str,
        categories: List[str] = None,
        tags: List[str] = None,
        top_k: int = 5
    ) -> List[AdsKnowledgeItem]:
        """
        Busca regras e conhecimento de Ads relevante para a query
        Usa busca vetorial + filtros
        """
        try:
            engine = await self.get_db_engine()
            
            # Cria embedding da query
            query_embedding = await self.vector_store.create_embedding(query)
            
            if not query_embedding:
                logger.warning("ads_search_no_embedding", query=query)
                return []
            
            async with engine.connect() as conn:
                from sqlalchemy import text
                
                # Busca no knowledge_base por contexto 'ads'
                sql = text("""
                    SELECT 
                        id, title, content, context, category,
                        priority, tags, metadata, embedding
                    FROM knowledge_base
                    WHERE tenant_id = :tenant_id
                    AND context = 'ads'
                    AND is_active = true
                    AND embedding IS NOT NULL
                """)
                
                result = await conn.execute(sql, {'tenant_id': tenant_id})
                rows = result.fetchall()
                
                items = []
                for row in rows:
                    try:
                        row_embedding = json.loads(row.embedding) if isinstance(row.embedding, str) else row.embedding
                        if not row_embedding:
                            continue
                        
                        similarity = self.vector_store._cosine_similarity(query_embedding, row_embedding)
                        
                        if similarity < 0.5:  # Threshold mínimo
                            continue
                        
                        # Filtro por categoria
                        if categories and row.category not in categories:
                            continue
                        
                        # Filtro por tags
                        row_tags = json.loads(row.tags) if isinstance(row.tags, str) else (row.tags or [])
                        if tags and not any(t in row_tags for t in tags):
                            continue
                        
                        items.append(AdsKnowledgeItem(
                            id=str(row.id),
                            title=row.title,
                            content=row.content,
                            context=row.context,
                            category=row.category,
                            priority=row.priority or 0,
                            tags=row_tags,
                            metadata=json.loads(row.metadata) if isinstance(row.metadata, str) else (row.metadata or {}),
                            similarity=similarity
                        ))
                    except Exception as e:
                        logger.error("ads_search_row_error", error=str(e))
                        continue
                
                # Ordena por similaridade * prioridade
                items.sort(key=lambda x: x.similarity * (1 + x.priority * 0.1), reverse=True)
                
                logger.info("ads_rules_search", 
                    query=query[:50], 
                    tenant_id=tenant_id, 
                    results=len(items[:top_k])
                )
                
                return items[:top_k]
                
        except Exception as e:
            logger.error("ads_rules_search_error", error=str(e))
            return []
    
    async def get_campaign_patterns(
        self,
        tenant_id: str,
        objective: str = None,
        min_success_rate: float = 0.0
    ) -> List[CampaignPattern]:
        """
        Retorna padrões de campanhas bem-sucedidas
        """
        try:
            engine = await self.get_db_engine()
            
            async with engine.connect() as conn:
                from sqlalchemy import text
                
                sql = text("""
                    SELECT 
                        id, title, content, metadata
                    FROM knowledge_base
                    WHERE tenant_id = :tenant_id
                    AND context = 'ads'
                    AND category = 'patterns'
                    AND is_active = true
                    ORDER BY priority DESC, usage_count DESC
                    LIMIT 20
                """)
                
                result = await conn.execute(sql, {'tenant_id': tenant_id})
                rows = result.fetchall()
                
                patterns = []
                for row in rows:
                    try:
                        metadata = json.loads(row.metadata) if isinstance(row.metadata, str) else (row.metadata or {})
                        
                        # Filtro por objetivo
                        pattern_objective = metadata.get('objective', '')
                        if objective and pattern_objective and pattern_objective != objective:
                            continue
                        
                        # Filtro por taxa de sucesso
                        success_rate = metadata.get('success_rate', 0)
                        if success_rate < min_success_rate:
                            continue
                        
                        patterns.append(CampaignPattern(
                            id=str(row.id),
                            name=row.title,
                            objective=pattern_objective,
                            conditions=metadata.get('conditions', {}),
                            success_metrics=metadata.get('success_metrics', {}),
                            recommendations=metadata.get('recommendations', []),
                            usage_count=metadata.get('usage_count', 0),
                            success_rate=success_rate
                        ))
                    except Exception:
                        continue
                
                return patterns
                
        except Exception as e:
            logger.error("get_campaign_patterns_error", error=str(e))
            return []
    
    # ==========================================
    # ADICIONAR CONHECIMENTO
    # ==========================================
    
    async def add_knowledge(
        self,
        tenant_id: str,
        title: str,
        content: str,
        category: str,
        priority: int = 0,
        tags: List[str] = None,
        metadata: Dict[str, Any] = None,
        source: str = 'manual'
    ) -> Optional[str]:
        """
        Adiciona novo conhecimento à base de Ads
        """
        try:
            # Gera embedding
            embedding = await self.vector_store.create_embedding(f"{title}\n{content}")
            
            if not embedding:
                logger.error("add_knowledge_no_embedding")
                return None
            
            engine = await self.get_db_engine()
            
            async with engine.begin() as conn:
                from sqlalchemy import text
                
                knowledge_id = str(uuid.uuid4())
                
                await conn.execute(text("""
                    INSERT INTO knowledge_base 
                    (id, tenant_id, context, category, title, content, embedding, 
                     metadata, priority, tags, source, is_active, created_at, updated_at)
                    VALUES 
                    (:id, :tenant_id, 'ads', :category, :title, :content, :embedding,
                     :metadata, :priority, :tags, :source, true, NOW(), NOW())
                """), {
                    'id': knowledge_id,
                    'tenant_id': tenant_id,
                    'category': category,
                    'title': title,
                    'content': content,
                    'embedding': json.dumps(embedding),
                    'metadata': json.dumps(metadata or {}),
                    'priority': priority,
                    'tags': json.dumps(tags or []),
                    'source': source
                })
            
            logger.info("ads_knowledge_added", 
                id=knowledge_id, 
                category=category, 
                tenant_id=tenant_id
            )
            
            return knowledge_id
            
        except Exception as e:
            logger.error("add_ads_knowledge_error", error=str(e))
            return None
    
    async def add_best_practice(
        self,
        tenant_id: str,
        title: str,
        content: str,
        tags: List[str] = None,
        source_campaign_id: str = None
    ) -> Optional[str]:
        """
        Adiciona boa prática aprendida de campanha bem-sucedida
        """
        metadata = {
            'learned_at': datetime.utcnow().isoformat(),
            'source_campaign_id': source_campaign_id
        }
        
        return await self.add_knowledge(
            tenant_id=tenant_id,
            title=title,
            content=content,
            category='best_practices',
            priority=5,  # Práticas aprendidas têm prioridade média-alta
            tags=tags or ['learned', 'best_practice'],
            metadata=metadata,
            source='learned'
        )
    
    async def save_campaign_pattern(
        self,
        tenant_id: str,
        name: str,
        objective: str,
        conditions: Dict[str, Any],
        success_metrics: Dict[str, float],
        recommendations: List[str],
        source_campaign_ids: List[str] = None
    ) -> Optional[str]:
        """
        Salva um padrão de campanha bem-sucedida
        """
        content = f"""
Padrão de Campanha: {name}
Objetivo: {objective}
Métricas de Sucesso: {json.dumps(success_metrics)}
Recomendações: {', '.join(recommendations)}
        """.strip()
        
        metadata = {
            'objective': objective,
            'conditions': conditions,
            'success_metrics': success_metrics,
            'recommendations': recommendations,
            'source_campaign_ids': source_campaign_ids or [],
            'created_at': datetime.utcnow().isoformat(),
            'usage_count': 0,
            'success_rate': success_metrics.get('roas', 0) / 2  # Normaliza ROAS para 0-1
        }
        
        return await self.add_knowledge(
            tenant_id=tenant_id,
            title=name,
            content=content,
            category='patterns',
            priority=10,  # Padrões têm alta prioridade
            tags=['pattern', objective.lower()],
            metadata=metadata,
            source='learned'
        )
    
    # ==========================================
    # CONTEXTO PARA AGENTE
    # ==========================================
    
    async def get_context_for_agent(
        self,
        tenant_id: str,
        user_message: str,
        objective: str = None
    ) -> Dict[str, Any]:
        """
        Monta contexto completo para o agente orquestrador
        Inclui regras, padrões e melhores práticas relevantes
        """
        # Busca regras relevantes
        rules = await self.search_ads_rules(
            query=user_message,
            tenant_id=tenant_id,
            categories=['rules', 'guidelines'],
            top_k=3
        )
        
        # Busca melhores práticas relevantes
        best_practices = await self.search_ads_rules(
            query=user_message,
            tenant_id=tenant_id,
            categories=['best_practices'],
            top_k=3
        )
        
        # Busca padrões de sucesso
        patterns = await self.get_campaign_patterns(
            tenant_id=tenant_id,
            objective=objective,
            min_success_rate=0.5
        )
        
        context = {
            'rules': [
                {'title': r.title, 'content': r.content, 'priority': r.priority}
                for r in rules
            ],
            'best_practices': [
                {'title': bp.title, 'content': bp.content}
                for bp in best_practices
            ],
            'patterns': [
                {
                    'name': p.name,
                    'objective': p.objective,
                    'recommendations': p.recommendations,
                    'success_rate': p.success_rate
                }
                for p in patterns[:3]
            ],
            'timestamp': datetime.utcnow().isoformat()
        }
        
        logger.info("ads_context_built",
            tenant_id=tenant_id,
            rules_count=len(rules),
            practices_count=len(best_practices),
            patterns_count=len(patterns)
        )
        
        return context
    
    # ==========================================
    # INCREMENTAR USO
    # ==========================================
    
    async def increment_usage(self, knowledge_id: str) -> None:
        """Incrementa contador de uso de um item"""
        try:
            engine = await self.get_db_engine()
            
            async with engine.begin() as conn:
                from sqlalchemy import text
                
                await conn.execute(text("""
                    UPDATE knowledge_base 
                    SET usage_count = usage_count + 1, last_used_at = NOW()
                    WHERE id = :id
                """), {'id': knowledge_id})
                
        except Exception as e:
            logger.error("increment_usage_error", error=str(e))
    
    # ==========================================
    # LISTAR E GERENCIAR
    # ==========================================
    
    async def list_knowledge(
        self,
        tenant_id: str,
        category: str = None,
        page: int = 1,
        limit: int = 20
    ) -> Dict[str, Any]:
        """Lista conhecimento do tenant"""
        try:
            engine = await self.get_db_engine()
            
            async with engine.connect() as conn:
                from sqlalchemy import text
                
                offset = (page - 1) * limit
                
                where_clause = "tenant_id = :tenant_id AND context = 'ads' AND is_active = true"
                params = {'tenant_id': tenant_id, 'limit': limit, 'offset': offset}
                
                if category:
                    where_clause += " AND category = :category"
                    params['category'] = category
                
                # Conta total
                count_result = await conn.execute(
                    text(f"SELECT COUNT(*) FROM knowledge_base WHERE {where_clause}"),
                    params
                )
                total = count_result.scalar()
                
                # Busca itens
                result = await conn.execute(text(f"""
                    SELECT id, title, content, category, priority, tags, 
                           usage_count, source, created_at
                    FROM knowledge_base
                    WHERE {where_clause}
                    ORDER BY priority DESC, created_at DESC
                    LIMIT :limit OFFSET :offset
                """), params)
                
                items = []
                for row in result.fetchall():
                    items.append({
                        'id': str(row.id),
                        'title': row.title,
                        'content': row.content[:200] + '...' if len(row.content) > 200 else row.content,
                        'category': row.category,
                        'priority': row.priority,
                        'tags': json.loads(row.tags) if isinstance(row.tags, str) else (row.tags or []),
                        'usage_count': row.usage_count,
                        'source': row.source,
                        'created_at': row.created_at.isoformat() if row.created_at else None
                    })
                
                return {
                    'data': items,
                    'total': total,
                    'page': page,
                    'limit': limit,
                    'pages': (total + limit - 1) // limit
                }
                
        except Exception as e:
            logger.error("list_knowledge_error", error=str(e))
            return {'data': [], 'total': 0, 'page': page, 'limit': limit, 'pages': 0}
    
    async def delete_knowledge(self, knowledge_id: str, tenant_id: str) -> bool:
        """Desativa conhecimento (soft delete)"""
        try:
            engine = await self.get_db_engine()
            
            async with engine.begin() as conn:
                from sqlalchemy import text
                
                await conn.execute(text("""
                    UPDATE knowledge_base 
                    SET is_active = false, updated_at = NOW()
                    WHERE id = :id AND tenant_id = :tenant_id
                """), {'id': knowledge_id, 'tenant_id': tenant_id})
            
            return True
            
        except Exception as e:
            logger.error("delete_knowledge_error", error=str(e))
            return False


# Singleton
ads_knowledge_service = AdsKnowledgeService()


def get_ads_knowledge_service() -> AdsKnowledgeService:
    """Retorna instância singleton do serviço"""
    return ads_knowledge_service

