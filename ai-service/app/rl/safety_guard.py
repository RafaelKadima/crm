"""
Safety Guard para Reinforcement Learning.

Valida ações antes de executá-las para evitar comportamentos perigosos.
Especialmente importante para Ads onde ações podem ter impacto financeiro.
"""
from dataclasses import dataclass
from typing import Optional, Dict, Any
import structlog

from app.config import get_settings
from app.rl.states import SDRState, AdsState
from app.rl.actions import SDRAction, AdsAction

logger = structlog.get_logger()
settings = get_settings()


@dataclass
class SafetyResult:
    """Resultado da validação de segurança."""
    allowed: bool
    reason: Optional[str] = None
    requires_approval: bool = False
    suggested_action: Optional[int] = None


class AdsSafetyGuard:
    """
    Valida ações do Ads Agent antes de executar.
    
    Protege contra:
    - Gastos excessivos
    - Escalas prematuras
    - Ações em campanhas com performance ruim
    """
    
    DEFAULT_LIMITS = {
        'max_budget_increase_pct': 0.5,    # Max 50% aumento por vez
        'max_daily_budget': 2000,          # R$ 2000/dia
        'min_days_before_scale': 3,        # 3 dias antes de escalar
        'max_campaigns_per_day': 10,       # Max 10 campanhas criadas/dia
        'min_roas_to_scale': 1.5,          # ROAS mínimo para escalar
        'min_roas_to_duplicate': 2.0,      # ROAS mínimo para duplicar
        'min_conversions_to_scale': 5,     # Mínimo de conversões para escalar
    }
    
    def __init__(self):
        self._db_engine = None
    
    async def get_db_engine(self):
        """Lazy loading do engine do banco."""
        if self._db_engine is None:
            from sqlalchemy.ext.asyncio import create_async_engine
            db_url = settings.database_url
            if not db_url.startswith('postgresql+asyncpg://'):
                db_url = db_url.replace('postgresql://', 'postgresql+asyncpg://')
            self._db_engine = create_async_engine(db_url)
        return self._db_engine
    
    async def get_tenant_limits(self, tenant_id: str) -> Dict[str, Any]:
        """Busca limites específicos do tenant."""
        try:
            engine = await self.get_db_engine()
            
            async with engine.connect() as conn:
                from sqlalchemy import text
                
                result = await conn.execute(text("""
                    SELECT metadata FROM tenants WHERE id = :tenant_id
                """), {'tenant_id': tenant_id})
                
                row = result.fetchone()
                
                if row and row.metadata:
                    import json
                    metadata = json.loads(row.metadata) if isinstance(row.metadata, str) else row.metadata
                    
                    # Mescla com defaults
                    tenant_limits = metadata.get('ads_limits', {})
                    return {**self.DEFAULT_LIMITS, **tenant_limits}
            
            return self.DEFAULT_LIMITS
            
        except Exception as e:
            logger.error("get_tenant_limits_error", error=str(e))
            return self.DEFAULT_LIMITS
    
    async def validate_action(
        self,
        state: AdsState,
        action: AdsAction,
        tenant_id: str
    ) -> SafetyResult:
        """
        Valida se uma ação pode ser executada.
        
        Args:
            state: Estado atual da campanha
            action: Ação proposta
            tenant_id: ID do tenant
        
        Returns:
            SafetyResult indicando se ação é permitida
        """
        limits = await self.get_tenant_limits(tenant_id)
        
        # Validação por tipo de ação
        if action == AdsAction.INCREASE_BUDGET:
            return await self._validate_increase_budget(state, limits)
        
        elif action == AdsAction.DUPLICATE:
            return await self._validate_duplicate(state, limits)
        
        elif action == AdsAction.ACTIVATE:
            return await self._validate_activate(state, limits)
        
        elif action == AdsAction.CHANGE_AUDIENCE:
            return await self._validate_change_audience(state, limits)
        
        # Ações sempre permitidas
        elif action in [AdsAction.KEEP_RUNNING, AdsAction.DECREASE_BUDGET, AdsAction.PAUSE]:
            return SafetyResult(allowed=True)
        
        # Default: permitir com log
        logger.warning("unknown_action_validated", action=action.name)
        return SafetyResult(allowed=True)
    
    async def _validate_increase_budget(
        self,
        state: AdsState,
        limits: Dict[str, Any]
    ) -> SafetyResult:
        """Valida aumento de budget."""
        
        # Verifica se budget já está no limite
        if state.budget_normalized > 0.8:
            return SafetyResult(
                allowed=False,
                reason="Budget já está em 80%+ do limite configurado",
                suggested_action=int(AdsAction.KEEP_RUNNING)
            )
        
        # Verifica tempo mínimo rodando
        min_days = limits['min_days_before_scale']
        if state.days_running < min_days:
            return SafetyResult(
                allowed=False,
                reason=f"Aguarde {min_days} dias antes de escalar (atual: {state.days_running} dias)",
                suggested_action=int(AdsAction.KEEP_RUNNING)
            )
        
        # Verifica ROAS mínimo
        min_roas = limits['min_roas_to_scale']
        if state.current_roas < min_roas:
            return SafetyResult(
                allowed=False,
                reason=f"ROAS atual ({state.current_roas:.2f}x) abaixo do mínimo ({min_roas}x) para escalar",
                suggested_action=int(AdsAction.KEEP_RUNNING)
            )
        
        # Verifica se está em fase de aprendizado
        if state.is_learning:
            return SafetyResult(
                allowed=False,
                reason="Campanha ainda em fase de aprendizado",
                suggested_action=int(AdsAction.KEEP_RUNNING)
            )
        
        # Verifica conversões mínimas
        min_conversions = limits['min_conversions_to_scale']
        if state.conversions < min_conversions:
            return SafetyResult(
                allowed=False,
                reason=f"Conversões insuficientes ({state.conversions}) para escalar (mín: {min_conversions})",
                suggested_action=int(AdsAction.KEEP_RUNNING)
            )
        
        # Budget alto requer aprovação
        if state.daily_budget > limits['max_daily_budget'] * 0.7:
            return SafetyResult(
                allowed=True,
                requires_approval=True,
                reason="Aumento de budget próximo ao limite - requer aprovação"
            )
        
        return SafetyResult(allowed=True)
    
    async def _validate_duplicate(
        self,
        state: AdsState,
        limits: Dict[str, Any]
    ) -> SafetyResult:
        """Valida duplicação de campanha."""
        
        # Verifica ROAS mínimo mais alto para duplicar
        min_roas = limits['min_roas_to_duplicate']
        if state.current_roas < min_roas:
            return SafetyResult(
                allowed=False,
                reason=f"ROAS atual ({state.current_roas:.2f}x) abaixo do mínimo ({min_roas}x) para duplicar",
                suggested_action=int(AdsAction.KEEP_RUNNING)
            )
        
        # Verifica tempo mínimo rodando
        if state.days_running < 7:
            return SafetyResult(
                allowed=False,
                reason="Campanha precisa rodar pelo menos 7 dias antes de duplicar",
                suggested_action=int(AdsAction.KEEP_RUNNING)
            )
        
        # Verifica conversões
        if state.conversions < 10:
            return SafetyResult(
                allowed=False,
                reason="Mínimo de 10 conversões necessárias para duplicar",
                suggested_action=int(AdsAction.KEEP_RUNNING)
            )
        
        # Duplicação sempre requer aprovação
        return SafetyResult(
            allowed=True,
            requires_approval=True,
            reason="Duplicação de campanha requer aprovação"
        )
    
    async def _validate_activate(
        self,
        state: AdsState,
        limits: Dict[str, Any]
    ) -> SafetyResult:
        """Valida ativação de campanha pausada."""
        
        # Verifica histórico
        if state.historical_roas_avg < 1:
            return SafetyResult(
                allowed=False,
                reason=f"ROAS histórico ({state.historical_roas_avg:.2f}x) muito baixo para reativar",
                suggested_action=int(AdsAction.KEEP_RUNNING)
            )
        
        # Se estava pausada por muito tempo
        if state.hours_since_update > 168:  # > 7 dias
            return SafetyResult(
                allowed=True,
                requires_approval=True,
                reason="Campanha pausada há mais de 7 dias - requer aprovação"
            )
        
        return SafetyResult(allowed=True)
    
    async def _validate_change_audience(
        self,
        state: AdsState,
        limits: Dict[str, Any]
    ) -> SafetyResult:
        """Valida mudança de público."""
        
        # Se ROAS está bom, não mudar
        if state.current_roas > 2:
            return SafetyResult(
                allowed=False,
                reason="ROAS está bom, não recomendado mudar público",
                suggested_action=int(AdsAction.KEEP_RUNNING)
            )
        
        return SafetyResult(allowed=True)


