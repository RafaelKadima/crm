"""
Guardrails Engine para Agentes de Ads
Valida ações do agente contra regras configuradas pelo tenant
"""
import json
from typing import List, Dict, Any, Optional
from datetime import datetime
from dataclasses import dataclass
from enum import Enum
import structlog

from app.config import get_settings

logger = structlog.get_logger()
settings = get_settings()


class ActionType(str, Enum):
    """Tipos de ações que podem ser validadas"""
    CREATE_CAMPAIGN = "create_campaign"
    UPDATE_CAMPAIGN = "update_campaign"
    SET_BUDGET = "set_budget"
    CREATE_ADSET = "create_adset"
    CREATE_AD = "create_ad"
    ACTIVATE_CAMPAIGN = "activate_campaign"
    UPLOAD_CREATIVE = "upload_creative"


class GuardrailActionType(str, Enum):
    """Tipos de ações dos guardrails"""
    BLOCK = "block"
    REQUIRE_APPROVAL = "require_approval"
    WARN = "warn"
    NOTIFY = "notify"


@dataclass
class GuardrailResult:
    """Resultado da verificação de guardrails"""
    allowed: bool
    action_type: GuardrailActionType
    message: str
    triggered_rules: List[Dict[str, Any]]
    requires_approval: bool = False
    approval_reason: Optional[str] = None


@dataclass
class Guardrail:
    """Representação de uma regra de guardrail"""
    id: str
    name: str
    description: str
    rule_type: str
    scope: str
    conditions: Dict[str, Any]
    action: Dict[str, Any]
    priority: int
    is_active: bool


