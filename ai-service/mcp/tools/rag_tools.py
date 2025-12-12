"""
RAG Tools - Ferramentas de Retrieval Augmented Generation.

Estas ferramentas permitem que os agentes busquem e utilizem
conhecimento da base de dados vetorial.

Total: 10 ferramentas
"""
from typing import Dict, Any, List, Optional
from datetime import datetime
import structlog

from mcp.server import CRMMCPServer, ToolParameter

logger = structlog.get_logger()


def register_tools(server: CRMMCPServer) -> None:
    """Registra todas as ferramentas RAG no servidor MCP."""
    
    # =====================================================
    # 1. search_knowledge - Busca semântica
    # =====================================================
    server.register_tool(
        name="search_knowledge",
        description="Busca semântica na base de conhecimento usando embeddings vetoriais.",
        parameters=[
            ToolParameter(name="query", type="string", description="Texto da busca"),
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="category", type="string", description="Categoria para filtrar", required=False),
            ToolParameter(name="top_k", type="number", description="Número de resultados", required=False, default=5),
        ],
        handler=search_knowledge,
        category="rag"
    )
    
    # =====================================================
    # 2. get_best_practices - Melhores práticas
    # =====================================================
    server.register_tool(
        name="get_best_practices",
        description="Busca melhores práticas relevantes para uma situação.",
        parameters=[
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="context", type="string", description="Contexto da situação", required=False),
            ToolParameter(name="agent_type", type="string", description="Tipo de agente (sdr, ads)", required=False),
        ],
        handler=get_best_practices,
        category="rag"
    )
    
    # =====================================================
    # 3. get_rules - Regras de negócio
    # =====================================================
    server.register_tool(
        name="get_rules",
        description="Busca regras de negócio aplicáveis.",
        parameters=[
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="domain", type="string", description="Domínio (sdr, ads, pricing)", required=False),
        ],
        handler=get_rules,
        category="rag"
    )
    
    # =====================================================
    # 4. get_patterns - Padrões aprendidos
    # =====================================================
    server.register_tool(
        name="get_patterns",
        description="Busca padrões de sucesso aprendidos automaticamente.",
        parameters=[
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="pattern_type", type="string", description="Tipo de padrão (campaign, lead, creative)", required=False),
        ],
        handler=get_patterns,
        category="rag"
    )
    
    # =====================================================
    # 5. upload_document - Upload de documento
    # =====================================================
    server.register_tool(
        name="upload_document",
        description="Processa e indexa um documento na base de conhecimento.",
        parameters=[
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="content", type="string", description="Conteúdo do documento"),
            ToolParameter(name="title", type="string", description="Título do documento"),
            ToolParameter(name="category", type="string", description="Categoria (brand_guidelines, documents, rules)"),
        ],
        handler=upload_document,
        category="rag"
    )
    
    # =====================================================
    # 6. add_knowledge - Adiciona conhecimento manual
    # =====================================================
    server.register_tool(
        name="add_knowledge",
        description="Adiciona um item de conhecimento manualmente.",
        parameters=[
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="title", type="string", description="Título"),
            ToolParameter(name="content", type="string", description="Conteúdo"),
            ToolParameter(name="category", type="string", description="Categoria"),
            ToolParameter(name="tags", type="array", description="Tags para busca", required=False),
        ],
        handler=add_knowledge,
        category="rag"
    )
    
    # =====================================================
    # 7. get_knowledge_stats - Estatísticas
    # =====================================================
    server.register_tool(
        name="get_knowledge_stats",
        description="Retorna estatísticas da base de conhecimento.",
        parameters=[
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
        ],
        handler=get_knowledge_stats,
        category="rag"
    )
    
    # =====================================================
    # 8. invalidate_knowledge - Remove conhecimento
    # =====================================================
    server.register_tool(
        name="invalidate_knowledge",
        description="Marca um item de conhecimento como inativo/inválido.",
        parameters=[
            ToolParameter(name="knowledge_id", type="string", description="ID do conhecimento"),
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="reason", type="string", description="Motivo da invalidação", required=False),
        ],
        handler=invalidate_knowledge,
        category="rag"
    )
    
    # =====================================================
    # 9. get_context_for_prompt - Monta contexto
    # =====================================================
    server.register_tool(
        name="get_context_for_prompt",
        description="Monta contexto RAG formatado para usar em prompts do LLM.",
        parameters=[
            ToolParameter(name="query", type="string", description="Query para buscar contexto"),
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="max_tokens", type="number", description="Máximo de tokens no contexto", required=False, default=2000),
        ],
        handler=get_context_for_prompt,
        category="rag"
    )
    
    # =====================================================
    # 10. learn_from_campaigns - Aprende padrões
    # =====================================================
    server.register_tool(
        name="learn_from_campaigns",
        description="Analisa campanhas e extrai padrões de sucesso para a base de conhecimento.",
        parameters=[
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="min_roas", type="number", description="ROAS mínimo para considerar sucesso", required=False, default=1.5),
        ],
        handler=learn_from_campaigns,
        category="rag"
    )
    
    logger.info("RAG tools registered", count=10)


