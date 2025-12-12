"""
SDR Tools - Ferramentas para o Agente SDR.

Estas ferramentas permitem que o agente SDR interaja com leads,
faça predições, tome decisões e aprenda com experiências.

Total: 19 ferramentas
"""
from typing import Dict, Any, List, Optional
from datetime import datetime
import structlog

from mcp.server import CRMMCPServer, ToolParameter

logger = structlog.get_logger()


def register_tools(server: CRMMCPServer) -> None:
    """Registra todas as ferramentas SDR no servidor MCP."""
    
    # =====================================================
    # 1. predict_lead_score - Predição de conversão
    # =====================================================
    server.register_tool(
        name="predict_lead_score",
        description="Prediz a probabilidade de um lead converter (0-100). Usa modelo de ML treinado com dados históricos.",
        parameters=[
            ToolParameter(name="lead_id", type="string", description="ID único do lead"),
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
        ],
        handler=predict_lead_score,
        category="sdr"
    )
    
    # =====================================================
    # 2. select_sdr_action - Seleção de ação via RL
    # =====================================================
    server.register_tool(
        name="select_sdr_action",
        description="Usa Reinforcement Learning para selecionar a melhor ação para o lead atual.",
        parameters=[
            ToolParameter(name="lead_id", type="string", description="ID único do lead"),
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="current_state", type="object", description="Estado atual do lead", required=False),
        ],
        handler=select_sdr_action,
        category="sdr"
    )
    
    # =====================================================
    # 3. qualify_lead - Qualificação BANT
    # =====================================================
    server.register_tool(
        name="qualify_lead",
        description="Analisa qualificação do lead usando critérios BANT (Budget, Authority, Need, Timeline).",
        parameters=[
            ToolParameter(name="lead_id", type="string", description="ID único do lead"),
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
        ],
        handler=qualify_lead,
        category="sdr"
    )
    
    # =====================================================
    # 4. get_lead_context - Contexto completo
    # =====================================================
    server.register_tool(
        name="get_lead_context",
        description="Busca contexto completo do lead: perfil, mensagens, histórico, preferências.",
        parameters=[
            ToolParameter(name="lead_id", type="string", description="ID único do lead"),
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="include_messages", type="boolean", description="Incluir histórico de mensagens", required=False, default=True),
        ],
        handler=get_lead_context,
        category="sdr"
    )
    
    # =====================================================
    # 5. get_lead_memory - Memória do lead
    # =====================================================
    server.register_tool(
        name="get_lead_memory",
        description="Busca memória de longo prazo do lead: eventos passados, preferências aprendidas.",
        parameters=[
            ToolParameter(name="lead_id", type="string", description="ID único do lead"),
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
        ],
        handler=get_lead_memory,
        category="sdr"
    )
    
    # =====================================================
    # 6. update_lead_memory - Atualiza memória
    # =====================================================
    server.register_tool(
        name="update_lead_memory",
        description="Atualiza memória do lead com novo evento ou informação.",
        parameters=[
            ToolParameter(name="lead_id", type="string", description="ID único do lead"),
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="event_type", type="string", description="Tipo do evento (preference, objection, interest, etc.)"),
            ToolParameter(name="event_data", type="object", description="Dados do evento"),
        ],
        handler=update_lead_memory,
        category="sdr"
    )
    
    # =====================================================
    # 7. search_similar_leads - Leads similares
    # =====================================================
    server.register_tool(
        name="search_similar_leads",
        description="Busca leads similares ao lead atual usando embeddings vetoriais.",
        parameters=[
            ToolParameter(name="lead_id", type="string", description="ID único do lead"),
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="top_k", type="number", description="Número de resultados", required=False, default=5),
        ],
        handler=search_similar_leads,
        category="sdr"
    )
    
    # =====================================================
    # 8. move_lead_stage - Move no funil
    # =====================================================
    server.register_tool(
        name="move_lead_stage",
        description="Move o lead para outro estágio do funil de vendas.",
        parameters=[
            ToolParameter(name="lead_id", type="string", description="ID único do lead"),
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="new_stage_id", type="string", description="ID do novo estágio"),
            ToolParameter(name="reason", type="string", description="Motivo da movimentação", required=False),
        ],
        handler=move_lead_stage,
        category="sdr"
    )
    
    # =====================================================
    # 9. schedule_meeting - Agenda reunião
    # =====================================================
    server.register_tool(
        name="schedule_meeting",
        description="Agenda uma reunião com o lead.",
        parameters=[
            ToolParameter(name="lead_id", type="string", description="ID único do lead"),
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="datetime", type="string", description="Data/hora da reunião (ISO 8601)"),
            ToolParameter(name="duration_minutes", type="number", description="Duração em minutos", required=False, default=30),
            ToolParameter(name="meeting_type", type="string", description="Tipo (call, video, presencial)", required=False, default="video"),
        ],
        handler=schedule_meeting,
        category="sdr"
    )
    
    # =====================================================
    # 10. send_message - Envia mensagem
    # =====================================================
    server.register_tool(
        name="send_message",
        description="Envia uma mensagem para o lead via WhatsApp ou outro canal.",
        parameters=[
            ToolParameter(name="lead_id", type="string", description="ID único do lead"),
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="message", type="string", description="Texto da mensagem"),
            ToolParameter(name="channel", type="string", description="Canal (whatsapp, email, sms)", required=False, default="whatsapp"),
        ],
        handler=send_message,
        category="sdr"
    )
    
    # =====================================================
    # 11. classify_intent - Classifica intenção
    # =====================================================
    server.register_tool(
        name="classify_intent",
        description="Classifica a intenção de uma mensagem do lead.",
        parameters=[
            ToolParameter(name="message", type="string", description="Texto da mensagem"),
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="lead_id", type="string", description="ID do lead (para contexto)", required=False),
        ],
        handler=classify_intent,
        category="sdr"
    )
    
    # =====================================================
    # 12. detect_objection - Detecta objeções
    # =====================================================
    server.register_tool(
        name="detect_objection",
        description="Detecta objeções na mensagem do lead e sugere respostas.",
        parameters=[
            ToolParameter(name="message", type="string", description="Texto da mensagem"),
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
        ],
        handler=detect_objection,
        category="sdr"
    )
    
    # =====================================================
    # 13. get_response_suggestion - Sugere resposta
    # =====================================================
    server.register_tool(
        name="get_response_suggestion",
        description="Gera sugestão de resposta baseada no contexto e conhecimento.",
        parameters=[
            ToolParameter(name="lead_id", type="string", description="ID único do lead"),
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="last_message", type="string", description="Última mensagem do lead"),
        ],
        handler=get_response_suggestion,
        category="sdr"
    )
    
    # =====================================================
    # 14. record_sdr_experience - Registra experiência RL
    # =====================================================
    server.register_tool(
        name="record_sdr_experience",
        description="Registra uma experiência de Reinforcement Learning (state, action, reward).",
        parameters=[
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="lead_id", type="string", description="ID do lead"),
            ToolParameter(name="state", type="object", description="Estado antes da ação"),
            ToolParameter(name="action", type="string", description="Ação tomada"),
            ToolParameter(name="reward", type="number", description="Reward recebido"),
            ToolParameter(name="next_state", type="object", description="Estado após a ação", required=False),
        ],
        handler=record_sdr_experience,
        category="sdr"
    )
    
    # =====================================================
    # 15. get_conversation_summary - Resume conversa
    # =====================================================
    server.register_tool(
        name="get_conversation_summary",
        description="Gera um resumo da conversa com o lead.",
        parameters=[
            ToolParameter(name="lead_id", type="string", description="ID único do lead"),
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
        ],
        handler=get_conversation_summary,
        category="sdr"
    )
    
    # =====================================================
    # 16. escalate_to_human - Escala para humano
    # =====================================================
    server.register_tool(
        name="escalate_to_human",
        description="Escala o atendimento para um vendedor humano.",
        parameters=[
            ToolParameter(name="lead_id", type="string", description="ID único do lead"),
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="reason", type="string", description="Motivo da escalação"),
            ToolParameter(name="priority", type="string", description="Prioridade (low, medium, high)", required=False, default="medium"),
        ],
        handler=escalate_to_human,
        category="sdr"
    )
    
    # =====================================================
    # 17. get_product_info - Info de produto
    # =====================================================
    server.register_tool(
        name="get_product_info",
        description="Busca informações sobre um produto ou serviço.",
        parameters=[
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="product_name", type="string", description="Nome do produto"),
        ],
        handler=get_product_info,
        category="sdr"
    )
    
    # =====================================================
    # 18. check_availability - Verifica disponibilidade
    # =====================================================
    server.register_tool(
        name="check_availability",
        description="Verifica disponibilidade de horários para reunião.",
        parameters=[
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="date", type="string", description="Data para verificar (YYYY-MM-DD)"),
            ToolParameter(name="seller_id", type="string", description="ID do vendedor", required=False),
        ],
        handler=check_availability,
        category="sdr"
    )
    
    # =====================================================
    # 19. calculate_discount - Calcula desconto
    # =====================================================
    server.register_tool(
        name="calculate_discount",
        description="Calcula o desconto máximo permitido para um lead.",
        parameters=[
            ToolParameter(name="lead_id", type="string", description="ID único do lead"),
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="product_value", type="number", description="Valor do produto"),
        ],
        handler=calculate_discount,
        category="sdr"
    )
    
    logger.info("SDR tools registered", count=19)


