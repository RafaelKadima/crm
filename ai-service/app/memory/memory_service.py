"""
Serviço de Memória - Curto e Longo Prazo
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import json
import structlog

from app.config import get_settings
from app.models.schemas import (
    Message, ShortTermMemory, LongTermMemory,
    LeadInfo, MessageDirection, SenderType
)
from app.rag.vector_store import vector_store

logger = structlog.get_logger()
settings = get_settings()


class MemoryService:
    """
    Gerencia memória de curto e longo prazo dos agentes.
    
    - Curto prazo: últimas N mensagens, armazenadas no PostgreSQL
    - Longo prazo: embeddings de contexto consolidado no Supabase
    """
    
    def __init__(self):
        self._db_engine = None
    
    async def get_db_engine(self):
        """Lazy loading do engine de banco"""
        if self._db_engine is None:
            from sqlalchemy.ext.asyncio import create_async_engine
            self._db_engine = create_async_engine(settings.database_url)
        return self._db_engine
    
    # ==================== SHORT-TERM MEMORY ====================
    
    async def get_short_term_memory(
        self,
        lead_id: str,
        limit: int = None
    ) -> ShortTermMemory:
        """
        Recupera memória de curto prazo do lead.
        Inclui últimas mensagens e contexto recente.
        """
        limit = limit or settings.short_term_memory_limit
        
        try:
            engine = await self.get_db_engine()
            from sqlalchemy import text
            
            async with engine.connect() as conn:
                # Busca últimas mensagens
                result = await conn.execute(text("""
                    SELECT 
                        tm.id,
                        tm.message as content,
                        tm.direction,
                        tm.sender_type,
                        tm.created_at,
                        tm.metadata
                    FROM ticket_messages tm
                    JOIN tickets t ON t.id = tm.ticket_id
                    WHERE t.lead_id = :lead_id
                    ORDER BY tm.created_at DESC
                    LIMIT :limit
                """), {'lead_id': lead_id, 'limit': limit})
                
                messages = []
                for row in result:
                    messages.append(Message(
                        id=str(row.id),
                        content=row.content or '',
                        direction=MessageDirection(row.direction),
                        sender_type=SenderType(row.sender_type),
                        created_at=row.created_at,
                        metadata=row.metadata
                    ))
                
                # Inverte para ordem cronológica
                messages.reverse()
                
                # Busca último contexto salvo
                context_result = await conn.execute(text("""
                    SELECT 
                        last_intent,
                        last_action,
                        context_summary,
                        updated_at
                    FROM lead_agent_context
                    WHERE lead_id = :lead_id
                    ORDER BY updated_at DESC
                    LIMIT 1
                """), {'lead_id': lead_id})
                
                context_row = context_result.fetchone()
                
                return ShortTermMemory(
                    lead_id=lead_id,
                    messages=messages,
                    last_intent=context_row.last_intent if context_row else None,
                    last_action=context_row.last_action if context_row else None,
                    context_summary=context_row.context_summary if context_row else None,
                    updated_at=context_row.updated_at if context_row else datetime.now()
                )
                
        except Exception as e:
            logger.error("get_short_term_memory_error", error=str(e), lead_id=lead_id)
            return ShortTermMemory(
                lead_id=lead_id,
                messages=[],
                updated_at=datetime.now()
            )
    
    async def save_short_term_context(
        self,
        lead_id: str,
        intent: str,
        action: str,
        summary: str
    ) -> bool:
        """Salva contexto de curto prazo"""
        try:
            engine = await self.get_db_engine()
            from sqlalchemy import text
            import uuid
            
            async with engine.begin() as conn:
                await conn.execute(text("""
                    INSERT INTO lead_agent_context (id, lead_id, last_intent, last_action, context_summary, created_at, updated_at)
                    VALUES (:id, :lead_id, :intent, :action, :summary, NOW(), NOW())
                    ON CONFLICT (lead_id) DO UPDATE SET
                        last_intent = :intent,
                        last_action = :action,
                        context_summary = :summary,
                        updated_at = NOW()
                """), {
                    'id': str(uuid.uuid4()),
                    'lead_id': lead_id,
                    'intent': intent,
                    'action': action,
                    'summary': summary
                })
            
            return True
            
        except Exception as e:
            logger.error("save_short_term_context_error", error=str(e))
            return False
    
    # ==================== LONG-TERM MEMORY ====================
    
    async def get_long_term_memory(
        self,
        lead_id: str,
        tenant_id: str,
        query: Optional[str] = None
    ) -> LongTermMemory:
        """
        Recupera memória de longo prazo do lead.
        Usa busca vetorial para encontrar contextos relevantes.
        """
        try:
            engine = await self.get_db_engine()
            from sqlalchemy import text
            
            async with engine.connect() as conn:
                # Busca perfil consolidado do lead
                result = await conn.execute(text("""
                    SELECT 
                        behavior_patterns,
                        preferences,
                        purchase_history,
                        interaction_style,
                        key_insights
                    FROM lead_long_term_memory
                    WHERE lead_id = :lead_id
                """), {'lead_id': lead_id})
                
                row = result.fetchone()
                
                memory = LongTermMemory(
                    lead_id=lead_id,
                    behavior_patterns=row.behavior_patterns if row else [],
                    preferences=row.preferences if row else {},
                    purchase_history=row.purchase_history if row else [],
                    interaction_style=row.interaction_style if row else "unknown",
                    key_insights=row.key_insights if row else []
                )
                
                # Se tem query, busca contextos relevantes via RAG
                if query and vector_store.supabase:
                    rag_result = await vector_store.search_knowledge(
                        query=f"lead:{lead_id} {query}",
                        tenant_id=tenant_id,
                        agent_id="",  # busca geral
                        top_k=5,
                        source_filter=["lead_memory"]
                    )
                    
                    memory.embedding_ids = [c.id for c in rag_result.chunks]
                
                return memory
                
        except Exception as e:
            logger.error("get_long_term_memory_error", error=str(e), lead_id=lead_id)
            return LongTermMemory(lead_id=lead_id)
    
    async def save_long_term_memory(
        self,
        lead_id: str,
        tenant_id: str,
        memory: LongTermMemory
    ) -> bool:
        """Salva memória de longo prazo"""
        try:
            engine = await self.get_db_engine()
            from sqlalchemy import text
            
            async with engine.begin() as conn:
                await conn.execute(text("""
                    INSERT INTO lead_long_term_memory (
                        lead_id, tenant_id, behavior_patterns, preferences,
                        purchase_history, interaction_style, key_insights, updated_at
                    )
                    VALUES (
                        :lead_id, :tenant_id, :behavior_patterns, :preferences,
                        :purchase_history, :interaction_style, :key_insights, NOW()
                    )
                    ON CONFLICT (lead_id) DO UPDATE SET
                        behavior_patterns = :behavior_patterns,
                        preferences = :preferences,
                        purchase_history = :purchase_history,
                        interaction_style = :interaction_style,
                        key_insights = :key_insights,
                        updated_at = NOW()
                """), {
                    'lead_id': lead_id,
                    'tenant_id': tenant_id,
                    'behavior_patterns': json.dumps(memory.behavior_patterns),
                    'preferences': json.dumps(memory.preferences),
                    'purchase_history': json.dumps(memory.purchase_history),
                    'interaction_style': memory.interaction_style,
                    'key_insights': json.dumps(memory.key_insights)
                })
            
            return True
            
        except Exception as e:
            logger.error("save_long_term_memory_error", error=str(e))
            return False
    
    async def add_insight_to_memory(
        self,
        lead_id: str,
        tenant_id: str,
        insight: str,
        category: str = "general"
    ) -> bool:
        """Adiciona insight à memória de longo prazo"""
        try:
            # Salva como embedding para busca futura
            await vector_store.add_knowledge(
                content=f"[Lead Insight - {category}] {insight}",
                tenant_id=tenant_id,
                agent_id="",
                source="lead_memory",
                metadata={
                    "lead_id": lead_id,
                    "category": category,
                    "created_at": datetime.now().isoformat()
                }
            )
            
            # Atualiza lista de insights
            memory = await self.get_long_term_memory(lead_id, tenant_id)
            memory.key_insights.append(insight)
            
            # Limita a 50 insights mais recentes
            if len(memory.key_insights) > 50:
                memory.key_insights = memory.key_insights[-50:]
            
            await self.save_long_term_memory(lead_id, tenant_id, memory)
            
            return True
            
        except Exception as e:
            logger.error("add_insight_error", error=str(e))
            return False
    
    # ==================== CONTEXT BUILDING ====================
    
    def build_context_for_agent(
        self,
        short_term: ShortTermMemory,
        long_term: LongTermMemory,
        rag_chunks: List[Any],
        lead: LeadInfo
    ) -> str:
        """
        Monta o contexto completo para o agente.
        """
        context_parts = []
        
        # 1. Informações do lead
        context_parts.append(f"""## Informações do Lead