# ==============================================
# Implementações das Ferramentas
# ==============================================

async def search_knowledge(
    query: str,
    tenant_id: str,
    category: str = None,
    top_k: int = 5
) -> Dict[str, Any]:
    """Busca semântica na base de conhecimento."""
    try:
        from app.rag.ads_knowledge import get_ads_knowledge_service
        from app.rag.sdr_knowledge import get_sdr_knowledge_service
        
        # Usa serviço apropriado
        ads_service = get_ads_knowledge_service()
        sdr_service = get_sdr_knowledge_service()
        
        results = []
        
        # Busca em ambas as bases
        ads_results = await ads_service.search(
            query=query,
            tenant_id=tenant_id,
            context=category,
            top_k=top_k
        )
        results.extend(ads_results)
        
        sdr_results = await sdr_service.search(
            query=query,
            tenant_id=tenant_id,
            context=category,
            top_k=top_k
        )
        results.extend(sdr_results)
        
        # Remove duplicatas e ordena por relevância
        seen = set()
        unique_results = []
        for r in results:
            content_hash = hash(r.get("content", "")[:100])
            if content_hash not in seen:
                seen.add(content_hash)
                unique_results.append(r)
        
        # Limita ao top_k
        unique_results = unique_results[:top_k]
        
        return {
            "query": query,
            "results": unique_results,
            "count": len(unique_results),
            "category_filter": category
        }
        
    except Exception as e:
        logger.error("Error searching knowledge", error=str(e))
        return {"query": query, "results": [], "error": str(e)}


async def get_best_practices(
    tenant_id: str,
    context: str = None,
    agent_type: str = None
) -> Dict[str, Any]:
    """Busca melhores práticas."""
    try:
        query = "melhores práticas best practices"
        if context:
            query += f" {context}"
        if agent_type:
            query += f" {agent_type}"
        
        results = await search_knowledge(
            query=query,
            tenant_id=tenant_id,
            category="best_practices",
            top_k=10
        )
        
        return {
            "tenant_id": tenant_id,
            "context": context,
            "agent_type": agent_type,
            "practices": results.get("results", []),
            "count": results.get("count", 0)
        }
        
    except Exception as e:
        logger.error("Error getting best practices", error=str(e))
        return {"practices": [], "error": str(e)}


async def get_rules(tenant_id: str, domain: str = None) -> Dict[str, Any]:
    """Busca regras de negócio."""
    try:
        query = "regras rules limitações constraints"
        if domain:
            query += f" {domain}"
        
        results = await search_knowledge(
            query=query,
            tenant_id=tenant_id,
            category="rules",
            top_k=10
        )
        
        return {
            "tenant_id": tenant_id,
            "domain": domain,
            "rules": results.get("results", []),
            "count": results.get("count", 0)
        }
        
    except Exception as e:
        logger.error("Error getting rules", error=str(e))
        return {"rules": [], "error": str(e)}


async def get_patterns(tenant_id: str, pattern_type: str = None) -> Dict[str, Any]:
    """Busca padrões aprendidos."""
    try:
        query = "padrões patterns sucesso winning"
        if pattern_type:
            query += f" {pattern_type}"
        
        results = await search_knowledge(
            query=query,
            tenant_id=tenant_id,
            category="patterns",
            top_k=10
        )
        
        return {
            "tenant_id": tenant_id,
            "pattern_type": pattern_type,
            "patterns": results.get("results", []),
            "count": results.get("count", 0)
        }
        
    except Exception as e:
        logger.error("Error getting patterns", error=str(e))
        return {"patterns": [], "error": str(e)}


async def upload_document(
    tenant_id: str,
    content: str,
    title: str,
    category: str
) -> Dict[str, Any]:
    """Processa e indexa documento."""
    try:
        from app.rag.document_processor import DocumentProcessor
        from app.rag.ads_knowledge import get_ads_knowledge_service
        
        processor = DocumentProcessor()
        service = get_ads_knowledge_service()
        
        # Divide em chunks
        chunks = processor.chunk_text(content)
        
        uploaded_ids = []
        for i, chunk in enumerate(chunks):
            chunk_title = f"{title} - Parte {i+1}"
            
            knowledge_id = await service.add_knowledge(
                tenant_id=tenant_id,
                title=chunk_title,
                content=chunk,
                category=category,
                tags=["uploaded", category],
                metadata={
                    "original_title": title,
                    "chunk_index": i,
                    "total_chunks": len(chunks)
                }
            )
            
            if knowledge_id:
                uploaded_ids.append(knowledge_id)
        
        return {
            "success": True,
            "tenant_id": tenant_id,
            "title": title,
            "category": category,
            "chunks_created": len(uploaded_ids),
            "knowledge_ids": uploaded_ids
        }
        
    except Exception as e:
        logger.error("Error uploading document", error=str(e))
        return {"success": False, "error": str(e)}