class SDRSafetyGuard:
    """
    Valida ações do SDR Agent.
    
    Protege contra:
    - Escalações desnecessárias
    - Mensagens em horários inadequados
    - Spam de mensagens
    """
    
    DEFAULT_LIMITS = {
        'max_messages_per_hour': 10,       # Max mensagens por hora para um lead
        'min_score_to_schedule': 50,       # Score mínimo para propor agendamento
        'min_messages_before_offer': 3,    # Mensagens antes de oferecer desconto
        'allowed_hours_start': 8,          # Início horário permitido
        'allowed_hours_end': 21,           # Fim horário permitido
    }
    
    async def validate_action(
        self,
        state: SDRState,
        action: SDRAction,
        tenant_id: str
    ) -> SafetyResult:
        """Valida se uma ação do SDR pode ser executada."""
        
        # Validação por tipo de ação
        if action == SDRAction.SCHEDULE:
            return self._validate_schedule(state)
        
        elif action == SDRAction.ESCALATE:
            return self._validate_escalate(state)
        
        elif action == SDRAction.OFFER_DISCOUNT:
            return self._validate_offer_discount(state)
        
        # Default: permitir
        return SafetyResult(allowed=True)
    
    def _validate_schedule(self, state: SDRState) -> SafetyResult:
        """Valida proposta de agendamento."""
        
        min_score = self.DEFAULT_LIMITS['min_score_to_schedule']
        if state.lead_score < min_score:
            return SafetyResult(
                allowed=False,
                reason=f"Score do lead ({state.lead_score:.0f}) abaixo do mínimo ({min_score}) para agendar",
                suggested_action=int(SDRAction.QUALIFY)
            )
        
        # Se tem objeção pendente
        if state.has_objection:
            return SafetyResult(
                allowed=False,
                reason="Trate a objeção antes de propor agendamento",
                suggested_action=int(SDRAction.HANDLE_OBJECTION)
            )
        
        return SafetyResult(allowed=True)
    
    def _validate_escalate(self, state: SDRState) -> SafetyResult:
        """Valida escalação para humano."""
        
        # Não escalar lead muito frio
        if state.lead_score < 30 and state.num_messages < 5:
            return SafetyResult(
                allowed=False,
                reason="Lead ainda não qualificado para escalação",
                suggested_action=int(SDRAction.QUALIFY)
            )
        
        return SafetyResult(allowed=True)
    
    def _validate_offer_discount(self, state: SDRState) -> SafetyResult:
        """Valida oferta de desconto."""
        
        min_messages = self.DEFAULT_LIMITS['min_messages_before_offer']
        if state.num_messages < min_messages:
            return SafetyResult(
                allowed=False,
                reason=f"Aguarde pelo menos {min_messages} interações antes de oferecer desconto",
                suggested_action=int(SDRAction.RESPOND_NORMAL)
            )
        
        return SafetyResult(allowed=True)


# Singletons
ads_safety_guard = AdsSafetyGuard()
sdr_safety_guard = SDRSafetyGuard()


def get_ads_safety_guard() -> AdsSafetyGuard:
    """Retorna instância singleton do guard de Ads."""
    return ads_safety_guard


def get_sdr_safety_guard() -> SDRSafetyGuard:
    """Retorna instância singleton do guard de SDR."""
    return sdr_safety_guard