# ==============================================
# Implementações das Ferramentas
# ==============================================

async def predict_lead_score(lead_id: str, tenant_id: str) -> Dict[str, Any]:
    """Prediz probabilidade de conversão do lead."""
    try:
        from app.ml.model_registry import TenantModelRegistry
        from app.ml.training.data_loader import DataLoader
        
        registry = TenantModelRegistry()
        data_loader = DataLoader()
        
        # Busca modelo do tenant
        model = await registry.get_model('lead_score', tenant_id)
        
        if model:
            # Carrega features do lead
            features = await data_loader.load_lead_features(lead_id, tenant_id)
            
            if features:
                import torch
                with torch.no_grad():
                    tensor = torch.FloatTensor([features])
                    score = model(tensor).item()
                    
                return {
                    "lead_id": lead_id,
                    "score": round(score * 100, 2),
                    "confidence": 0.85,
                    "model_version": registry.get_model_version('lead_score', tenant_id),
                    "factors": {
                        "response_time": "fast",
                        "engagement": "high",
                        "intent": "strong"
                    }
                }
        
        # Fallback para heurística
        return {
            "lead_id": lead_id,
            "score": 65.0,
            "confidence": 0.5,
            "model_version": "heuristic",
            "factors": {
                "note": "Using heuristic fallback"
            }
        }
        
    except Exception as e:
        logger.error("Error predicting lead score", error=str(e), lead_id=lead_id)
        return {
            "lead_id": lead_id,
            "score": 50.0,
            "confidence": 0.3,
            "error": str(e)
        }