Nome: {lead.name}
Telefone: {lead.phone}
Email: {lead.email or 'Não informado'}
Estágio atual: {lead.stage_name or 'Novo Lead'}
Valor potencial: R$ {lead.value or 0:.2f}
""")
        
        # 2. Histórico recente (memória curta)
        if short_term.messages:
            context_parts.append("## Histórico Recente da Conversa")
            for msg in short_term.messages[-10:]:  # últimas 10
                sender = "Lead" if msg.sender_type == SenderType.CONTACT else "Agente"
                context_parts.append(f"{sender}: {msg.content}")
        
        # 3. Contexto anterior
        if short_term.context_summary:
            context_parts.append(f"\n## Resumo do Contexto Anterior\n{short_term.context_summary}")
        
        if short_term.last_intent:
            context_parts.append(f"Última intenção detectada: {short_term.last_intent}")
        
        # 4. Memória de longo prazo
        if long_term.key_insights:
            context_parts.append("\n## Insights sobre este Lead")
            for insight in long_term.key_insights[-5:]:  # últimos 5
                context_parts.append(f"- {insight}")
        
        if long_term.preferences:
            context_parts.append(f"\nPreferências conhecidas: {json.dumps(long_term.preferences, ensure_ascii=False)}")
        
        if long_term.interaction_style != "unknown":
            context_parts.append(f"Estilo de interação: {long_term.interaction_style}")
        
        # 5. Conhecimento relevante (RAG)
        if rag_chunks:
            context_parts.append("\n## Conhecimento Relevante da Base")
            for chunk in rag_chunks[:5]:
                context_parts.append(f"[{chunk.source}] {chunk.content}")
        
        return "\n".join(context_parts)


# Singleton
memory_service = MemoryService()

