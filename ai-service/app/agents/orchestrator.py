"""
Agente Orquestrador para criação de campanhas no Meta Ads.

Este agente usa LangChain com OpenAI Functions para executar
ações de forma autônoma, integrando RAG para conhecimento contextual
e Guardrails para validação de ações.
"""

import json
import structlog
from typing import Optional, Dict, Any, List

from langchain_classic.agents import AgentExecutor, create_openai_functions_agent
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage

from app.config import get_settings
from .prompts import ORCHESTRATOR_SYSTEM_PROMPT, ORCHESTRATOR_SYSTEM_PROMPT_WITH_CONTEXT
from .tools import (
    # Meta Ads Tools
    create_meta_campaign,
    create_meta_adset,
    create_meta_ad,
    upload_creative_to_meta,
    get_meta_campaign_status,
    # Meta Ads Insights Tools (para consultar dados do Meta)
    get_ad_account_insights,
    get_campaigns_insights,
    get_campaign_detailed_insights,
    find_ad_account_by_platform_id,
    list_ad_accounts,
    # Database Tools
    get_tenant_config,
    list_available_creatives,
    list_available_copies,
    get_creative_by_id,
    get_copy_by_id,
    save_campaign_to_database,
    update_creative_status,
    update_copy_status,
    list_ad_campaigns,
    sync_and_list_campaigns,
)
from .guardrails_engine import get_guardrails_engine, GuardrailActionType
from app.rag.ads_knowledge import get_ads_knowledge_service
from app.learning.ads_pattern_analyzer import get_ads_pattern_analyzer

logger = structlog.get_logger()


