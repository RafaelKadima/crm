"""
MCP (Model Context Protocol) Server para CRM AI.

Este módulo implementa um servidor MCP completo que expõe todas as capacidades
do sistema de IA (ML, RL, RAG, Memory) como ferramentas que o LLM pode chamar.

Arquitetura:
    LLM (Claude/GPT) → MCP Protocol → MCP Server → Tools → ML/RL/RAG/CRM

Componentes:
- server.py: MCP Server principal
- permissions.py: Controle de acesso por agente/tenant
- schemas.py: JSON Schemas das ferramentas
- tools/: Implementação das ferramentas por domínio
"""

from mcp.server import CRMMCPServer, get_mcp_server
from mcp.permissions import MCPPermissions
from mcp.schemas import ToolSchema

__all__ = [
    'CRMMCPServer',
    'get_mcp_server',
    'MCPPermissions',
    'ToolSchema',
]

