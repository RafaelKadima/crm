"""
JSON Schemas para ferramentas MCP.

Define schemas padrão e utilitários para validação.
"""
from typing import Dict, Any, List, Optional, Type
from dataclasses import dataclass
from enum import Enum
import json


class ParameterType(str, Enum):
    """Tipos de parâmetros suportados."""
    STRING = "string"
    NUMBER = "number"
    INTEGER = "integer"
    BOOLEAN = "boolean"
    ARRAY = "array"
    OBJECT = "object"


@dataclass
class ToolSchema:
    """
    Schema de uma ferramenta MCP.
    
    Compatível com:
    - OpenAI Function Calling
    - Anthropic Tool Use
    - LangChain Tools
    """
    name: str
    description: str
    parameters: Dict[str, Any]
    
    @classmethod
    def create(
        cls,
        name: str,
        description: str,
        properties: Dict[str, Dict[str, Any]],
        required: List[str] = None
    ) -> 'ToolSchema':
        """
        Cria um schema de ferramenta.
        
        Args:
            name: Nome da ferramenta
            description: Descrição
            properties: Propriedades/parâmetros
            required: Lista de parâmetros obrigatórios
        """
        return cls(
            name=name,
            description=description,
            parameters={
                "type": "object",
                "properties": properties,
                "required": required or []
            }
        )
    
    def to_openai_format(self) -> Dict[str, Any]:
        """Converte para formato OpenAI Functions."""
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters
            }
        }
    
    def to_anthropic_format(self) -> Dict[str, Any]:
        """Converte para formato Anthropic Tools."""
        return {
            "name": self.name,
            "description": self.description,
            "input_schema": self.parameters
        }
    
    def to_langchain_format(self) -> Dict[str, Any]:
        """Converte para formato LangChain."""
        return {
            "name": self.name,
            "description": self.description,
            "parameters": self.parameters
        }
    
    def to_dict(self) -> Dict[str, Any]:
        """Converte para dicionário genérico."""
        return {
            "name": self.name,
            "description": self.description,
            "parameters": self.parameters
        }


# ==============================================
# Schemas Comuns
# ==============================================

# Parâmetro de tenant_id (usado em quase todas as ferramentas)
TENANT_ID_PARAM = {
    "type": "string",
    "description": "ID do tenant (empresa)"
}

# Parâmetro de lead_id
LEAD_ID_PARAM = {
    "type": "string",
    "description": "ID único do lead"
}

# Parâmetro de campaign_id
CAMPAIGN_ID_PARAM = {
    "type": "string",
    "description": "ID único da campanha"
}

# Schema de resposta padrão
STANDARD_RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "success": {"type": "boolean"},
        "data": {"type": "object"},
        "error": {"type": "string", "nullable": True}
    }
}


# ==============================================
# Schemas de SDR Tools
# ==============================================

PREDICT_LEAD_SCORE_SCHEMA = ToolSchema.create(
    name="predict_lead_score",
    description="Prediz a probabilidade de um lead converter (agendar reunião, comprar, etc.)",
    properties={
        "lead_id": LEAD_ID_PARAM,
        "tenant_id": TENANT_ID_PARAM,
    },
    required=["lead_id", "tenant_id"]
)

GET_LEAD_CONTEXT_SCHEMA = ToolSchema.create(
    name="get_lead_context",
    description="Busca contexto completo de um lead incluindo mensagens, histórico e perfil",
    properties={
        "lead_id": LEAD_ID_PARAM,
        "tenant_id": TENANT_ID_PARAM,
        "include_messages": {
            "type": "boolean",
            "description": "Se deve incluir histórico de mensagens",
            "default": True
        }
    },
    required=["lead_id", "tenant_id"]
)

SELECT_SDR_ACTION_SCHEMA = ToolSchema.create(
    name="select_sdr_action",
    description="Usa Reinforcement Learning para selecionar a melhor ação para um lead",
    properties={
        "lead_id": LEAD_ID_PARAM,
        "tenant_id": TENANT_ID_PARAM,
        "current_state": {
            "type": "object",
            "description": "Estado atual do lead (score, intent, etc.)"
        }
    },
    required=["lead_id", "tenant_id"]
)

SEND_MESSAGE_SCHEMA = ToolSchema.create(
    name="send_message",
    description="Envia uma mensagem para um lead via WhatsApp ou outro canal",
    properties={
        "lead_id": LEAD_ID_PARAM,
        "tenant_id": TENANT_ID_PARAM,
        "message": {
            "type": "string",
            "description": "Texto da mensagem a enviar"
        },
        "channel": {
            "type": "string",
            "enum": ["whatsapp", "email", "sms"],
            "default": "whatsapp"
        }
    },
    required=["lead_id", "tenant_id", "message"]
)


