"""
Integração MCP com LLMs (Claude, OpenAI, etc.).

Este módulo implementa a camada de integração entre o MCP Server
e os provedores de LLM, permitindo que o LLM use as ferramentas
registradas para executar ações autônomas.
"""
import json
import asyncio
from typing import Dict, Any, List, Optional, Callable, Awaitable
from dataclasses import dataclass
from enum import Enum
from datetime import datetime
import structlog

from app.config import get_settings

logger = structlog.get_logger()
settings = get_settings()


class LLMProvider(str, Enum):
    """Provedores de LLM suportados."""
    ANTHROPIC = "anthropic"
    OPENAI = "openai"
    LOCAL = "local"


@dataclass
class Message:
    """Representa uma mensagem na conversa."""
    role: str  # user, assistant, tool, system
    content: str
    tool_calls: Optional[List[Dict[str, Any]]] = None
    tool_call_id: Optional[str] = None
    name: Optional[str] = None


@dataclass
class AgentConfig:
    """Configuração do agente."""
    agent_type: str  # sdr, ads
    tenant_id: str
    model: str = "claude-sonnet-4-20250514"
    temperature: float = 0.7
    max_tokens: int = 4096
    max_tool_calls: int = 10


class MCPLLMIntegration:
    """
    Integração entre MCP Server e LLM.
    
    Esta classe permite que um LLM use as ferramentas MCP
    para executar ações autônomas no sistema CRM.
    
    Fluxo:
    1. Recebe mensagem do usuário
    2. Envia para LLM com lista de ferramentas
    3. LLM decide quais ferramentas usar
    4. Executa ferramentas via MCP Server
    5. Retorna resultados para LLM
    6. LLM gera resposta final
    """
    
    def __init__(self, provider: LLMProvider = LLMProvider.ANTHROPIC):
        self.provider = provider
        self._mcp_server = None
        self._anthropic_client = None
        self._openai_client = None
        
        logger.info("MCP-LLM Integration initialized", provider=provider.value)
    
    @property
    def mcp_server(self):
        """Lazy loading do MCP Server."""
        if self._mcp_server is None:
            from mcp.server import get_mcp_server
            self._mcp_server = get_mcp_server()
        return self._mcp_server
    
    async def get_anthropic_client(self):
        """Lazy loading do cliente Anthropic."""
        if self._anthropic_client is None:
            try:
                import anthropic
                self._anthropic_client = anthropic.AsyncAnthropic(
                    api_key=settings.anthropic_api_key
                )
            except Exception as e:
                logger.error("Error initializing Anthropic client", error=str(e))
                raise
        return self._anthropic_client
    
    async def get_openai_client(self):
        """Lazy loading do cliente OpenAI."""
        if self._openai_client is None:
            try:
                from openai import AsyncOpenAI
                self._openai_client = AsyncOpenAI(
                    api_key=settings.openai_api_key
                )
            except Exception as e:
                logger.error("Error initializing OpenAI client", error=str(e))
                raise
        return self._openai_client
    
    async def run_agent(
        self,
        config: AgentConfig,
        user_message: str,
        conversation_history: List[Message] = None
    ) -> Dict[str, Any]:
        """
        Executa o agente com uma mensagem do usuário.
        
        Args:
            config: Configuração do agente
            user_message: Mensagem do usuário
            conversation_history: Histórico da conversa
        
        Returns:
            Dict com resposta final e ferramentas usadas
        """
        # Obtém ferramentas disponíveis para o agente
        tools = self.mcp_server.get_tools_for_agent(config.agent_type)
        
        # Obtém system prompt
        system_prompt = self.mcp_server.get_system_prompt(config.agent_type)
        
        # Prepara mensagens
        messages = []
        
        if conversation_history:
            for msg in conversation_history:
                messages.append(self._format_message(msg))
        
        messages.append({"role": "user", "content": user_message})
        
        # Executa loop de agente
        tool_calls_made = []
        iterations = 0
        max_iterations = config.max_tool_calls
        
        while iterations < max_iterations:
            iterations += 1
            
            # Chama LLM
            if self.provider == LLMProvider.ANTHROPIC:
                response = await self._call_anthropic(
                    system_prompt=system_prompt,
                    messages=messages,
                    tools=tools,
                    config=config
                )
            else:
                response = await self._call_openai(
                    system_prompt=system_prompt,
                    messages=messages,
                    tools=tools,
                    config=config
                )
            
            # Verifica se há tool calls
            if not response.get("tool_calls"):
                # Agente terminou, retorna resposta final
                return {
                    "response": response.get("content", ""),
                    "tool_calls_made": tool_calls_made,
                    "iterations": iterations,
                    "finished": True
                }
            
            # Executa tool calls
            for tool_call in response["tool_calls"]:
                tool_name = tool_call["name"]
                tool_args = tool_call["arguments"]
                
                logger.info("Executing tool call",
                    tool=tool_name,
                    agent_type=config.agent_type,
                    tenant_id=config.tenant_id
                )
                
                # Adiciona tenant_id se não estiver nos argumentos
                if "tenant_id" not in tool_args:
                    tool_args["tenant_id"] = config.tenant_id
                
                # Executa via MCP Server
                result = await self.mcp_server.call_tool(
                    name=tool_name,
                    arguments=tool_args,
                    tenant_id=config.tenant_id,
                    agent_type=config.agent_type
                )
                
                tool_calls_made.append({
                    "tool": tool_name,
                    "arguments": tool_args,
                    "result": result.result if result.success else {"error": result.error},
                    "success": result.success,
                    "execution_time_ms": result.execution_time_ms
                })
                
                # Adiciona resultado às mensagens
                messages.append({
                    "role": "assistant",
                    "content": None,
                    "tool_calls": [tool_call]
                })
                
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.get("id", tool_name),
                    "content": json.dumps(result.result if result.success else {"error": result.error})
                })
        
        # Limite de iterações atingido
        return {
            "response": "Limite de iterações atingido",
            "tool_calls_made": tool_calls_made,
            "iterations": iterations,
            "finished": False
        }
    
    async def _call_anthropic(
        self,
        system_prompt: str,
        messages: List[Dict[str, Any]],
        tools: List[Dict[str, Any]],
        config: AgentConfig
    ) -> Dict[str, Any]:
        """Chama a API do Claude."""
        try:
            client = await self.get_anthropic_client()
            
            # Converte tools para formato Anthropic
            anthropic_tools = [
                {
                    "name": tool["name"],
                    "description": tool["description"],
                    "input_schema": tool["parameters"]
                }
                for tool in tools
            ]
            
            # Converte mensagens para formato Anthropic
            anthropic_messages = []
            for msg in messages:
                if msg["role"] == "tool":
                    anthropic_messages.append({
                        "role": "user",
                        "content": [
                            {
                                "type": "tool_result",
                                "tool_use_id": msg.get("tool_call_id", ""),
                                "content": msg["content"]
                            }
                        ]
                    })
                elif msg["role"] == "assistant" and msg.get("tool_calls"):
                    anthropic_messages.append({
                        "role": "assistant",
                        "content": [
                            {
                                "type": "tool_use",
                                "id": tc.get("id", tc["name"]),
                                "name": tc["name"],
                                "input": tc["arguments"]
                            }
                            for tc in msg["tool_calls"]
                        ]
                    })
                else:
                    anthropic_messages.append({
                        "role": msg["role"],
                        "content": msg["content"] or ""
                    })
            
            response = await client.messages.create(
                model=config.model,
                max_tokens=config.max_tokens,
                system=system_prompt,
                messages=anthropic_messages,
                tools=anthropic_tools if tools else None,
                temperature=config.temperature
            )
            
            # Processa resposta
            content = ""
            tool_calls = []
            
            for block in response.content:
                if block.type == "text":
                    content = block.text
                elif block.type == "tool_use":
                    tool_calls.append({
                        "id": block.id,
                        "name": block.name,
                        "arguments": block.input
                    })
            
            return {
                "content": content,
                "tool_calls": tool_calls if tool_calls else None,
                "stop_reason": response.stop_reason
            }
            
        except Exception as e:
            logger.error("Error calling Anthropic", error=str(e))
            raise
    
    async def _call_openai(
        self,
        system_prompt: str,
        messages: List[Dict[str, Any]],
        tools: List[Dict[str, Any]],
        config: AgentConfig
    ) -> Dict[str, Any]:
        """Chama a API da OpenAI."""
        try:
            client = await self.get_openai_client()
            
            # Converte tools para formato OpenAI
            openai_tools = [
                {
                    "type": "function",
                    "function": {
                        "name": tool["name"],
                        "description": tool["description"],
                        "parameters": tool["parameters"]
                    }
                }
                for tool in tools
            ]
            
            # Prepara mensagens
            openai_messages = [
                {"role": "system", "content": system_prompt}
            ]
            
            for msg in messages:
                if msg["role"] == "tool":
                    openai_messages.append({
                        "role": "tool",
                        "tool_call_id": msg.get("tool_call_id", ""),
                        "content": msg["content"]
                    })
                elif msg["role"] == "assistant" and msg.get("tool_calls"):
                    openai_messages.append({
                        "role": "assistant",
                        "content": None,
                        "tool_calls": [
                            {
                                "id": tc.get("id", tc["name"]),
                                "type": "function",
                                "function": {
                                    "name": tc["name"],
                                    "arguments": json.dumps(tc["arguments"])
                                }
                            }
                            for tc in msg["tool_calls"]
                        ]
                    })
                else:
                    openai_messages.append({
                        "role": msg["role"],
                        "content": msg["content"] or ""
                    })
            
            response = await client.chat.completions.create(
                model=config.model.replace("claude", "gpt-4"),  # Ajusta modelo
                messages=openai_messages,
                tools=openai_tools if tools else None,
                temperature=config.temperature,
                max_tokens=config.max_tokens
            )
            
            choice = response.choices[0]
            
            # Processa tool calls
            tool_calls = []
            if choice.message.tool_calls:
                for tc in choice.message.tool_calls:
                    tool_calls.append({
                        "id": tc.id,
                        "name": tc.function.name,
                        "arguments": json.loads(tc.function.arguments)
                    })
            
            return {
                "content": choice.message.content or "",
                "tool_calls": tool_calls if tool_calls else None,
                "stop_reason": choice.finish_reason
            }
            
        except Exception as e:
            logger.error("Error calling OpenAI", error=str(e))
            raise
    
    def _format_message(self, msg: Message) -> Dict[str, Any]:
        """Formata mensagem para API."""
        result = {
            "role": msg.role,
            "content": msg.content
        }
        
        if msg.tool_calls:
            result["tool_calls"] = msg.tool_calls
        
        if msg.tool_call_id:
            result["tool_call_id"] = msg.tool_call_id
        
        return result


