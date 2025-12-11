"""
Router para o Agente Orquestrador de Ads.

Endpoints para interagir com o agente via chat ou
comandos estruturados.
"""

import structlog
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

from fastapi import APIRouter, HTTPException

from app.agents import get_orchestrator_agent

logger = structlog.get_logger()
router = APIRouter(prefix="/orchestrator", tags=["Orchestrator Agent"])


# =============================================================================
# SCHEMAS
# =============================================================================

class ExecuteCommandRequest(BaseModel):
    """Request para executar comando do agente."""
    command: str = Field(..., description="Comando em linguagem natural")
    tenant_id: str = Field(..., description="ID do tenant")
    ad_account_id: Optional[str] = Field(None, description="ID da conta de anúncios")
    context: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Contexto adicional")


class ExecuteCommandResponse(BaseModel):
    """Response da execução do comando."""
    success: bool
    output: str
    steps: List[Dict[str, Any]]
    num_steps: int
    error: Optional[str] = None


class CreateCampaignRequest(BaseModel):
    """Request para criar campanha via agente."""
    tenant_id: str = Field(..., description="ID do tenant")
    ad_account_id: str = Field(..., description="ID da conta de anúncios")
    campaign_name: str = Field(..., description="Nome da campanha")
    objective: str = Field(default="OUTCOME_SALES", description="Objetivo da campanha")
    daily_budget: float = Field(default=50.0, ge=10.0, description="Orçamento diário em reais")
    creative_id: Optional[str] = Field(None, description="ID do criativo a usar")
    copy_id: Optional[str] = Field(None, description="ID da copy a usar")
    targeting: Optional[Dict[str, Any]] = Field(None, description="Segmentação personalizada")


class ChatMessage(BaseModel):
    """Mensagem de chat."""
    role: str  # user ou assistant
    content: str


class ChatRequest(BaseModel):
    """Request para chat com o agente."""
    message: str = Field(..., description="Mensagem do usuário")
    tenant_id: str = Field(..., description="ID do tenant")
    ad_account_id: Optional[str] = Field(None, description="ID da conta de anúncios")
    history: Optional[List[ChatMessage]] = Field(default_factory=list, description="Histórico do chat")


class ChatResponse(BaseModel):
    """Response do chat."""
    success: bool
    message: str
    steps: List[Dict[str, Any]]
    suggestions: List[str] = Field(default_factory=list)


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.post("/execute", response_model=ExecuteCommandResponse)
async def execute_command(request: ExecuteCommandRequest):
    """
    Executa um comando em linguagem natural no agente.
    
    O agente interpretará o comando e executará as tools necessárias
    para completar a tarefa.
    
    Exemplos de comandos:
    - "Liste os criativos disponíveis"
    - "Crie uma campanha de conversão com orçamento de R$50/dia"
    - "Qual o status da campanha X?"
    """
    logger.info(
        "Executing orchestrator command",
        command=request.command[:100],
        tenant_id=request.tenant_id
    )
    
    try:
        agent = get_orchestrator_agent()
        
        context = {
            "tenant_id": request.tenant_id,
            "ad_account_id": request.ad_account_id,
            **(request.context or {})
        }
        
        result = await agent.run(request.command, context)
        
        return ExecuteCommandResponse(
            success=result.get("success", False),
            output=result.get("output", ""),
            steps=result.get("steps", []),
            num_steps=result.get("num_steps", 0),
            error=result.get("error")
        )
        
    except Exception as e:
        logger.error("Orchestrator execution failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/create-campaign")
async def create_campaign(request: CreateCampaignRequest):
    """
    Cria uma campanha completa via agente.
    
    O agente irá:
    1. Verificar configurações do tenant
    2. Validar criativo e copy
    3. Criar campanha no Meta
    4. Criar adset
    5. Criar anúncio
    6. Salvar no banco de dados
    """
    logger.info(
        "Creating campaign via orchestrator",
        campaign_name=request.campaign_name,
        tenant_id=request.tenant_id
    )
    
    try:
        agent = get_orchestrator_agent()
        
        briefing = {
            "campaign_name": request.campaign_name,
            "objective": request.objective,
            "daily_budget": request.daily_budget,
            "creative_id": request.creative_id,
            "copy_id": request.copy_id,
            "targeting": request.targeting,
        }
        
        context = {
            "tenant_id": request.tenant_id,
            "ad_account_id": request.ad_account_id,
        }
        
        result = await agent.create_campaign_from_briefing(briefing, context)
        
        return {
            "success": result.get("success", False),
            "output": result.get("output", ""),
            "steps": result.get("steps", []),
            "campaign": result.get("campaign"),
        }
        
    except Exception as e:
        logger.error("Campaign creation failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat", response_model=ChatResponse)
async def chat_with_agent(request: ChatRequest):
    """
    Interface de chat com o agente.
    
    Permite conversação natural onde o agente pode:
    - Responder perguntas sobre campanhas
    - Executar ações solicitadas
    - Sugerir próximos passos
    """
    logger.info(
        "Chat with orchestrator",
        message=request.message[:100],
        tenant_id=request.tenant_id
    )
    
    try:
        agent = get_orchestrator_agent()
        
        context = {
            "tenant_id": request.tenant_id,
            "ad_account_id": request.ad_account_id,
        }
        
        result = await agent.run(request.message, context)
        
        # Gera sugestões baseadas no contexto
        suggestions = _generate_suggestions(request.message, result)
        
        return ChatResponse(
            success=result.get("success", False),
            message=result.get("output", ""),
            steps=result.get("steps", []),
            suggestions=suggestions
        )
        
    except Exception as e:
        logger.error("Chat failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/clear-history")
async def clear_chat_history(tenant_id: str):
    """Limpa o histórico de chat de um tenant."""
    try:
        agent = get_orchestrator_agent()
        agent.clear_history(tenant_id)
        
        return {"success": True, "message": "Histórico limpo com sucesso"}
        
    except Exception as e:
        logger.error("Failed to clear history", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """Verifica se o agente está funcionando."""
    try:
        agent = get_orchestrator_agent()
        return {
            "status": "healthy",
            "num_tools": len(agent.tools),
            "tools": [t.name for t in agent.tools]
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }


# =============================================================================
# HELPERS
# =============================================================================

def _generate_suggestions(message: str, result: Dict) -> List[str]:
    """Gera sugestões de próximos passos baseado no contexto."""
    suggestions = []
    
    message_lower = message.lower()
    output = result.get("output", "").lower()
    
    # Se listou criativos, sugere criar campanha
    if "criativo" in output or "creative" in output:
        suggestions.append("Criar campanha com um dos criativos")
        suggestions.append("Ver detalhes de um criativo específico")
    
    # Se criou campanha, sugere próximos passos
    if "campanha criada" in output or "campaign created" in output:
        suggestions.append("Ver status da campanha")
        suggestions.append("Ativar a campanha")
        suggestions.append("Criar mais anúncios")
    
    # Se perguntou sobre status, sugere ações
    if "status" in message_lower:
        suggestions.append("Pausar campanha")
        suggestions.append("Aumentar orçamento")
        suggestions.append("Ver métricas detalhadas")
    
    # Sugestões padrão se nenhuma específica
    if not suggestions:
        suggestions = [
            "Listar criativos disponíveis",
            "Listar copies aprovadas",
            "Ver configurações da conta",
        ]
    
    return suggestions[:3]  # Máximo 3 sugestões