async def add_knowledge(
    tenant_id: str,
    title: str,
    content: str,
    category: str,
    tags: List[str] = None
) -> Dict[str, Any]:
    """Adiciona conhecimento manualmente."""
    try:
        from app.rag.ads_knowledge import get_ads_knowledge_service
        
        service = get_ads_knowledge_service()
        
        knowledge_id = await service.add_knowledge(
            tenant_id=tenant_id,
            title=title,
            content=content,
            category=category,
            tags=tags or [],
            source="manual"
        )
        
        return {
            "success": True,
            "knowledge_id": knowledge_id,
            "tenant_id": tenant_id,
            "title": title,
            "category": category
        }
        
    except Exception as e:
        logger.error("Error adding knowledge", error=str(e))
        return {"success": False, "error": str(e)}


async def get_knowledge_stats(tenant_id: str) -> Dict[str, Any]:
    """Retorna estatísticas da base de conhecimento."""
    try:
        from app.rag.ads_knowledge import get_ads_knowledge_service
        
        service = get_ads_knowledge_service()
        stats = await service.get_stats(tenant_id)
        
        return {
            "tenant_id": tenant_id,
            "stats": stats,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error("Error getting knowledge stats", error=str(e))
        return {"stats": {}, "error": str(e)}


async def invalidate_knowledge(
    knowledge_id: str,
    tenant_id: str,
    reason: str = None
) -> Dict[str, Any]:
    """Invalida um item de conhecimento."""
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
            await conn.execute(text("""
                UPDATE knowledge_base 
                SET is_active = false, updated_at = NOW()
                WHERE id = :id AND tenant_id = :tenant_id
            """), {"id": knowledge_id, "tenant_id": tenant_id})
            
            await conn.commit()
        
        await engine.dispose()
        
        logger.info("Knowledge invalidated",
            knowledge_id=knowledge_id,
            reason=reason
        )
        
        return {
            "success": True,
            "knowledge_id": knowledge_id,
            "reason": reason
        }
        
    except Exception as e:
        logger.error("Error invalidating knowledge", error=str(e))
        return {"success": False, "error": str(e)}


async def get_context_for_prompt(
    query: str,
    tenant_id: str,
    max_tokens: int = 2000
) -> Dict[str, Any]:
    """Monta contexto RAG para prompts."""
    try:
        # Busca conhecimento relevante
        results = await search_knowledge(
            query=query,
            tenant_id=tenant_id,
            top_k=10
        )
        
        # Monta contexto formatado
        context_parts = []
        total_chars = 0
        max_chars = max_tokens * 4  # Aproximação grosseira
        
        for result in results.get("results", []):
            content = result.get("content", "")
            title = result.get("title", "")
            
            part = f"### {title}\n{content}\n"
            
            if total_chars + len(part) > max_chars:
                break
            
            context_parts.append(part)
            total_chars += len(part)
        
        context_string = "\n".join(context_parts)
        
        return {
            "query": query,
            "context": context_string,
            "sources_used": len(context_parts),
            "estimated_tokens": total_chars // 4
        }
        
    except Exception as e:
        logger.error("Error getting context for prompt", error=str(e))
        return {"context": "", "error": str(e)}


async def learn_from_campaigns(tenant_id: str, min_roas: float = 1.5) -> Dict[str, Any]:
    """Aprende padrões de campanhas de sucesso."""
    try:
        from app.learning.ads_learning_service import AdsLearningService
        from app.rag.ads_knowledge import get_ads_knowledge_service
        
        learning = AdsLearningService()
        knowledge = get_ads_knowledge_service()
        
        # Analisa campanhas
        patterns = await learning.analyze_winning_campaigns(tenant_id, min_roas)
        
        # Salva padrões na base de conhecimento
        saved_patterns = []
        
        for pattern in patterns.get("patterns", []):
            knowledge_id = await knowledge.add_knowledge(
                tenant_id=tenant_id,
                title=f"Padrão: {pattern.get('name', 'Sem nome')}",
                content=pattern.get("description", ""),
                category="patterns",
                tags=["auto_learned", "campaign_pattern"],
                metadata=pattern,
                source="auto_learning"
            )
            
            if knowledge_id:
                saved_patterns.append({
                    "knowledge_id": knowledge_id,
                    "pattern_name": pattern.get("name")
                })
        
        return {
            "tenant_id": tenant_id,
            "min_roas": min_roas,
            "patterns_found": len(patterns.get("patterns", [])),
            "patterns_saved": len(saved_patterns),
            "saved_patterns": saved_patterns
        }
        
    except Exception as e:
        logger.error("Error learning from campaigns", error=str(e))
        return {"patterns_found": 0, "error": str(e)}