class SDRAgent:
    """
    Agente SDR que usa MCP + LLM para interagir com leads.
    
    O agente pode:
    - Qualificar leads
    - Responder mensagens
    - Agendar reuniões
    - Escalar para humanos
    """
    
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        self.integration = MCPLLMIntegration(LLMProvider.ANTHROPIC)
        self.conversation_history: List[Message] = []
    
    async def process_message(
        self,
        lead_id: str,
        message: str
    ) -> Dict[str, Any]:
        """
        Processa uma mensagem de um lead.
        
        Args:
            lead_id: ID do lead
            message: Mensagem recebida
        
        Returns:
            Resposta do agente e ações tomadas
        """
        config = AgentConfig(
            agent_type="sdr",
            tenant_id=self.tenant_id,
            model="claude-sonnet-4-20250514",
            temperature=0.7
        )
        
        # Adiciona contexto do lead na mensagem
        user_message = f"""
Lead ID: {lead_id}

Mensagem do lead:
{message}

Analise a mensagem, consulte o contexto do lead, e decida a melhor ação.
Sempre explique seu raciocínio antes de agir.
"""
        
        result = await self.integration.run_agent(
            config=config,
            user_message=user_message,
            conversation_history=self.conversation_history
        )
        
        # Atualiza histórico
        self.conversation_history.append(Message(
            role="user",
            content=user_message
        ))
        
        self.conversation_history.append(Message(
            role="assistant",
            content=result.get("response", "")
        ))
        
        return result
    
    async def qualify_lead(self, lead_id: str) -> Dict[str, Any]:
        """Qualifica um lead usando o agente."""
        config = AgentConfig(
            agent_type="sdr",
            tenant_id=self.tenant_id
        )
        
        user_message = f"""
Qualifique o lead {lead_id}.

Passos:
1. Busque o contexto completo do lead
2. Analise o histórico de mensagens
3. Calcule o score do lead
4. Determine se está pronto para reunião
5. Sugira próximas ações
"""
        
        return await self.integration.run_agent(
            config=config,
            user_message=user_message
        )