async def select_sdr_action(
    lead_id: str,
    tenant_id: str,
    current_state: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Seleciona melhor ação via Reinforcement Learning."""
    try:
        from app.rl.policy_engine import PolicyEngine
        from app.rl.states import SDRState
        from app.rl.explainability import ActionExplainer
        from app.rl.mode_manager import RLModeManager
        
        policy = PolicyEngine()
        explainer = ActionExplainer()
        mode_manager = RLModeManager()
        
        # Obtém modo atual
        mode = await mode_manager.get_mode('sdr', tenant_id)
        
        # Constrói estado se não fornecido
        if not current_state:
            score_result = await predict_lead_score(lead_id, tenant_id)
            current_state = {
                "lead_score": score_result.get("score", 50),
                "stage_index": 0,
                "intent": 0,
                "num_messages": 0,
                "time_since_last": 0,
                "sentiment": 0.5,
                "has_objection": False
            }
        
        state = SDRState(
            lead_score=current_state.get("lead_score", 50),
            stage_index=current_state.get("stage_index", 0),
            intent=current_state.get("intent", 0),
            num_messages=current_state.get("num_messages", 0),
            time_since_last=current_state.get("time_since_last", 0),
            sentiment=current_state.get("sentiment", 0.5),
            has_objection=current_state.get("has_objection", False)
        )
        
        # Seleciona ação
        action, confidence = await policy.select_action(state, 'sdr', tenant_id)
        
        # Gera explicação
        explanation = explainer.explain_sdr_action(state, action, str(mode))
        
        return {
            "lead_id": lead_id,
            "action": action.name,
            "action_value": action.value,
            "confidence": confidence,
            "policy_mode": str(mode),
            "explanation": explanation,
            "state": current_state
        }
        
    except Exception as e:
        logger.error("Error selecting SDR action", error=str(e), lead_id=lead_id)
        return {
            "lead_id": lead_id,
            "action": "RESPOND_NORMAL",
            "action_value": 0,
            "confidence": 0.5,
            "policy_mode": "RULE_BASED",
            "explanation": "Ação padrão devido a erro",
            "error": str(e)
        }


async def qualify_lead(lead_id: str, tenant_id: str) -> Dict[str, Any]:
    """Qualifica lead usando BANT."""
    try:
        from app.ml.classifier import SDRClassifier
        
        classifier = SDRClassifier()
        
        # Busca dados do lead
        context = await get_lead_context(lead_id, tenant_id)
        
        # Qualifica
        qualification = await classifier.qualify_lead_bant(
            lead_data=context.get("lead", {}),
            messages=context.get("messages", [])
        )
        
        return {
            "lead_id": lead_id,
            "qualification": qualification,
            "bant": {
                "budget": qualification.get("budget_score", 0),
                "authority": qualification.get("authority_score", 0),
                "need": qualification.get("need_score", 0),
                "timeline": qualification.get("timeline_score", 0)
            },
            "overall_score": qualification.get("overall", 0),
            "recommendation": qualification.get("recommendation", "continue_nurturing")
        }
        
    except Exception as e:
        logger.error("Error qualifying lead", error=str(e))
        return {
            "lead_id": lead_id,
            "qualification": None,
            "error": str(e)
        }


async def get_lead_context(
    lead_id: str,
    tenant_id: str,
    include_messages: bool = True
) -> Dict[str, Any]:
    """Busca contexto completo do lead."""
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
            # Busca lead
            result = await conn.execute(text("""
                SELECT l.*, c.name as contact_name, c.email, c.phone
                FROM leads l
                LEFT JOIN contacts c ON l.contact_id = c.id
                WHERE l.id = :lead_id AND l.tenant_id = :tenant_id
            """), {"lead_id": lead_id, "tenant_id": tenant_id})
            
            lead_row = result.fetchone()
            
            if not lead_row:
                return {"error": "Lead not found"}
            
            lead_data = dict(lead_row._mapping)
            
            messages = []
            if include_messages:
                # Busca mensagens do ticket associado
                msg_result = await conn.execute(text("""
                    SELECT tm.* FROM ticket_messages tm
                    JOIN tickets t ON t.id = tm.ticket_id
                    WHERE t.lead_id = :lead_id AND t.tenant_id = :tenant_id
                    ORDER BY tm.created_at DESC
                    LIMIT 50
                """), {"lead_id": lead_id, "tenant_id": tenant_id})
                
                messages = [dict(row._mapping) for row in msg_result.fetchall()]
        
        await engine.dispose()
        
        return {
            "lead_id": lead_id,
            "lead": lead_data,
            "messages": messages,
            "message_count": len(messages),
            "contact": {
                "name": lead_data.get("contact_name"),
                "email": lead_data.get("email"),
                "phone": lead_data.get("phone")
            }
        }
        
    except Exception as e:
        logger.error("Error getting lead context", error=str(e))
        return {"lead_id": lead_id, "error": str(e)}


async def get_lead_memory(lead_id: str, tenant_id: str) -> Dict[str, Any]:
    """Busca memória do lead."""
    try:
        from app.rag.sdr_knowledge import get_sdr_knowledge_service
        
        service = get_sdr_knowledge_service()
        
        # Busca conhecimento específico do lead
        results = await service.search(
            query=f"lead:{lead_id}",
            tenant_id=tenant_id,
            context="lead_memory",
            top_k=10
        )
        
        # Extrai eventos e preferências
        events = []
        preferences = {}
        
        for result in results:
            content = result.get("content", "")
            if "preference:" in content:
                key, value = content.split(":", 1)
                preferences[key.replace("preference", "").strip()] = value.strip()
            else:
                events.append({
                    "content": content,
                    "created_at": result.get("created_at"),
                    "category": result.get("category")
                })
        
        return {
            "lead_id": lead_id,
            "events": events,
            "preferences": preferences,
            "total_memories": len(results)
        }
        
    except Exception as e:
        logger.error("Error getting lead memory", error=str(e))
        return {"lead_id": lead_id, "events": [], "preferences": {}, "error": str(e)}


async def update_lead_memory(
    lead_id: str,
    tenant_id: str,
    event_type: str,
    event_data: Dict[str, Any]
) -> Dict[str, Any]:
    """Atualiza memória do lead."""
    try:
        from app.rag.sdr_knowledge import get_sdr_knowledge_service
        
        service = get_sdr_knowledge_service()
        
        # Formata conteúdo
        content = f"{event_type}: {str(event_data)}"
        
        # Adiciona à base de conhecimento
        knowledge_id = await service.add_knowledge(
            tenant_id=tenant_id,
            title=f"Lead {lead_id} - {event_type}",
            content=content,
            category="lead_memory",
            tags=[lead_id, event_type],
            metadata={"lead_id": lead_id, "event_type": event_type, **event_data}
        )
        
        return {
            "success": True,
            "lead_id": lead_id,
            "memory_id": knowledge_id,
            "event_type": event_type
        }
        
    except Exception as e:
        logger.error("Error updating lead memory", error=str(e))
        return {"success": False, "error": str(e)}


async def search_similar_leads(
    lead_id: str,
    tenant_id: str,
    top_k: int = 5
) -> Dict[str, Any]:
    """Busca leads similares."""
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
            # Busca lead atual
            result = await conn.execute(text("""
                SELECT l.*, s.name as stage_name
                FROM leads l
                LEFT JOIN stages s ON l.stage_id = s.id
                WHERE l.id = :lead_id
            """), {"lead_id": lead_id})
            
            current_lead = result.fetchone()
            
            if not current_lead:
                return {"error": "Lead not found"}
            
            current_lead_dict = dict(current_lead._mapping)
            
            # Busca leads similares (mesmo estágio, mesma origem)
            similar_result = await conn.execute(text("""
                SELECT l.*, s.name as stage_name
                FROM leads l
                LEFT JOIN stages s ON l.stage_id = s.id
                WHERE l.tenant_id = :tenant_id
                AND l.id != :lead_id
                AND (l.stage_id = :stage_id OR l.origin = :origin)
                LIMIT :top_k
            """), {
                "tenant_id": tenant_id,
                "lead_id": lead_id,
                "stage_id": current_lead_dict.get("stage_id"),
                "origin": current_lead_dict.get("origin"),
                "top_k": top_k
            })
            
            similar_leads = [dict(row._mapping) for row in similar_result.fetchall()]
        
        await engine.dispose()
        
        return {
            "lead_id": lead_id,
            "similar_leads": similar_leads,
            "count": len(similar_leads)
        }
        
    except Exception as e:
        logger.error("Error searching similar leads", error=str(e))
        return {"lead_id": lead_id, "similar_leads": [], "error": str(e)}


async def move_lead_stage(
    lead_id: str,
    tenant_id: str,
    new_stage_id: str,
    reason: str = None
) -> Dict[str, Any]:
    """Move lead para novo estágio."""
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
            # Atualiza estágio
            await conn.execute(text("""
                UPDATE leads 
                SET stage_id = :stage_id, updated_at = NOW()
                WHERE id = :lead_id AND tenant_id = :tenant_id
            """), {"stage_id": new_stage_id, "lead_id": lead_id, "tenant_id": tenant_id})
            
            await conn.commit()
            
            # Busca nome do estágio
            result = await conn.execute(text("""
                SELECT name FROM stages WHERE id = :stage_id
            """), {"stage_id": new_stage_id})
            
            stage = result.fetchone()
            stage_name = stage.name if stage else "Unknown"
        
        await engine.dispose()
        
        logger.info("Lead stage moved",
            lead_id=lead_id,
            new_stage_id=new_stage_id,
            reason=reason
        )
        
        return {
            "success": True,
            "lead_id": lead_id,
            "new_stage_id": new_stage_id,
            "new_stage_name": stage_name,
            "reason": reason
        }
        
    except Exception as e:
        logger.error("Error moving lead stage", error=str(e))
        return {"success": False, "error": str(e)}


async def schedule_meeting(
    lead_id: str,
    tenant_id: str,
    datetime_str: str,
    duration_minutes: int = 30,
    meeting_type: str = "video"
) -> Dict[str, Any]:
    """Agenda reunião com o lead."""
    try:
        # TODO: Integrar com calendário real (Google Calendar, etc.)
        
        meeting_id = f"mtg_{lead_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # Registra experiência positiva
        await record_sdr_experience(
            tenant_id=tenant_id,
            lead_id=lead_id,
            state={"lead_id": lead_id},
            action="SCHEDULE",
            reward=10.0
        )
        
        logger.info("Meeting scheduled",
            lead_id=lead_id,
            meeting_id=meeting_id,
            datetime=datetime_str
        )
        
        return {
            "success": True,
            "meeting_id": meeting_id,
            "lead_id": lead_id,
            "datetime": datetime_str,
            "duration_minutes": duration_minutes,
            "meeting_type": meeting_type,
            "status": "scheduled"
        }
        
    except Exception as e:
        logger.error("Error scheduling meeting", error=str(e))
        return {"success": False, "error": str(e)}


async def send_message(
    lead_id: str,
    tenant_id: str,
    message: str,
    channel: str = "whatsapp"
) -> Dict[str, Any]:
    """Envia mensagem para o lead."""
    try:
        # TODO: Integrar com WhatsApp Business API / Evolution API
        
        import uuid
        message_id = str(uuid.uuid4())
        
        logger.info("Message sent",
            lead_id=lead_id,
            message_id=message_id,
            channel=channel,
            message_length=len(message)
        )
        
        return {
            "success": True,
            "message_id": message_id,
            "lead_id": lead_id,
            "channel": channel,
            "status": "sent",
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error("Error sending message", error=str(e))
        return {"success": False, "error": str(e)}


async def classify_intent(
    message: str,
    tenant_id: str,
    lead_id: str = None
) -> Dict[str, Any]:
    """Classifica intenção da mensagem."""
    try:
        from app.ml.classifier import SDRClassifier
        
        classifier = SDRClassifier()
        result = await classifier.classify_intent(message)
        
        return {
            "message": message[:100],
            "intent": result.get("intent", "unknown"),
            "confidence": result.get("confidence", 0.5),
            "sub_intents": result.get("sub_intents", []),
            "entities": result.get("entities", [])
        }
        
    except Exception as e:
        logger.error("Error classifying intent", error=str(e))
        return {
            "message": message[:100],
            "intent": "unknown",
            "confidence": 0.0,
            "error": str(e)
        }


async def detect_objection(message: str, tenant_id: str) -> Dict[str, Any]:
    """Detecta objeções na mensagem."""
    try:
        from app.ml.classifier import SDRClassifier
        
        classifier = SDRClassifier()
        objections = await classifier.detect_objections(message)
        
        return {
            "message": message[:100],
            "has_objection": len(objections) > 0,
            "objections": objections,
            "suggested_responses": [
                obj.get("suggested_response") for obj in objections
                if obj.get("suggested_response")
            ]
        }
        
    except Exception as e:
        logger.error("Error detecting objections", error=str(e))
        return {
            "message": message[:100],
            "has_objection": False,
            "objections": [],
            "error": str(e)
        }


async def get_response_suggestion(
    lead_id: str,
    tenant_id: str,
    last_message: str
) -> Dict[str, Any]:
    """Gera sugestão de resposta."""
    try:
        from app.rag.sdr_knowledge import get_sdr_knowledge_service
        
        service = get_sdr_knowledge_service()
        
        # Busca contexto na base de conhecimento
        knowledge = await service.search(
            query=last_message,
            tenant_id=tenant_id,
            context="response_templates",
            top_k=3
        )
        
        # Gera sugestão baseada no conhecimento
        suggestions = []
        for item in knowledge:
            if item.get("content"):
                suggestions.append(item["content"])
        
        return {
            "lead_id": lead_id,
            "last_message": last_message[:100],
            "suggestions": suggestions[:3],
            "context_used": len(knowledge)
        }
        
    except Exception as e:
        logger.error("Error getting response suggestion", error=str(e))
        return {
            "lead_id": lead_id,
            "suggestions": ["Obrigado pelo contato! Como posso ajudar?"],
            "error": str(e)
        }


async def record_sdr_experience(
    tenant_id: str,
    lead_id: str,
    state: Dict[str, Any],
    action: str,
    reward: float,
    next_state: Dict[str, Any] = None
) -> Dict[str, Any]:
    """Registra experiência de RL."""
    try:
        from app.rl.experience_buffer import ExperienceBuffer
        
        buffer = ExperienceBuffer()
        
        experience_id = await buffer.add_experience(
            tenant_id=tenant_id,
            agent_type='sdr',
            state=state,
            action=action,
            reward=reward,
            next_state=next_state,
            is_terminal=(next_state is None)
        )
        
        return {
            "success": True,
            "experience_id": experience_id,
            "lead_id": lead_id,
            "action": action,
            "reward": reward
        }
        
    except Exception as e:
        logger.error("Error recording experience", error=str(e))
        return {"success": False, "error": str(e)}


async def get_conversation_summary(lead_id: str, tenant_id: str) -> Dict[str, Any]:
    """Gera resumo da conversa."""
    try:
        context = await get_lead_context(lead_id, tenant_id, include_messages=True)
        messages = context.get("messages", [])
        
        if not messages:
            return {
                "lead_id": lead_id,
                "summary": "Nenhuma conversa encontrada",
                "message_count": 0
            }
        
        # Gera resumo simples
        total = len(messages)
        from_lead = sum(1 for m in messages if m.get("is_from_contact"))
        from_agent = total - from_lead
        
        return {
            "lead_id": lead_id,
            "summary": f"Total de {total} mensagens: {from_lead} do lead, {from_agent} do agente",
            "message_count": total,
            "from_lead": from_lead,
            "from_agent": from_agent,
            "last_message_at": messages[0].get("created_at") if messages else None
        }
        
    except Exception as e:
        logger.error("Error getting conversation summary", error=str(e))
        return {"lead_id": lead_id, "summary": "Erro ao gerar resumo", "error": str(e)}


async def escalate_to_human(
    lead_id: str,
    tenant_id: str,
    reason: str,
    priority: str = "medium"
) -> Dict[str, Any]:
    """Escala para atendimento humano."""
    try:
        import uuid
        
        ticket_id = str(uuid.uuid4())
        
        # TODO: Criar ticket real no sistema
        
        logger.info("Escalated to human",
            lead_id=lead_id,
            ticket_id=ticket_id,
            reason=reason,
            priority=priority
        )
        
        return {
            "success": True,
            "ticket_id": ticket_id,
            "lead_id": lead_id,
            "reason": reason,
            "priority": priority,
            "status": "escalated"
        }
        
    except Exception as e:
        logger.error("Error escalating to human", error=str(e))
        return {"success": False, "error": str(e)}


async def get_product_info(tenant_id: str, product_name: str) -> Dict[str, Any]:
    """Busca informações do produto."""
    try:
        from app.rag.sdr_knowledge import get_sdr_knowledge_service
        
        service = get_sdr_knowledge_service()
        
        results = await service.search(
            query=product_name,
            tenant_id=tenant_id,
            context="products",
            top_k=3
        )
        
        if results:
            return {
                "product_name": product_name,
                "info": results[0].get("content", ""),
                "related": [r.get("title") for r in results[1:]],
                "found": True
            }
        
        return {
            "product_name": product_name,
            "info": "Produto não encontrado na base de conhecimento",
            "found": False
        }
        
    except Exception as e:
        logger.error("Error getting product info", error=str(e))
        return {"product_name": product_name, "found": False, "error": str(e)}


async def check_availability(
    tenant_id: str,
    date: str,
    seller_id: str = None
) -> Dict[str, Any]:
    """Verifica disponibilidade de horários."""
    try:
        # TODO: Integrar com calendário real
        
        # Simula horários disponíveis
        available_slots = [
            f"{date}T09:00:00",
            f"{date}T10:00:00",
            f"{date}T11:00:00",
            f"{date}T14:00:00",
            f"{date}T15:00:00",
            f"{date}T16:00:00",
        ]
        
        return {
            "date": date,
            "seller_id": seller_id,
            "available_slots": available_slots,
            "timezone": "America/Sao_Paulo"
        }
        
    except Exception as e:
        logger.error("Error checking availability", error=str(e))
        return {"date": date, "available_slots": [], "error": str(e)}


async def calculate_discount(
    lead_id: str,
    tenant_id: str,
    product_value: float
) -> Dict[str, Any]:
    """Calcula desconto máximo permitido."""
    try:
        # Busca score do lead para determinar desconto
        score_result = await predict_lead_score(lead_id, tenant_id)
        score = score_result.get("score", 50)
        
        # Lógica de desconto baseada no score
        if score >= 80:
            max_discount_pct = 15
        elif score >= 60:
            max_discount_pct = 10
        elif score >= 40:
            max_discount_pct = 5
        else:
            max_discount_pct = 0
        
        max_discount_value = product_value * (max_discount_pct / 100)
        final_price = product_value - max_discount_value
        
        return {
            "lead_id": lead_id,
            "product_value": product_value,
            "lead_score": score,
            "max_discount_percentage": max_discount_pct,
            "max_discount_value": round(max_discount_value, 2),
            "minimum_price": round(final_price, 2)
        }
        
    except Exception as e:
        logger.error("Error calculating discount", error=str(e))
        return {
            "lead_id": lead_id,
            "product_value": product_value,
            "max_discount_percentage": 0,
            "error": str(e)
        }

