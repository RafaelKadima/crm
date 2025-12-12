"""
Memory Tools - Ferramentas de Memória.

Estas ferramentas permitem que os agentes armazenem e recuperem
informações de curto e longo prazo.

Total: 8 ferramentas
"""
from typing import Dict, Any, List, Optional
from datetime import datetime
import structlog

from mcp.server import CRMMCPServer, ToolParameter

logger = structlog.get_logger()


def register_tools(server: CRMMCPServer) -> None:
    """Registra todas as ferramentas de Memória no servidor MCP."""
    
    # =====================================================
    # 1. get_lead_memory - Memória do lead
    # =====================================================
    server.register_tool(
        name="get_memory_for_lead",
        description="Busca memória de longo prazo associada a um lead.",
        parameters=[
            ToolParameter(name="lead_id", type="string", description="ID do lead"),
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
        ],
        handler=get_memory_for_lead,
        category="memory"
    )
    
    # =====================================================
    # 2. update_lead_memory - Atualiza memória
    # =====================================================
    server.register_tool(
        name="update_memory_for_lead",
        description="Atualiza memória de um lead com novo evento ou preferência.",
        parameters=[
            ToolParameter(name="lead_id", type="string", description="ID do lead"),
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="memory_type", type="string", description="Tipo (event, preference, insight)"),
            ToolParameter(name="content", type="string", description="Conteúdo da memória"),
            ToolParameter(name="metadata", type="object", description="Metadados adicionais", required=False),
        ],
        handler=update_memory_for_lead,
        category="memory"
    )
    
    # =====================================================
    # 3. get_short_term_memory - Memória recente
    # =====================================================
    server.register_tool(
        name="get_short_term_memory",
        description="Busca memória de curto prazo (últimas interações).",
        parameters=[
            ToolParameter(name="entity_id", type="string", description="ID da entidade (lead, campaign)"),
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="entity_type", type="string", description="Tipo (lead, campaign)", required=False, default="lead"),
            ToolParameter(name="limit", type="number", description="Limite de itens", required=False, default=10),
        ],
        handler=get_short_term_memory,
        category="memory"
    )
    
    # =====================================================
    # 4. get_long_term_memory - Memória histórica
    # =====================================================
    server.register_tool(
        name="get_long_term_memory",
        description="Busca memória de longo prazo (padrões, preferências consolidadas).",
        parameters=[
            ToolParameter(name="entity_id", type="string", description="ID da entidade"),
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="entity_type", type="string", description="Tipo (lead, campaign, tenant)", required=False, default="lead"),
        ],
        handler=get_long_term_memory,
        category="memory"
    )
    
    # =====================================================
    # 5. search_similar_contexts - Contextos similares
    # =====================================================
    server.register_tool(
        name="search_similar_contexts",
        description="Busca contextos similares usando embeddings vetoriais.",
        parameters=[
            ToolParameter(name="query", type="string", description="Texto de busca"),
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="top_k", type="number", description="Número de resultados", required=False, default=5),
        ],
        handler=search_similar_contexts,
        category="memory"
    )
    
    # =====================================================
    # 6. get_conversation_embedding - Embedding da conversa
    # =====================================================
    server.register_tool(
        name="get_conversation_embedding",
        description="Gera embedding vetorial de uma conversa para busca semântica.",
        parameters=[
            ToolParameter(name="conversation_text", type="string", description="Texto da conversa"),
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
        ],
        handler=get_conversation_embedding,
        category="memory"
    )
    
    # =====================================================
    # 7. store_insight - Armazena insight
    # =====================================================
    server.register_tool(
        name="store_insight",
        description="Armazena um insight aprendido pelo agente.",
        parameters=[
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="insight_type", type="string", description="Tipo (pattern, preference, rule)"),
            ToolParameter(name="content", type="string", description="Conteúdo do insight"),
            ToolParameter(name="confidence", type="number", description="Confiança (0-1)", required=False, default=0.5),
            ToolParameter(name="related_entities", type="array", description="Entidades relacionadas", required=False),
        ],
        handler=store_insight,
        category="memory"
    )
    
    # =====================================================
    # 8. get_tenant_memory - Memória do tenant
    # =====================================================
    server.register_tool(
        name="get_tenant_memory",
        description="Busca memória consolidada do tenant (padrões gerais, preferências).",
        parameters=[
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="memory_type", type="string", description="Tipo específico", required=False),
        ],
        handler=get_tenant_memory,
        category="memory"
    )
    
    logger.info("Memory tools registered", count=8)


# ==============================================
# Implementações das Ferramentas
# ==============================================