class AdsAgent:
    """
    Agente de Ads que usa MCP + LLM para gerenciar campanhas.
    
    O agente pode:
    - Criar campanhas
    - Otimizar campanhas existentes
    - Analisar performance
    - Sugerir melhorias
    """
    
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        self.integration = MCPLLMIntegration(LLMProvider.ANTHROPIC)
    
    async def optimize_campaigns(self) -> Dict[str, Any]:
        """Analisa e otimiza todas as campanhas ativas."""
        config = AgentConfig(
            agent_type="ads",
            tenant_id=self.tenant_id,
            max_tool_calls=15
        )
        
        user_message = """
Analise todas as campanhas ativas e sugira otimizações.

Passos:
1. Liste as campanhas com melhor e pior performance
2. Para cada campanha com ROAS < 1.5, sugira pausa ou otimização
3. Para campanhas com ROAS > 2.5, considere escalar
4. Verifique diretrizes da marca antes de qualquer mudança
5. Gere um relatório com recomendações
"""
        
        return await self.integration.run_agent(
            config=config,
            user_message=user_message
        )
    
    async def create_campaign(
        self,
        objective: str,
        product: str,
        budget: float
    ) -> Dict[str, Any]:
        """Cria uma nova campanha."""
        config = AgentConfig(
            agent_type="ads",
            tenant_id=self.tenant_id,
            max_tool_calls=10
        )
        
        user_message = f"""
Crie uma nova campanha de {objective} para o produto "{product}".
Orçamento diário: R${budget}

Passos:
1. Busque as diretrizes da marca
2. Busque melhores práticas para este objetivo
3. Obtenha recomendação de orçamento
4. Sugira públicos-alvo
5. Gere variações de copy
6. Valide a configuração
7. Crie a campanha (se aprovada)
"""
        
        return await self.integration.run_agent(
            config=config,
            user_message=user_message
        )


