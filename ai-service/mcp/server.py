"""
MCP Server Principal.

Implementa o servidor MCP que registra e expõe todas as ferramentas
disponíveis para os agentes de IA (SDR e Ads).

O LLM pode chamar qualquer ferramenta registrada via protocolo MCP (JSON-RPC).
"""
import json
import asyncio
from typing import Dict, Any, List, Optional, Callable, Awaitable
from dataclasses import dataclass, field, asdict
from datetime import datetime
import structlog

from app.config import get_settings

logger = structlog.get_logger()
settings = get_settings()


@dataclass
class ToolParameter:
    """Parâmetro de uma ferramenta MCP."""
    name: str
    type: str  # string, number, boolean, object, array
    description: str
    required: bool = True
    default: Any = None
    enum: List[str] = field(default_factory=list)


@dataclass
class ToolDefinition:
    """Definição de uma ferramenta MCP."""
    name: str
    description: str
    parameters: List[ToolParameter]
    handler: Callable[..., Awaitable[Dict[str, Any]]]
    category: str = "general"
    requires_approval: bool = False
    dangerous: bool = False
    
    def to_schema(self) -> Dict[str, Any]:
        """Converte para JSON Schema (formato OpenAI/Anthropic)."""
        properties = {}
        required = []
        
        for param in self.parameters:
            prop = {
                "type": param.type,
                "description": param.description,
            }
            if param.enum:
                prop["enum"] = param.enum
            if param.default is not None:
                prop["default"] = param.default
            
            properties[param.name] = prop
            
            if param.required:
                required.append(param.name)
        
        return {
            "name": self.name,
            "description": self.description,
            "parameters": {
                "type": "object",
                "properties": properties,
                "required": required,
            }
        }


@dataclass
class ToolCall:
    """Representa uma chamada de ferramenta."""
    id: str
    name: str
    arguments: Dict[str, Any]
    tenant_id: str
    agent_type: str
    timestamp: datetime = field(default_factory=datetime.utcnow)


@dataclass
class ToolResult:
    """Resultado da execução de uma ferramenta."""
    tool_call_id: str
    success: bool
    result: Any
    error: Optional[str] = None
    execution_time_ms: int = 0