async def get_memory_for_lead(lead_id: str, tenant_id: str) -> Dict[str, Any]:
    """Busca memória do lead."""
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
            # Busca memórias da base de conhecimento
            result = await conn.execute(text("""
                SELECT title, content, category, metadata, created_at
                FROM knowledge_base
                WHERE tenant_id = :tenant_id 
                AND metadata->>'lead_id' = :lead_id
                AND is_active = true
                ORDER BY created_at DESC
                LIMIT 50
            """), {"tenant_id": tenant_id, "lead_id": lead_id})
            
            memories = []
            events = []
            preferences = {}
            
            for row in result.fetchall():
                memory = {
                    "title": row.title,
                    "content": row.content,
                    "category": row.category,
                    "metadata": row.metadata,
                    "created_at": str(row.created_at)
                }
                memories.append(memory)
                
                # Categoriza
                if row.category == "lead_memory":
                    if "preference" in row.content.lower():
                        key = row.title.split("-")[-1].strip() if "-" in row.title else "general"
                        preferences[key] = row.content
                    else:
                        events.append({
                            "content": row.content,
                            "timestamp": str(row.created_at)
                        })
        
        await engine.dispose()
        
        return {
            "lead_id": lead_id,
            "tenant_id": tenant_id,
            "memories": memories,
            "events": events,
            "preferences": preferences,
            "total_count": len(memories)
        }
        
    except Exception as e:
        logger.error("Error getting lead memory", error=str(e))
        return {"lead_id": lead_id, "memories": [], "error": str(e)}


async def update_memory_for_lead(
    lead_id: str,
    tenant_id: str,
    memory_type: str,
    content: str,
    metadata: Dict[str, Any] = None
) -> Dict[str, Any]:
    """Atualiza memória do lead."""
    try:
        from app.rag.sdr_knowledge import get_sdr_knowledge_service
        
        service = get_sdr_knowledge_service()
        
        # Prepara metadata
        full_metadata = metadata or {}
        full_metadata["lead_id"] = lead_id
        full_metadata["memory_type"] = memory_type
        
        # Adiciona à base de conhecimento
        knowledge_id = await service.add_knowledge(
            tenant_id=tenant_id,
            title=f"Lead {lead_id} - {memory_type}",
            content=content,
            category="lead_memory",
            tags=[lead_id, memory_type],
            metadata=full_metadata
        )
        
        return {
            "success": True,
            "memory_id": knowledge_id,
            "lead_id": lead_id,
            "memory_type": memory_type
        }
        
    except Exception as e:
        logger.error("Error updating lead memory", error=str(e))
        return {"success": False, "error": str(e)}


async def get_short_term_memory(
    entity_id: str,
    tenant_id: str,
    entity_type: str = "lead",
    limit: int = 10
) -> Dict[str, Any]:
    """Busca memória de curto prazo."""
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
            if entity_type == "lead":
                # Busca últimas mensagens
                result = await conn.execute(text("""
                    SELECT tm.content, tm.is_from_contact, tm.created_at
                    FROM ticket_messages tm
                    JOIN tickets t ON t.id = tm.ticket_id
                    WHERE t.lead_id = :entity_id AND t.tenant_id = :tenant_id
                    ORDER BY tm.created_at DESC
                    LIMIT :limit
                """), {"entity_id": entity_id, "tenant_id": tenant_id, "limit": limit})
            else:
                # Busca logs de ações
                result = await conn.execute(text("""
                    SELECT action, explanation, created_at
                    FROM agent_action_logs
                    WHERE entity_id = :entity_id AND tenant_id = :tenant_id
                    ORDER BY created_at DESC
                    LIMIT :limit
                """), {"entity_id": entity_id, "tenant_id": tenant_id, "limit": limit})
            
            items = [dict(row._mapping) for row in result.fetchall()]
        
        await engine.dispose()
        
        return {
            "entity_id": entity_id,
            "entity_type": entity_type,
            "items": items,
            "count": len(items),
            "memory_type": "short_term"
        }
        
    except Exception as e:
        logger.error("Error getting short term memory", error=str(e))
        return {"items": [], "error": str(e)}