class SupportAgent:
    """
    Agente de Suporte IA para o Super Admin.

    O agente pode:
    - Dar suporte sobre funcionalidades (consultar manual)
    - Identificar e corrigir bugs no código
    - Executar comandos SSH na VPS
    - Fazer commits e push no Git
    - Executar deploy em produção
    - Mover leads no Kanban
    """

    def __init__(self):
        self.integration = MCPLLMIntegration(LLMProvider.ANTHROPIC)
        self.conversation_history: List[Message] = []

    async def process_message(self, message: str) -> Dict[str, Any]:
        """
        Processa uma mensagem do super admin.

        Args:
            message: Mensagem do usuário

        Returns:
            Resposta do agente e ações tomadas
        """
        config = AgentConfig(
            agent_type="support",
            tenant_id="super_admin",
            model="claude-sonnet-4-20250514",
            temperature=0.3,  # Mais preciso para tarefas técnicas
            max_tool_calls=20  # Permite mais iterações para tarefas complexas
        )

        result = await self.integration.run_agent(
            config=config,
            user_message=message,
            conversation_history=self.conversation_history
        )

        # Atualiza histórico
        self.conversation_history.append(Message(
            role="user",
            content=message
        ))

        self.conversation_history.append(Message(
            role="assistant",
            content=result.get("response", "")
        ))

        return result

    async def search_manual(self, query: str) -> Dict[str, Any]:
        """Busca no manual de usabilidade."""
        config = AgentConfig(
            agent_type="support",
            tenant_id="super_admin",
            max_tool_calls=3
        )

        user_message = f"""
Busque no manual de usabilidade informações sobre: {query}

Use a ferramenta search_manual para encontrar a resposta.
Retorne um resumo claro e objetivo.
"""

        return await self.integration.run_agent(
            config=config,
            user_message=user_message
        )

    async def diagnose_bug(self, description: str) -> Dict[str, Any]:
        """Diagnostica um bug baseado na descrição."""
        config = AgentConfig(
            agent_type="support",
            tenant_id="super_admin",
            max_tool_calls=10
        )

        user_message = f"""
Diagnostique o seguinte problema:
{description}

Passos:
1. Busque no manual para entender a funcionalidade esperada
2. Busque logs de erro relacionados
3. Localize os arquivos relevantes no código
4. Analise o código e identifique a causa provável
5. Sugira uma correção (NÃO aplique ainda, apenas sugira)
"""

        return await self.integration.run_agent(
            config=config,
            user_message=user_message
        )

    async def fix_bug(self, file_path: str, old_text: str, new_text: str) -> Dict[str, Any]:
        """Aplica uma correção de bug (requer aprovação)."""
        config = AgentConfig(
            agent_type="support",
            tenant_id="super_admin",
            max_tool_calls=5
        )

        user_message = f"""
Aplique a seguinte correção:

Arquivo: {file_path}

Texto antigo:
```
{old_text}
```

Novo texto:
```
{new_text}
```

Passos:
1. Leia o arquivo para confirmar que o texto antigo existe
2. Aplique a correção usando edit_file
3. Verifique se a edição foi bem sucedida
"""

        return await self.integration.run_agent(
            config=config,
            user_message=user_message
        )

    def clear_history(self):
        """Limpa histórico de conversa."""
        self.conversation_history = []


