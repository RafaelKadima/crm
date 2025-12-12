"""
Vector Store para RAG usando pgvector/Supabase
"""
import asyncio
from typing import List, Optional, Dict, Any
from openai import AsyncOpenAI
import structlog

from app.config import get_settings
from app.models.schemas import KnowledgeChunk, RAGResult

logger = structlog.get_logger()
settings = get_settings()


class VectorStore:
    """Gerencia embeddings e busca vetorial"""
    
    def __init__(self):
        self.openai = AsyncOpenAI(
            api_key=settings.openai_api_key,
            project=settings.openai_project_id if settings.openai_project_id else None
        )
        self._supabase = None
    
    @property
    def supabase(self):
        """Lazy loading do cliente Supabase"""
        if self._supabase is None and settings.supabase_url:
            from supabase import create_client
            self._supabase = create_client(
                settings.supabase_url,
                settings.supabase_key
            )
        return self._supabase
    
    async def create_embedding(self, text: str) -> List[float]:
        """Cria embedding para um texto"""
        try:
            response = await self.openai.embeddings.create(
                model=settings.openai_embedding_model,
                input=text
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error("embedding_error", error=str(e))
            return []
    
    async def search_knowledge(
        self,
        query: str,
        tenant_id: str,
        agent_id: str,
        top_k: int = None,
        threshold: float = None,
        source_filter: Optional[List[str]] = None
    ) -> RAGResult:
        """
        Busca conhecimento relevante na base vetorial
        """
        top_k = top_k or settings.rag_top_k
        threshold = threshold or settings.rag_similarity_threshold
        
        # Cria embedding da query
        query_embedding = await self.create_embedding(query)
        
        if not query_embedding:
            return RAGResult(chunks=[], query=query, total_tokens=0)
        
        chunks = []
        
        # Busca no Supabase se configurado
        if self.supabase:
            chunks = await self._search_supabase(
                query_embedding,
                tenant_id,
                agent_id,
                top_k,
                threshold,
                source_filter
            )
        else:
            # Fallback: busca no PostgreSQL local
            chunks = await self._search_postgres(
                query_embedding,
                tenant_id,
                agent_id,
                top_k,
                threshold,
                source_filter
            )
        
        # Calcula tokens aproximados
        total_tokens = sum(len(c.content.split()) * 1.3 for c in chunks)
        
        return RAGResult(
            chunks=chunks,
            query=query,
            total_tokens=int(total_tokens)
        )
    
    async def _search_supabase(
        self,
        embedding: List[float],
        tenant_id: str,
        agent_id: str,
        top_k: int,
        threshold: float,
        source_filter: Optional[List[str]]
    ) -> List[KnowledgeChunk]:
        """Busca vetorial no Supabase"""
        try:
            # RPC para busca vetorial
            result = self.supabase.rpc(
                'match_knowledge',
                {
                    'query_embedding': embedding,
                    'match_tenant_id': tenant_id,
                    'match_agent_id': agent_id,
                    'match_threshold': threshold,
                    'match_count': top_k
                }
            ).execute()
            
            chunks = []
            for row in result.data or []:
                if source_filter and row.get('source') not in source_filter:
                    continue
                    
                chunks.append(KnowledgeChunk(
                    id=row['id'],
                    content=row['content'],
                    source=row.get('source', 'unknown'),
                    similarity=row.get('similarity', 0),
                    metadata=row.get('metadata', {})
                ))
            
            return chunks
            
        except Exception as e:
            logger.error("supabase_search_error", error=str(e))
            return []
    
    async def _search_postgres(
        self,
        embedding: List[float],
        tenant_id: str,
        agent_id: str,
        top_k: int,
        threshold: float,
        source_filter: Optional[List[str]]
    ) -> List[KnowledgeChunk]:
        """Busca vetorial no PostgreSQL local usando similaridade de cosseno"""
        try:
            from sqlalchemy.ext.asyncio import create_async_engine
            from sqlalchemy import text
            import json
            
            engine = create_async_engine(settings.database_url.replace('postgresql://', 'postgresql+asyncpg://'))
            
            async with engine.connect() as conn:
                # Busca todos os embeddings do agente
                query = text("""
                    SELECT 
                        id,
                        content,
                        source,
                        source_type,
                        metadata,
                        embedding
                    FROM sdr_knowledge_embeddings
                    WHERE tenant_id = :tenant_id
                    AND (sdr_agent_id = :agent_id OR sdr_agent_id IS NULL)
                    AND embedding IS NOT NULL
                """)
                
                result = await conn.execute(query, {
                    'tenant_id': tenant_id,
                    'agent_id': agent_id,
                })
                
                rows = result.fetchall()
                print(f"[RAG-DB] Embeddings encontrados no banco: {len(rows)}")
                print(f"[RAG-DB] Tenant: {tenant_id}, Agent: {agent_id}, Threshold: {threshold}")
                
                # Calcula similaridade em Python
                chunks = []
                for row in rows:
                    try:
                        row_embedding = json.loads(row.embedding) if isinstance(row.embedding, str) else row.embedding
                        if not row_embedding:
                            continue
                            
                        similarity = self._cosine_similarity(embedding, row_embedding)
                        
                        print(f"[RAG-SIM] Source: {row.source}, Similaridade: {similarity:.4f}, Threshold: {threshold}, Passou: {similarity >= threshold}")
                        
                        if similarity >= threshold:
                            chunks.append({
                                'id': str(row.id),
                                'content': row.content,
                                'source': row.source or 'unknown',
                                'similarity': similarity,
                                'metadata': json.loads(row.metadata) if isinstance(row.metadata, str) else (row.metadata or {})
                            })
                    except Exception:
                        continue
                
                # Ordena por similaridade
                chunks.sort(key=lambda x: x['similarity'], reverse=True)
                
                # Retorna top_k
                result_chunks = []
                for chunk in chunks[:top_k]:
                    result_chunks.append(KnowledgeChunk(
                        id=chunk['id'],
                        content=chunk['content'],
                        source=chunk['source'],
                        similarity=chunk['similarity'],
                        metadata=chunk['metadata']
                    ))
                
                logger.info("postgres_search_completed", chunks_found=len(result_chunks))
                return result_chunks
                
        except Exception as e:
            logger.error("postgres_search_error", error=str(e))
            return []
    
    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calcula similaridade de cosseno entre dois vetores"""
        if len(vec1) != len(vec2):
            return 0.0
        
        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        norm1 = sum(a * a for a in vec1) ** 0.5
        norm2 = sum(b * b for b in vec2) ** 0.5
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        return dot_product / (norm1 * norm2)
    
    async def add_knowledge(
        self,
        content: str,
        tenant_id: str,
        agent_id: str,
        source: str,
        metadata: Dict[str, Any] = None
    ) -> Optional[str]:
        """Adiciona conhecimento à base vetorial"""
        embedding = await self.create_embedding(content)
        
        if not embedding:
            return None
        
        if self.supabase:
            try:
                result = self.supabase.table('sdr_knowledge_embeddings').insert({
                    'tenant_id': tenant_id,
                    'sdr_agent_id': agent_id,
                    'content': content,
                    'embedding': embedding,
                    'source': source,
                    'metadata': metadata or {}
                }).execute()
                
                return result.data[0]['id'] if result.data else None
            except Exception as e:
                logger.error("add_knowledge_error", error=str(e))
                return None
        
        return None
    
    async def save_learned_knowledge(
        self,
        tenant_id: str,
        agent_id: str,
        content: str,
        embedding: List[float],
        source: str,
        metadata: Dict[str, Any] = None
    ) -> bool:
        """
        Salva conhecimento aprendido de feedbacks e padrões.
        Este conhecimento é usado para melhorar respostas futuras.
        """
        try:
            from sqlalchemy.ext.asyncio import create_async_engine
            from sqlalchemy import text
            import json
            import uuid
            
            engine = await self.get_db_engine()
            
            async with engine.begin() as conn:
                await conn.execute(text("""
                    INSERT INTO sdr_knowledge_embeddings 
                    (id, tenant_id, sdr_agent_id, content, source, source_type, embedding, metadata, created_at, updated_at)
                    VALUES (:id, :tenant_id, :agent_id, :content, :source, :source_type, :embedding, :metadata, NOW(), NOW())
                """), {
                    'id': str(uuid.uuid4()),
                    'tenant_id': tenant_id,
                    'agent_id': agent_id,
                    'content': content,
                    'source': source,
                    'source_type': 'learned',
                    'embedding': json.dumps(embedding),
                    'metadata': json.dumps(metadata or {})
                })
            
            logger.info("learned_knowledge_saved",
                source=source,
                agent_id=agent_id
            )
            return True
            
        except Exception as e:
            logger.error("save_learned_knowledge_error", error=str(e))
            return False


# Singleton
vector_store = VectorStore()