async def get_long_term_memory(
    entity_id: str,
    tenant_id: str,
    entity_type: str = "lead"
) -> Dict[str, Any]:
    """Busca memória de longo prazo."""
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
            # Busca padrões consolidados
            result = await conn.execute(text("""
                SELECT title, content, category, metadata
                FROM knowledge_base
                WHERE tenant_id = :tenant_id 
                AND (
                    metadata->>'entity_id' = :entity_id
                    OR metadata->>'lead_id' = :entity_id
                )
                AND category IN ('patterns', 'preferences', 'insights')
                AND is_active = true
                ORDER BY priority DESC, created_at DESC
                LIMIT 20
            """), {"tenant_id": tenant_id, "entity_id": entity_id})
            
            patterns = []
            preferences = []
            insights = []
            
            for row in result.fetchall():
                item = {
                    "title": row.title,
                    "content": row.content,
                    "metadata": row.metadata
                }
                
                if row.category == "patterns":
                    patterns.append(item)
                elif row.category == "preferences":
                    preferences.append(item)
                elif row.category == "insights":
                    insights.append(item)
        
        await engine.dispose()
        
        return {
            "entity_id": entity_id,
            "entity_type": entity_type,
            "patterns": patterns,
            "preferences": preferences,
            "insights": insights,
            "memory_type": "long_term"
        }
        
    except Exception as e:
        logger.error("Error getting long term memory", error=str(e))
        return {"patterns": [], "preferences": [], "insights": [], "error": str(e)}


async def search_similar_contexts(
    query: str,
    tenant_id: str,
    top_k: int = 5
) -> Dict[str, Any]:
    """Busca contextos similares."""
    try:
        from app.rag.sdr_knowledge import get_sdr_knowledge_service
        
        service = get_sdr_knowledge_service()
        
        results = await service.search(
            query=query,
            tenant_id=tenant_id,
            top_k=top_k
        )
        
        contexts = []
        for result in results:
            contexts.append({
                "content": result.get("content"),
                "title": result.get("title"),
                "similarity": result.get("similarity", 0),
                "category": result.get("category")
            })
        
        return {
            "query": query,
            "contexts": contexts,
            "count": len(contexts)
        }
        
    except Exception as e:
        logger.error("Error searching similar contexts", error=str(e))
        return {"contexts": [], "error": str(e)}


async def get_conversation_embedding(
    conversation_text: str,
    tenant_id: str
) -> Dict[str, Any]:
    """Gera embedding de conversa."""
    try:
        from app.rag.embeddings import EmbeddingService
        
        embedding_service = EmbeddingService()
        
        embedding = await embedding_service.generate_embedding(conversation_text)
        
        return {
            "text_length": len(conversation_text),
            "embedding_dimension": len(embedding) if embedding else 0,
            "embedding": embedding[:10] if embedding else [],  # Primeiros 10 valores
            "full_embedding_available": True
        }
        
    except Exception as e:
        logger.error("Error getting conversation embedding", error=str(e))
        return {"embedding": [], "error": str(e)}


async def store_insight(
    tenant_id: str,
    insight_type: str,
    content: str,
    confidence: float = 0.5,
    related_entities: List[str] = None
) -> Dict[str, Any]:
    """Armazena insight aprendido."""
    try:
        from app.rag.ads_knowledge import get_ads_knowledge_service
        
        service = get_ads_knowledge_service()
        
        metadata = {
            "insight_type": insight_type,
            "confidence": confidence,
            "related_entities": related_entities or [],
            "learned_at": datetime.utcnow().isoformat()
        }
        
        knowledge_id = await service.add_knowledge(
            tenant_id=tenant_id,
            title=f"Insight: {insight_type}",
            content=content,
            category="insights",
            tags=["auto_insight", insight_type],
            metadata=metadata,
            source="agent_learning"
        )
        
        return {
            "success": True,
            "insight_id": knowledge_id,
            "insight_type": insight_type,
            "confidence": confidence
        }
        
    except Exception as e:
        logger.error("Error storing insight", error=str(e))
        return {"success": False, "error": str(e)}


async def get_tenant_memory(
    tenant_id: str,
    memory_type: str = None
) -> Dict[str, Any]:
    """Busca memória do tenant."""
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
            # Busca configurações e padrões do tenant
            query = """
                SELECT title, content, category, metadata, priority
                FROM knowledge_base
                WHERE tenant_id = :tenant_id 
                AND is_active = true
            """
            
            params = {"tenant_id": tenant_id}
            
            if memory_type:
                query += " AND category = :memory_type"
                params["memory_type"] = memory_type
            
            query += " ORDER BY priority DESC, created_at DESC LIMIT 50"
            
            result = await conn.execute(text(query), params)
            
            memories = {}
            
            for row in result.fetchall():
                category = row.category
                if category not in memories:
                    memories[category] = []
                
                memories[category].append({
                    "title": row.title,
                    "content": row.content,
                    "priority": row.priority,
                    "metadata": row.metadata
                })
        
        await engine.dispose()
        
        # Estatísticas
        total = sum(len(items) for items in memories.values())
        
        return {
            "tenant_id": tenant_id,
            "memory_type_filter": memory_type,
            "memories_by_category": memories,
            "categories": list(memories.keys()),
            "total_items": total
        }
        
    except Exception as e:
        logger.error("Error getting tenant memory", error=str(e))
        return {"memories_by_category": {}, "error": str(e)}