# ==============================================
# FastAPI Router para MCP
# ==============================================

def create_mcp_router():
    """Cria router FastAPI para endpoints MCP."""
    from fastapi import APIRouter, HTTPException
    from pydantic import BaseModel
    
    router = APIRouter(prefix="/mcp", tags=["MCP"])
    
    class RunAgentRequest(BaseModel):
        agent_type: str
        tenant_id: str
        message: str
        conversation_history: Optional[List[Dict[str, Any]]] = None
    
    class ToolCallRequest(BaseModel):
        tool_name: str
        arguments: Dict[str, Any]
        tenant_id: str
        agent_type: str = "unknown"
    
    @router.post("/run")
    async def run_agent(request: RunAgentRequest):
        """Executa o agente MCP."""
        try:
            integration = MCPLLMIntegration()
            
            config = AgentConfig(
                agent_type=request.agent_type,
                tenant_id=request.tenant_id
            )
            
            history = None
            if request.conversation_history:
                history = [
                    Message(**msg) for msg in request.conversation_history
                ]
            
            result = await integration.run_agent(
                config=config,
                user_message=request.message,
                conversation_history=history
            )
            
            return result
            
        except Exception as e:
            logger.error("Error running agent", error=str(e))
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.post("/tool")
    async def call_tool(request: ToolCallRequest):
        """Chama uma ferramenta MCP diretamente."""
        try:
            from mcp.server import get_mcp_server
            
            server = get_mcp_server()
            
            result = await server.call_tool(
                name=request.tool_name,
                arguments=request.arguments,
                tenant_id=request.tenant_id,
                agent_type=request.agent_type
            )
            
            if result.success:
                return {
                    "success": True,
                    "result": result.result,
                    "execution_time_ms": result.execution_time_ms
                }
            else:
                raise HTTPException(status_code=400, detail=result.error)
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error("Error calling tool", error=str(e))
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.get("/tools")
    async def list_tools(agent_type: str = None):
        """Lista ferramentas disponíveis."""
        try:
            from mcp.server import get_mcp_server
            
            server = get_mcp_server()
            
            if agent_type:
                tools = server.get_tools_for_agent(agent_type)
            else:
                tools = server.get_all_tools()
            
            return {
                "tools": tools,
                "count": len(tools),
                "categories": server.get_categories()
            }
            
        except Exception as e:
            logger.error("Error listing tools", error=str(e))
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.get("/stats")
    async def get_stats():
        """Retorna estatísticas do MCP Server."""
        try:
            from mcp.server import get_mcp_server
            
            server = get_mcp_server()
            return server.get_stats()
            
        except Exception as e:
            logger.error("Error getting stats", error=str(e))
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.get("/system-prompt/{agent_type}")
    async def get_system_prompt(agent_type: str):
        """Retorna system prompt para um tipo de agente."""
        try:
            from mcp.server import get_mcp_server
            
            server = get_mcp_server()
            prompt = server.get_system_prompt(agent_type)
            
            return {
                "agent_type": agent_type,
                "system_prompt": prompt
            }
            
        except Exception as e:
            logger.error("Error getting system prompt", error=str(e))
            raise HTTPException(status_code=500, detail=str(e))
    
    return router