class GuardrailsEngine:
    """
    Engine para validação de ações do agente contra guardrails
    - Verifica limites de orçamento
    - Valida objetivos permitidos
    - Aplica restrições de horário
    - Requer aprovação quando necessário
    """
    
    def __init__(self):
        self._db_engine = None
        self._rules_cache: Dict[str, List[Guardrail]] = {}
        self._cache_ttl = 300  # 5 minutos
        self._cache_timestamp: Dict[str, datetime] = {}
    
    async def get_db_engine(self):
        """Lazy loading do engine do banco"""
        if self._db_engine is None:
            from sqlalchemy.ext.asyncio import create_async_engine
            db_url = settings.database_url
            if not db_url.startswith('postgresql+asyncpg://'):
                db_url = db_url.replace('postgresql://', 'postgresql+asyncpg://')
            self._db_engine = create_async_engine(db_url)
        return self._db_engine
    
    async def check_action(
        self,
        tenant_id: str,
        action: str,
        params: Dict[str, Any]
    ) -> GuardrailResult:
        """
        Verifica se uma ação é permitida baseado nos guardrails do tenant
        
        Args:
            tenant_id: ID do tenant
            action: Tipo de ação (create_campaign, set_budget, etc)
            params: Parâmetros da ação
            
        Returns:
            GuardrailResult com a decisão e detalhes
        """
        try:
            # Busca regras do tenant
            rules = await self.get_tenant_rules(tenant_id)
            
            if not rules:
                # Sem regras = tudo permitido
                return GuardrailResult(
                    allowed=True,
                    action_type=GuardrailActionType.NOTIFY,
                    message="Ação permitida (sem guardrails configurados)",
                    triggered_rules=[]
                )
            
            # Filtra regras aplicáveis à ação
            applicable_rules = self._filter_rules_for_action(rules, action)
            
            triggered_rules = []
            blocking_rule = None
            approval_rule = None
            warnings = []
            
            # Adiciona contexto de horário aos params
            params_with_context = {
                **params,
                'hour': datetime.now().hour,
                'weekday': datetime.now().weekday(),
            }
            
            # Verifica cada regra
            for rule in applicable_rules:
                if self._check_conditions(rule.conditions, params_with_context):
                    triggered_rules.append({
                        'id': rule.id,
                        'name': rule.name,
                        'action_type': rule.action.get('type', 'warn'),
                        'message': rule.action.get('message', '')
                    })
                    
                    action_type = rule.action.get('type', 'warn')
                    
                    if action_type == GuardrailActionType.BLOCK:
                        blocking_rule = rule
                        break  # Regra de bloqueio tem precedência
                    elif action_type == GuardrailActionType.REQUIRE_APPROVAL:
                        approval_rule = rule
                    elif action_type == GuardrailActionType.WARN:
                        warnings.append(rule.action.get('message', ''))
                    
                    # Registra acionamento
                    await self._record_trigger(rule.id)
            
            # Decide resultado
            if blocking_rule:
                return GuardrailResult(
                    allowed=False,
                    action_type=GuardrailActionType.BLOCK,
                    message=blocking_rule.action.get('message', 'Ação bloqueada por guardrail'),
                    triggered_rules=triggered_rules
                )
            
            if approval_rule:
                return GuardrailResult(
                    allowed=False,
                    action_type=GuardrailActionType.REQUIRE_APPROVAL,
                    message=approval_rule.action.get('message', 'Ação requer aprovação'),
                    triggered_rules=triggered_rules,
                    requires_approval=True,
                    approval_reason=approval_rule.action.get('message')
                )
            
            if warnings:
                return GuardrailResult(
                    allowed=True,
                    action_type=GuardrailActionType.WARN,
                    message=f"Avisos: {'; '.join(warnings)}",
                    triggered_rules=triggered_rules
                )
            
            return GuardrailResult(
                allowed=True,
                action_type=GuardrailActionType.NOTIFY,
                message="Ação permitida",
                triggered_rules=triggered_rules
            )
            
        except Exception as e:
            logger.error("guardrails_check_error", error=str(e))
            # Em caso de erro, permite a ação mas avisa
            return GuardrailResult(
                allowed=True,
                action_type=GuardrailActionType.WARN,
                message=f"Erro ao verificar guardrails: {str(e)}",
                triggered_rules=[]
            )
    
    async def get_tenant_rules(self, tenant_id: str) -> List[Guardrail]:
        """
        Busca regras do tenant (com cache)
        """
        # Verifica cache
        if tenant_id in self._rules_cache:
            cache_time = self._cache_timestamp.get(tenant_id)
            if cache_time and (datetime.now() - cache_time).seconds < self._cache_ttl:
                return self._rules_cache[tenant_id]
        
        try:
            engine = await self.get_db_engine()
            
            async with engine.connect() as conn:
                from sqlalchemy import text
                
                result = await conn.execute(text("""
                    SELECT id, name, description, rule_type, scope,
                           conditions, action, priority, is_active
                    FROM ad_guardrails
                    WHERE tenant_id = :tenant_id
                    AND is_active = true
                    ORDER BY priority DESC
                """), {'tenant_id': tenant_id})
                
                rules = []
                for row in result.fetchall():
                    rules.append(Guardrail(
                        id=str(row.id),
                        name=row.name,
                        description=row.description or '',
                        rule_type=row.rule_type,
                        scope=row.scope,
                        conditions=json.loads(row.conditions) if isinstance(row.conditions, str) else (row.conditions or {}),
                        action=json.loads(row.action) if isinstance(row.action, str) else (row.action or {}),
                        priority=row.priority or 0,
                        is_active=row.is_active
                    ))
                
                # Atualiza cache
                self._rules_cache[tenant_id] = rules
                self._cache_timestamp[tenant_id] = datetime.now()
                
                return rules
                
        except Exception as e:
            logger.error("get_tenant_rules_error", error=str(e))
            return []
    
    def _filter_rules_for_action(
        self,
        rules: List[Guardrail],
        action: str
    ) -> List[Guardrail]:
        """Filtra regras aplicáveis a uma ação específica"""
        applicable = []
        
        # Mapeia ações para escopos
        action_scope_map = {
            ActionType.CREATE_CAMPAIGN: ['campaign', 'all'],
            ActionType.UPDATE_CAMPAIGN: ['campaign', 'all'],
            ActionType.SET_BUDGET: ['campaign', 'adset', 'all'],
            ActionType.CREATE_ADSET: ['adset', 'all'],
            ActionType.CREATE_AD: ['ad', 'all'],
            ActionType.ACTIVATE_CAMPAIGN: ['campaign', 'all'],
            ActionType.UPLOAD_CREATIVE: ['creative', 'all'],
        }
        
        valid_scopes = action_scope_map.get(action, ['all'])
        
        for rule in rules:
            if rule.scope in valid_scopes:
                applicable.append(rule)
        
        return applicable
    
    def _check_conditions(
        self,
        conditions: Dict[str, Any],
        params: Dict[str, Any]
    ) -> bool:
        """
        Verifica se as condições de uma regra são atendidas
        
        Suporta operadores:
        - field: valor direto (igualdade)
        - field_gt: maior que
        - field_lt: menor que
        - field_gte: maior ou igual
        - field_lte: menor ou igual
        - field_in: está na lista
        - field_not_in: não está na lista
        - field_contains: contém substring
        """
        for field, expected_value in conditions.items():
            # Operador maior que
            if field.endswith('_gt'):
                real_field = field[:-3]
                actual_value = params.get(real_field)
                if actual_value is None or actual_value <= expected_value:
                    return False
                continue
            
            # Operador menor que
            if field.endswith('_lt'):
                real_field = field[:-3]
                actual_value = params.get(real_field)
                if actual_value is None or actual_value >= expected_value:
                    return False
                continue
            
            # Operador maior ou igual
            if field.endswith('_gte'):
                real_field = field[:-4]
                actual_value = params.get(real_field)
                if actual_value is None or actual_value < expected_value:
                    return False
                continue
            
            # Operador menor ou igual
            if field.endswith('_lte'):
                real_field = field[:-4]
                actual_value = params.get(real_field)
                if actual_value is None or actual_value > expected_value:
                    return False
                continue
            
            # Operador está na lista
            if field.endswith('_in'):
                real_field = field[:-3]
                actual_value = params.get(real_field)
                if actual_value is None or actual_value not in expected_value:
                    return False
                continue
            
            # Operador não está na lista
            if field.endswith('_not_in'):
                real_field = field[:-7]
                actual_value = params.get(real_field)
                if actual_value is not None and actual_value in expected_value:
                    return False
                continue
            
            # Operador contém
            if field.endswith('_contains'):
                real_field = field[:-9]
                actual_value = params.get(real_field)
                if actual_value is None or expected_value not in str(actual_value):
                    return False
                continue
            
            # Comparação direta (igualdade)
            actual_value = params.get(field)
            if actual_value != expected_value:
                return False
        
        return True
    
    async def _record_trigger(self, rule_id: str) -> None:
        """Registra acionamento de uma regra"""
        try:
            engine = await self.get_db_engine()
            
            async with engine.begin() as conn:
                from sqlalchemy import text
                
                await conn.execute(text("""
                    UPDATE ad_guardrails
                    SET trigger_count = trigger_count + 1,
                        last_triggered_at = NOW()
                    WHERE id = :id
                """), {'id': rule_id})
                
        except Exception as e:
            logger.error("record_trigger_error", error=str(e))
    
    def invalidate_cache(self, tenant_id: str) -> None:
        """Invalida cache de regras para um tenant"""
        if tenant_id in self._rules_cache:
            del self._rules_cache[tenant_id]
        if tenant_id in self._cache_timestamp:
            del self._cache_timestamp[tenant_id]
    
    # ==========================================
    # VALIDAÇÕES ESPECÍFICAS
    # ==========================================
    
    async def validate_budget(
        self,
        tenant_id: str,
        daily_budget: float,
        objective: str = None
    ) -> GuardrailResult:
        """Valida orçamento contra guardrails"""
        params = {
            'daily_budget': daily_budget,
            'objective': objective
        }
        return await self.check_action(tenant_id, ActionType.SET_BUDGET, params)
    
    async def validate_campaign_creation(
        self,
        tenant_id: str,
        campaign_data: Dict[str, Any]
    ) -> GuardrailResult:
        """Valida criação de campanha"""
        return await self.check_action(
            tenant_id,
            ActionType.CREATE_CAMPAIGN,
            campaign_data
        )
    
    async def validate_activation(
        self,
        tenant_id: str,
        campaign_data: Dict[str, Any]
    ) -> GuardrailResult:
        """Valida ativação de campanha"""
        return await self.check_action(
            tenant_id,
            ActionType.ACTIVATE_CAMPAIGN,
            campaign_data
        )
    
    # ==========================================
    # GUARDRAILS PADRÃO
    # ==========================================
    
    @staticmethod
    def get_default_guardrails() -> List[Dict[str, Any]]:
        """Retorna lista de guardrails padrão para novos tenants"""
        return [
            {
                'name': 'Limite de orçamento diário alto',
                'description': 'Requer aprovação para orçamentos acima de R$ 500/dia',
                'rule_type': 'budget_limit',
                'scope': 'campaign',
                'conditions': {'daily_budget_gt': 500},
                'action': {
                    'type': 'require_approval',
                    'message': 'Orçamento acima de R$ 500/dia requer aprovação do gestor'
                },
                'priority': 100
            },
            {
                'name': 'Aviso de orçamento moderado',
                'description': 'Avisa quando orçamento está acima de R$ 200/dia',
                'rule_type': 'budget_limit',
                'scope': 'campaign',
                'conditions': {'daily_budget_gt': 200},
                'action': {
                    'type': 'warn',
                    'message': 'Atenção: orçamento diário acima de R$ 200'
                },
                'priority': 50
            },
            {
                'name': 'Horário comercial',
                'description': 'Avisa sobre criação fora do horário comercial',
                'rule_type': 'schedule_restriction',
                'scope': 'all',
                'conditions': {'hour_not_in': [9, 10, 11, 12, 13, 14, 15, 16, 17, 18]},
                'action': {
                    'type': 'warn',
                    'message': 'Você está criando campanhas fora do horário comercial'
                },
                'priority': 10
            },
            {
                'name': 'Limite máximo absoluto',
                'description': 'Bloqueia orçamentos acima de R$ 2.000/dia',
                'rule_type': 'budget_limit',
                'scope': 'campaign',
                'conditions': {'daily_budget_gt': 2000},
                'action': {
                    'type': 'block',
                    'message': 'Orçamento acima do limite máximo de R$ 2.000/dia'
                },
                'priority': 200
            }
        ]


# Singleton
guardrails_engine = GuardrailsEngine()


def get_guardrails_engine() -> GuardrailsEngine:
    """Retorna instância singleton do engine"""
    return guardrails_engine