class CRMMCPServer:
    """
    MCP Server que expõe todas as capacidades do CRM AI.
    
    O LLM (Claude/GPT) pode chamar qualquer ferramenta registrada
    para executar ações no sistema.
    
    Funcionalidades:
    - Registro dinâmico de ferramentas
    - Validação de permissões por agente/tenant
    - Logging de todas as chamadas
    - Suporte a ferramentas perigosas com aprovação
    """
    
    def __init__(self):
        self.name = "crm-ai-mcp"
        self.version = "1.0.0"
        self.description = "CRM AI Agent Tools via MCP"
        
        self._tools: Dict[str, ToolDefinition] = {}
        self._categories: Dict[str, List[str]] = {}
        self._permissions = None  # Lazy load
        self._call_history: List[ToolCall] = []
        
        logger.info("MCP Server initialized", name=self.name, version=self.version)
    
    def register_tool(
        self,
        name: str,
        description: str,
        parameters: List[ToolParameter],
        handler: Callable[..., Awaitable[Dict[str, Any]]],
        category: str = "general",
        requires_approval: bool = False,
        dangerous: bool = False
    ) -> None:
        """
        Registra uma nova ferramenta no servidor MCP.
        
        Args:
            name: Nome único da ferramenta
            description: Descrição para o LLM entender quando usar
            parameters: Lista de parâmetros aceitos
            handler: Função async que executa a ferramenta
            category: Categoria (sdr, ads, rag, ml, rl, memory)
            requires_approval: Se precisa aprovação humana
            dangerous: Se é uma operação perigosa (gastar dinheiro, deletar)
        """
        tool = ToolDefinition(
            name=name,
            description=description,
            parameters=parameters,
            handler=handler,
            category=category,
            requires_approval=requires_approval,
            dangerous=dangerous
        )
        
        self._tools[name] = tool
        
        # Agrupa por categoria
        if category not in self._categories:
            self._categories[category] = []
        self._categories[category].append(name)
        
        logger.debug("Tool registered", name=name, category=category)
    
    def register_tool_decorator(
        self,
        name: str = None,
        description: str = None,
        category: str = "general",
        requires_approval: bool = False,
        dangerous: bool = False
    ):
        """
        Decorator para registrar ferramentas.
        
        Exemplo:
            @mcp.register_tool_decorator(
                name="predict_lead_score",
                description="Prediz probabilidade de conversão",
                category="sdr"
            )
            async def predict_lead_score(lead_id: str, tenant_id: str):
                ...
        """
        def decorator(func):
            tool_name = name or func.__name__
            tool_desc = description or func.__doc__ or "No description"
            
            # Extrai parâmetros da assinatura
            import inspect
            sig = inspect.signature(func)
            params = []
            
            for param_name, param in sig.parameters.items():
                if param_name in ['self', 'cls']:
                    continue
                
                param_type = "string"  # Default
                if param.annotation != inspect.Parameter.empty:
                    type_map = {
                        str: "string",
                        int: "number",
                        float: "number",
                        bool: "boolean",
                        list: "array",
                        dict: "object",
                    }
                    param_type = type_map.get(param.annotation, "string")
                
                params.append(ToolParameter(
                    name=param_name,
                    type=param_type,
                    description=f"Parameter: {param_name}",
                    required=param.default == inspect.Parameter.empty,
                    default=None if param.default == inspect.Parameter.empty else param.default
                ))
            
            self.register_tool(
                name=tool_name,
                description=tool_desc,
                parameters=params,
                handler=func,
                category=category,
                requires_approval=requires_approval,
                dangerous=dangerous
            )
            
            return func
        
        return decorator
    
    async def call_tool(
        self,
        name: str,
        arguments: Dict[str, Any],
        tenant_id: str,
        agent_type: str = "unknown"
    ) -> ToolResult:
        """
        Executa uma ferramenta.
        
        Args:
            name: Nome da ferramenta
            arguments: Argumentos para a ferramenta
            tenant_id: ID do tenant
            agent_type: Tipo do agente (sdr, ads)
        
        Returns:
            ToolResult com o resultado ou erro
        """
        import uuid
        import time
        
        call_id = str(uuid.uuid4())
        start_time = time.time()
        
        # Registra chamada
        call = ToolCall(
            id=call_id,
            name=name,
            arguments=arguments,
            tenant_id=tenant_id,
            agent_type=agent_type
        )
        self._call_history.append(call)
        
        logger.info("Tool call started",
            tool=name,
            tenant_id=tenant_id,
            agent_type=agent_type,
            call_id=call_id
        )
        
        try:
            # Verifica se ferramenta existe
            if name not in self._tools:
                return ToolResult(
                    tool_call_id=call_id,
                    success=False,
                    result=None,
                    error=f"Tool '{name}' not found"
                )
            
            tool = self._tools[name]
            
            # Verifica permissões
            if self._permissions:
                allowed = await self._permissions.check_permission(
                    agent_type=agent_type,
                    tool_name=name,
                    tenant_id=tenant_id
                )
                if not allowed:
                    return ToolResult(
                        tool_call_id=call_id,
                        success=False,
                        result=None,
                        error=f"Permission denied for tool '{name}'"
                    )
            
            # Verifica se precisa aprovação
            if tool.requires_approval or tool.dangerous:
                # TODO: Implementar sistema de aprovação
                logger.warning("Tool requires approval",
                    tool=name,
                    dangerous=tool.dangerous
                )
            
            # Executa a ferramenta
            result = await tool.handler(**arguments)
            
            execution_time = int((time.time() - start_time) * 1000)
            
            logger.info("Tool call completed",
                tool=name,
                call_id=call_id,
                execution_time_ms=execution_time,
                success=True
            )
            
            return ToolResult(
                tool_call_id=call_id,
                success=True,
                result=result,
                execution_time_ms=execution_time
            )
            
        except Exception as e:
            execution_time = int((time.time() - start_time) * 1000)
            
            logger.error("Tool call failed",
                tool=name,
                call_id=call_id,
                error=str(e),
                execution_time_ms=execution_time
            )
            
            return ToolResult(
                tool_call_id=call_id,
                success=False,
                result=None,
                error=str(e),
                execution_time_ms=execution_time
            )
    
    def get_tools_for_agent(self, agent_type: str) -> List[Dict[str, Any]]:
        """
        Retorna lista de ferramentas disponíveis para um tipo de agente.
        
        Formato compatível com OpenAI Functions / Anthropic Tools.
        """
        tools = []
        
        for name, tool in self._tools.items():
            # Filtra por permissões se disponível
            if self._permissions:
                if name not in self._permissions.AGENT_PERMISSIONS.get(agent_type, []):
                    continue
            
            tools.append(tool.to_schema())
        
        return tools
    
    def get_all_tools(self) -> List[Dict[str, Any]]:
        """Retorna todas as ferramentas registradas."""
        return [tool.to_schema() for tool in self._tools.values()]
    
    def get_tools_by_category(self, category: str) -> List[Dict[str, Any]]:
        """Retorna ferramentas de uma categoria específica."""
        tool_names = self._categories.get(category, [])
        return [self._tools[name].to_schema() for name in tool_names if name in self._tools]
    
    def get_categories(self) -> Dict[str, int]:
        """Retorna categorias e quantidade de ferramentas."""
        return {cat: len(tools) for cat, tools in self._categories.items()}
    
    def set_permissions(self, permissions) -> None:
        """Define o sistema de permissões."""
        self._permissions = permissions
    
    def get_system_prompt(self, agent_type: str) -> str:
        """
        Gera system prompt com as ferramentas disponíveis.
        
        Usado para instruir o LLM sobre as ferramentas.
        """
        tools = self.get_tools_for_agent(agent_type)
        
        if agent_type == "sdr":
            intro = """Você é um agente SDR (Sales Development Representative) autônomo.
Seu objetivo é qualificar leads e agendar reuniões com potenciais clientes.

Você tem acesso às seguintes ferramentas:"""
        
        elif agent_type == "ads":
            intro = """Você é um agente de Ads (Publicidade) autônomo.
Seu objetivo é criar e otimizar campanhas de publicidade no Meta Ads.

Você tem acesso às seguintes ferramentas:"""
        
        else:
            intro = f"""Você é um agente de IA do tipo '{agent_type}'.

Você tem acesso às seguintes ferramentas:"""
        
        # Agrupa por categoria
        tools_by_category: Dict[str, List[str]] = {}
        for tool in tools:
            category = self._tools[tool['name']].category
            if category not in tools_by_category:
                tools_by_category[category] = []
            tools_by_category[category].append(
                f"- {tool['name']}: {tool['description']}"
            )
        
        tools_text = ""
        for category, tool_list in tools_by_category.items():
            tools_text += f"\n## {category.upper()}\n"
            tools_text += "\n".join(tool_list)
            tools_text += "\n"
        
        instructions = """
INSTRUÇÕES:
1. Sempre consulte o contexto antes de agir
2. Use as ferramentas de ML para fazer predições
3. Use as ferramentas de RL para escolher a melhor ação
4. Registre experiências para melhorar com o tempo
5. Consulte a base de conhecimento para melhores práticas
6. Explique suas decisões de forma clara"""
        
        return f"{intro}\n{tools_text}\n{instructions}"
    
    def get_stats(self) -> Dict[str, Any]:
        """Retorna estatísticas do servidor."""
        return {
            "name": self.name,
            "version": self.version,
            "total_tools": len(self._tools),
            "categories": self.get_categories(),
            "total_calls": len(self._call_history),
            "recent_calls": len([c for c in self._call_history[-100:]]),
        }


# Singleton
_mcp_server: Optional[CRMMCPServer] = None


def get_mcp_server() -> CRMMCPServer:
    """Retorna instância singleton do MCP Server."""
    global _mcp_server
    
    if _mcp_server is None:
        _mcp_server = CRMMCPServer()
        
        # Registra todas as ferramentas
        _register_all_tools(_mcp_server)
    
    return _mcp_server


def _register_all_tools(server: CRMMCPServer) -> None:
    """Registra todas as ferramentas disponíveis."""
    from mcp.tools import (
        sdr_tools,
        ads_tools,
        rag_tools,
        ml_tools,
        rl_tools,
        memory_tools
    )
    
    # Registra ferramentas de cada módulo
    sdr_tools.register_tools(server)
    ads_tools.register_tools(server)
    rag_tools.register_tools(server)
    ml_tools.register_tools(server)
    rl_tools.register_tools(server)
    memory_tools.register_tools(server)
    
    logger.info("All MCP tools registered",
        total_tools=len(server._tools),
        categories=list(server._categories.keys())
    )