class AdsOrchestratorAgent:
    """
    Agente de IA para gerenciamento autônomo de campanhas de anúncios.
    
    Integra:
    - LangChain com OpenAI Functions para execução autônoma
    - RAG para conhecimento contextual e melhores práticas
    - Guardrails para validação e controle de ações
    - Pattern Analyzer para insights de performance
    """
    
    def __init__(self):
        settings = get_settings()
        
        if not settings.openai_api_key:
            raise ValueError("OPENAI_API_KEY não configurada")
        
        # Configura headers se tiver project_id
        extra_headers = {}
        if settings.openai_project_id:
            extra_headers["OpenAI-Project"] = settings.openai_project_id
        
        self.llm = ChatOpenAI(
            model="gpt-4o",
            temperature=0,
            api_key=settings.openai_api_key,
            default_headers=extra_headers if extra_headers else None,
        )
        
        self.tools = self._load_tools()
        self.agent = self._create_agent()
        self.chat_history: Dict[str, List] = {}  # tenant_id -> messages
        
        # Serviços integrados
        self.knowledge_service = get_ads_knowledge_service()
        self.guardrails_engine = get_guardrails_engine()
        self.pattern_analyzer = get_ads_pattern_analyzer()
        
        logger.info("AdsOrchestratorAgent initialized with RAG and Guardrails", num_tools=len(self.tools))
    
    def _load_tools(self) -> List:
        """Carrega todas as tools disponíveis."""
        return [
            # Meta Ads Tools - Criação
            create_meta_campaign,
            create_meta_adset,
            create_meta_ad,
            upload_creative_to_meta,
            get_meta_campaign_status,
            # Meta Ads Tools - Insights (consulta dados do Meta Ads)
            get_ad_account_insights,       # Métricas da conta (spend, clicks, ROAS, etc)
            get_campaigns_insights,         # Lista campanhas com métricas
            get_campaign_detailed_insights, # Detalhes de uma campanha específica
            find_ad_account_by_platform_id, # Busca conta pelo ID do Meta (ex: 1325063905938909)
            list_ad_accounts,               # Lista todas as contas conectadas
            # Database Tools
            get_tenant_config,
            list_available_creatives,
            list_available_copies,
            get_creative_by_id,
            get_copy_by_id,
            save_campaign_to_database,
            update_creative_status,
            update_copy_status,
            list_ad_campaigns,
            sync_and_list_campaigns,  # Sincroniza do Meta e lista todas as campanhas
        ]
    
    def _create_agent(self) -> AgentExecutor:
        """Cria o agente com prompt e tools."""
        prompt = ChatPromptTemplate.from_messages([
            ("system", ORCHESTRATOR_SYSTEM_PROMPT_WITH_CONTEXT),
            MessagesPlaceholder("chat_history", optional=True),
            ("human", "{input}"),
            MessagesPlaceholder("agent_scratchpad"),
        ])
        
        agent = create_openai_functions_agent(
            llm=self.llm,
            tools=self.tools,
            prompt=prompt
        )
        
        return AgentExecutor(
            agent=agent,
            tools=self.tools,
            verbose=True,
            return_intermediate_steps=True,
            handle_parsing_errors=True,
            max_iterations=15,  # Evita loops infinitos
        )
    
    def _get_chat_history(self, tenant_id: str) -> List:
        """Retorna histórico de chat do tenant."""
        return self.chat_history.get(tenant_id, [])
    
    def _add_to_history(self, tenant_id: str, human_msg: str, ai_msg: str):
        """Adiciona mensagem ao histórico."""
        if tenant_id not in self.chat_history:
            self.chat_history[tenant_id] = []
        
        self.chat_history[tenant_id].append(HumanMessage(content=human_msg))
        self.chat_history[tenant_id].append(AIMessage(content=ai_msg))
        
        # Mantém apenas últimas 10 interações (20 mensagens)
        if len(self.chat_history[tenant_id]) > 20:
            self.chat_history[tenant_id] = self.chat_history[tenant_id][-20:]
    
    def clear_history(self, tenant_id: str):
        """Limpa histórico de um tenant."""
        if tenant_id in self.chat_history:
            del self.chat_history[tenant_id]
    
    async def _get_rag_context(
        self,
        tenant_id: str,
        user_message: str,
        objective: str = None
    ) -> Dict[str, Any]:
        """
        Busca contexto do RAG para enriquecer o prompt do agente.
        
        Inclui:
        - Regras e diretrizes
        - Melhores práticas
        - Padrões de sucesso
        """
        try:
            context = await self.knowledge_service.get_context_for_agent(
                tenant_id=tenant_id,
                user_message=user_message,
                objective=objective
            )
            
            logger.info("RAG context loaded",
                tenant_id=tenant_id,
                rules_count=len(context.get('rules', [])),
                patterns_count=len(context.get('patterns', []))
            )
            
            return context
            
        except Exception as e:
            logger.error("RAG context error", error=str(e))
            return {'rules': [], 'best_practices': [], 'patterns': []}
    
    async def _check_guardrails(
        self,
        tenant_id: str,
        action: str,
        params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Verifica guardrails antes de executar uma ação.
        
        Returns:
            Dict com 'allowed', 'message', 'requires_approval'
        """
        try:
            result = await self.guardrails_engine.check_action(
                tenant_id=tenant_id,
                action=action,
                params=params
            )
            
            logger.info("Guardrails checked",
                tenant_id=tenant_id,
                action=action,
                allowed=result.allowed,
                triggered_rules=len(result.triggered_rules)
            )
            
            return {
                'allowed': result.allowed,
                'message': result.message,
                'requires_approval': result.requires_approval,
                'action_type': result.action_type.value,
                'triggered_rules': result.triggered_rules
            }
            
        except Exception as e:
            logger.error("Guardrails check error", error=str(e))
            return {
                'allowed': True,
                'message': f'Erro ao verificar guardrails: {str(e)}',
                'requires_approval': False
            }
    
    async def _get_performance_insights(
        self,
        tenant_id: str,
        objective: str = None
    ) -> Dict[str, Any]:
        """Busca insights de performance para contextualizar decisões."""
        try:
            # Busca padrões vencedores
            patterns = await self.pattern_analyzer.analyze_winning_campaigns(
                tenant_id=tenant_id,
                min_roas=1.5,
                min_conversions=3,
                days=30
            )
            
            if patterns:
                return {
                    'winning_patterns': [
                        {
                            'objective': p.objective,
                            'avg_roas': round(p.avg_roas, 2),
                            'budget_range': p.budget_range,
                            'recommendations': p.recommendations[:2]
                        }
                        for p in patterns[:3]
                    ]
                }
            
            return {'winning_patterns': []}
            
        except Exception as e:
            logger.error("Performance insights error", error=str(e))
            return {'winning_patterns': []}
    
    def _format_context_for_prompt(
        self,
        base_context: Dict[str, Any],
        rag_context: Dict[str, Any],
        guardrails_info: Dict[str, Any],
        performance_insights: Dict[str, Any]
    ) -> str:
        """Formata contexto completo para o prompt do agente."""
        context = {
            **base_context,
            'knowledge': {
                'rules': rag_context.get('rules', []),
                'best_practices': rag_context.get('best_practices', []),
                'learned_patterns': rag_context.get('patterns', [])
            },
            'guardrails_status': guardrails_info,
            'performance_insights': performance_insights
        }
        
        return json.dumps(context, indent=2, ensure_ascii=False)
    
    async def run(
        self,
        input_text: str,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Executa o agente com um comando, integrando RAG e Guardrails.
        
        Args:
            input_text: Comando em linguagem natural
            context: Contexto com tenant_id, ad_account_id, etc.
            
        Returns:
            Dict com output, steps executados e status
        """
        tenant_id = context.get('tenant_id', 'unknown')
        
        logger.info(
            "Orchestrator executing with RAG+Guardrails",
            input=input_text[:100],
            tenant_id=tenant_id
        )
        
        try:
            # 1. Busca contexto do RAG
            rag_context = await self._get_rag_context(
                tenant_id=tenant_id,
                user_message=input_text,
                objective=context.get('objective')
            )
            
            # 2. Busca insights de performance
            performance_insights = await self._get_performance_insights(
                tenant_id=tenant_id,
                objective=context.get('objective')
            )
            
            # 3. Verifica guardrails iniciais (para contexto)
            guardrails_info = await self._check_guardrails(
                tenant_id=tenant_id,
                action='general',
                params=context
            )
            
            # Se está bloqueado por guardrails, retorna imediatamente
            if not guardrails_info['allowed'] and guardrails_info.get('action_type') == 'block':
                return {
                    'success': False,
                    'blocked_by_guardrail': True,
                    'output': f"⛔ Ação bloqueada: {guardrails_info['message']}",
                    'steps': [],
                    'guardrails': guardrails_info
                }
            
            # 4. Formata contexto enriquecido para o prompt
            enriched_context = self._format_context_for_prompt(
                base_context=context,
                rag_context=rag_context,
                guardrails_info=guardrails_info,
                performance_insights=performance_insights
            )
            
            # 5. Executa o agente
            result = await self.agent.ainvoke({
                "input": input_text,
                "context": enriched_context,
                "chat_history": self._get_chat_history(tenant_id),
            })
            
            output = result.get('output', '')
            intermediate_steps = result.get('intermediate_steps', [])
            
            # 6. Formata steps para resposta
            steps = []
            for step in intermediate_steps:
                action, observation = step
                steps.append({
                    'tool': action.tool,
                    'input': action.tool_input,
                    'output': str(observation)[:500],
                })
            
            # 7. Adiciona ao histórico
            self._add_to_history(tenant_id, input_text, output)
            
            # 8. Adiciona avisos de guardrails se houver
            warnings = []
            if guardrails_info.get('action_type') == 'warn':
                warnings.append(guardrails_info['message'])
            
            logger.info(
                "Orchestrator completed",
                tenant_id=tenant_id,
                num_steps=len(steps),
                has_warnings=len(warnings) > 0
            )
            
            return {
                'success': True,
                'output': output,
                'steps': steps,
                'num_steps': len(steps),
                'warnings': warnings,
                'rag_context_used': len(rag_context.get('rules', [])) > 0,
                'patterns_found': len(performance_insights.get('winning_patterns', [])),
            }
            
        except Exception as e:
            logger.error(
                "Orchestrator failed",
                error=str(e),
                tenant_id=tenant_id
            )
            
            return {
                'success': False,
                'error': str(e),
                'output': f"❌ Erro ao executar: {str(e)}",
                'steps': [],
            }
    
    async def validate_campaign_creation(
        self,
        tenant_id: str,
        campaign_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Valida se uma campanha pode ser criada antes de executar.
        
        Útil para pre-validação na UI.
        """
        return await self._check_guardrails(
            tenant_id=tenant_id,
            action='create_campaign',
            params=campaign_data
        )
    
    async def get_recommendations_for_campaign(
        self,
        tenant_id: str,
        objective: str,
        daily_budget: float
    ) -> Dict[str, Any]:
        """
        Retorna recomendações do sistema de aprendizado para uma campanha.
        """
        try:
            # Busca padrões similares
            patterns = await self.pattern_analyzer.analyze_winning_campaigns(
                tenant_id=tenant_id,
                min_roas=1.5,
                days=60
            )
            
            # Filtra por objetivo
            relevant_patterns = [p for p in patterns if p.objective == objective]
            
            # Busca conhecimento relevante
            knowledge = await self.knowledge_service.search_ads_rules(
                query=f"campanha {objective} orçamento {daily_budget}",
                tenant_id=tenant_id,
                top_k=3
            )
            
            recommendations = []
            
            # Recomendações de padrões
            for pattern in relevant_patterns[:3]:
                recommendations.extend(pattern.recommendations)
            
            # Recomendações de conhecimento
            for item in knowledge:
                if item.category == 'best_practices':
                    recommendations.append(item.content[:200])
            
            return {
                'success': True,
                'recommendations': list(set(recommendations))[:5],
                'patterns_found': len(relevant_patterns),
                'suggested_budget_range': relevant_patterns[0].budget_range if relevant_patterns else None
            }
            
        except Exception as e:
            logger.error("Get recommendations error", error=str(e))
            return {
                'success': False,
                'recommendations': [],
                'error': str(e)
            }
    
    async def create_campaign_from_briefing(
        self,
        briefing: Dict[str, Any],
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Cria campanha completa a partir de um briefing estruturado.
        
        Valida com guardrails antes de criar.
        """
        tenant_id = context.get('tenant_id')
        
        # Pre-validação com guardrails
        validation = await self._check_guardrails(
            tenant_id=tenant_id,
            action='create_campaign',
            params={
                'daily_budget': briefing.get('daily_budget', 50),
                'objective': briefing.get('objective', 'OUTCOME_SALES')
            }
        )
        
        if not validation['allowed']:
            if validation.get('requires_approval'):
                return {
                    'success': False,
                    'requires_approval': True,
                    'approval_reason': validation['message'],
                    'output': f"⚠️ Esta ação requer aprovação: {validation['message']}"
                }
            else:
                return {
                    'success': False,
                    'blocked_by_guardrail': True,
                    'output': f"⛔ Bloqueado: {validation['message']}"
                }
        
        # Monta comando para o agente com contexto de recomendações
        recommendations = await self.get_recommendations_for_campaign(
            tenant_id=tenant_id,
            objective=briefing.get('objective', 'OUTCOME_SALES'),
            daily_budget=briefing.get('daily_budget', 50)
        )
        
        rec_text = ""
        if recommendations.get('recommendations'):
            rec_text = "\n📊 **Recomendações do Sistema:**\n" + "\n".join(
                f"- {r}" for r in recommendations['recommendations'][:3]
            )
        
        command = f"""
Crie uma campanha completa no Meta Ads com as seguintes configurações:

📋 **Briefing da Campanha**
- Nome: {briefing.get('campaign_name', 'Nova Campanha')}
- Objetivo: {briefing.get('objective', 'OUTCOME_SALES')}
- Orçamento diário: R$ {briefing.get('daily_budget', 50)}/dia

🎨 **Criativo**
- ID do Criativo: {briefing.get('creative_id', 'usar disponível')}

📝 **Copy**
- ID da Copy: {briefing.get('copy_id', 'usar disponível')}

🎯 **Segmentação**
- Localização: Brasil
- Idade: 18-65
- Gênero: Todos
{rec_text}

Execute todas as etapas necessárias para criar a campanha completa.
"""
        
        return await self.run(command, context)


# Instância global do agente
_orchestrator_agent: Optional[AdsOrchestratorAgent] = None


def get_orchestrator_agent() -> AdsOrchestratorAgent:
    """Retorna instância singleton do agente orquestrador."""
    global _orchestrator_agent
    
    if _orchestrator_agent is None:
        _orchestrator_agent = AdsOrchestratorAgent()
    
    return _orchestrator_agent


def reset_orchestrator_agent():
    """Reinicia o agente (útil para testes)."""
    global _orchestrator_agent
    _orchestrator_agent = None