# ==============================================
# Schemas de Ads Tools
# ==============================================

PREDICT_CAMPAIGN_PERFORMANCE_SCHEMA = ToolSchema.create(
    name="predict_campaign_performance",
    description="Prediz métricas de performance de uma campanha (ROAS, CTR, conversões)",
    properties={
        "tenant_id": TENANT_ID_PARAM,
        "campaign_config": {
            "type": "object",
            "description": "Configuração da campanha (objetivo, budget, criativo)",
            "properties": {
                "objective": {"type": "string"},
                "daily_budget": {"type": "number"},
                "creative_type": {"type": "string"},
                "audience_size": {"type": "integer"}
            }
        }
    },
    required=["tenant_id", "campaign_config"]
)

CREATE_CAMPAIGN_SCHEMA = ToolSchema.create(
    name="create_campaign",
    description="Cria uma nova campanha de anúncios no Meta Ads",
    properties={
        "tenant_id": TENANT_ID_PARAM,
        "ad_account_id": {
            "type": "string",
            "description": "ID da conta de anúncios"
        },
        "name": {
            "type": "string",
            "description": "Nome da campanha"
        },
        "objective": {
            "type": "string",
            "enum": ["OUTCOME_SALES", "OUTCOME_LEADS", "OUTCOME_AWARENESS", "OUTCOME_TRAFFIC"],
            "description": "Objetivo da campanha"
        },
        "daily_budget": {
            "type": "number",
            "description": "Orçamento diário em reais"
        }
    },
    required=["tenant_id", "ad_account_id", "name", "objective", "daily_budget"]
)


# ==============================================
# Schemas de RAG Tools
# ==============================================

SEARCH_KNOWLEDGE_SCHEMA = ToolSchema.create(
    name="search_knowledge",
    description="Busca semântica na base de conhecimento",
    properties={
        "tenant_id": TENANT_ID_PARAM,
        "query": {
            "type": "string",
            "description": "Texto da busca"
        },
        "category": {
            "type": "string",
            "enum": ["rules", "best_practices", "brand_guidelines", "patterns", "documents"],
            "description": "Categoria para filtrar (opcional)"
        },
        "top_k": {
            "type": "integer",
            "description": "Número máximo de resultados",
            "default": 5
        }
    },
    required=["tenant_id", "query"]
)


# ==============================================
# Registro de todos os schemas
# ==============================================

ALL_SCHEMAS = {
    # SDR
    "predict_lead_score": PREDICT_LEAD_SCORE_SCHEMA,
    "get_lead_context": GET_LEAD_CONTEXT_SCHEMA,
    "select_sdr_action": SELECT_SDR_ACTION_SCHEMA,
    "send_message": SEND_MESSAGE_SCHEMA,
    
    # Ads
    "predict_campaign_performance": PREDICT_CAMPAIGN_PERFORMANCE_SCHEMA,
    "create_campaign": CREATE_CAMPAIGN_SCHEMA,
    
    # RAG
    "search_knowledge": SEARCH_KNOWLEDGE_SCHEMA,
}


def get_schema(tool_name: str) -> Optional[ToolSchema]:
    """Retorna schema de uma ferramenta."""
    return ALL_SCHEMAS.get(tool_name)


def validate_arguments(tool_name: str, arguments: Dict[str, Any]) -> tuple:
    """
    Valida argumentos contra o schema.
    
    Returns:
        Tuple (is_valid, errors)
    """
    schema = get_schema(tool_name)
    if not schema:
        return True, []  # Sem schema, aceita tudo
    
    errors = []
    params = schema.parameters
    
    # Verifica campos obrigatórios
    for required_field in params.get("required", []):
        if required_field not in arguments:
            errors.append(f"Missing required field: {required_field}")
    
    # Verifica tipos
    properties = params.get("properties", {})
    for field, value in arguments.items():
        if field in properties:
            expected_type = properties[field].get("type")
            
            type_checks = {
                "string": lambda v: isinstance(v, str),
                "number": lambda v: isinstance(v, (int, float)),
                "integer": lambda v: isinstance(v, int),
                "boolean": lambda v: isinstance(v, bool),
                "array": lambda v: isinstance(v, list),
                "object": lambda v: isinstance(v, dict),
            }
            
            if expected_type and expected_type in type_checks:
                if not type_checks[expected_type](value):
                    errors.append(f"Field '{field}' should be {expected_type}, got {type(value).__name__}")
    
    return len(errors) == 0, errors

