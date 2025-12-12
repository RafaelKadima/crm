"""
BI Agent MCP Tools
==================

20+ ferramentas para o Agente de Business Intelligence:
- Análise de Dados
- Predições ML
- Coordenação de Agentes
- Geração de Conhecimento
- Relatórios
"""

from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import json
import asyncio

# Simulação de decorador MCP (será substituído pela implementação real)
class MCPToolRegistry:
    tools = []
    
    @classmethod
    def tool(cls):
        def decorator(func):
            cls.tools.append(func)
            return func
        return decorator

mcp = MCPToolRegistry()


# ============================================================================
# ANÁLISE DE DADOS
# ============================================================================

@mcp.tool()
async def run_daily_analysis(tenant_id: str) -> dict:
    """
    Executa análise completa do dia para um tenant.
    
    Coleta métricas de todas as áreas (vendas, suporte, marketing, financeiro),
    detecta anomalias, gera insights e sugere ações.
    
    Args:
        tenant_id: ID do tenant
        
    Returns:
        Resultado completo da análise diária
    """
    from bi_agent.agent import BIAgent
    
    agent = BIAgent(tenant_id)
    result = await agent.run_daily_cycle()
    
    return {
        "status": "completed",
        "analysis_id": result.get("id"),
        "summary": {
            "metrics_collected": result.get("metrics_count", 0),
            "anomalies_detected": len(result.get("anomalies", [])),
            "insights_generated": len(result.get("insights", [])),
            "actions_suggested": len(result.get("actions", [])),
        },
        "execution_time_ms": result.get("execution_time_ms"),
    }


@mcp.tool()
async def analyze_sales_funnel(
    tenant_id: str,
    period: str = "30d",
    pipeline_id: Optional[str] = None
) -> dict:
    """
    Analisa funil de vendas com gargalos e oportunidades.
    
    Args:
        tenant_id: ID do tenant
        period: Período de análise (7d, 30d, 90d)
        pipeline_id: ID do pipeline específico (opcional)
        
    Returns:
        Análise completa do funil de vendas
    """
    from bi_agent.analyzer import DataAnalyzer
    
    analyzer = DataAnalyzer(tenant_id)
    result = await analyzer.analyze_sales_funnel(period, pipeline_id)
    
    return {
        "period": period,
        "total_leads": result.get("total_leads", 0),
        "stages": result.get("stages", []),
        "bottleneck": result.get("bottleneck"),
        "conversion_rate": result.get("conversion_rate", 0),
        "avg_time_per_stage": result.get("avg_time_per_stage", {}),
        "conversion_by_channel": result.get("conversion_by_channel", {}),
        "recommendations": result.get("recommendations", []),
        "trends": result.get("trends", {}),
    }


@mcp.tool()
async def analyze_support_metrics(
    tenant_id: str,
    period: str = "30d"
) -> dict:
    """
    Analisa métricas de atendimento/suporte.
    
    Args:
        tenant_id: ID do tenant
        period: Período de análise
        
    Returns:
        Análise de métricas de suporte
    """
    from bi_agent.analyzer import DataAnalyzer
    
    analyzer = DataAnalyzer(tenant_id)
    result = await analyzer.analyze_support_metrics(period)
    
    return {
        "period": period,
        "total_tickets": result.get("total_tickets", 0),
        "avg_response_time_minutes": result.get("avg_response_time", 0),
        "avg_resolution_time_hours": result.get("avg_resolution_time", 0),
        "first_contact_resolution_rate": result.get("fcr_rate", 0),
        "satisfaction_score": result.get("satisfaction_score"),
        "tickets_by_channel": result.get("by_channel", {}),
        "busiest_hours": result.get("busiest_hours", []),
        "agent_performance": result.get("agent_performance", []),
        "sla_compliance": result.get("sla_compliance", 0),
        "recommendations": result.get("recommendations", []),
    }


@mcp.tool()
async def analyze_marketing_performance(
    tenant_id: str,
    period: str = "30d"
) -> dict:
    """
    Analisa performance de marketing e ads.
    
    Args:
        tenant_id: ID do tenant
        period: Período de análise
        
    Returns:
        Análise de performance de marketing
    """
    from bi_agent.analyzer import DataAnalyzer
    
    analyzer = DataAnalyzer(tenant_id)
    result = await analyzer.analyze_marketing_performance(period)
    
    return {
        "period": period,
        "total_spend": result.get("total_spend", 0),
        "total_leads": result.get("total_leads", 0),
        "cpl": result.get("cpl", 0),  # Custo por Lead
        "cac": result.get("cac", 0),  # Custo de Aquisição de Cliente
        "roas": result.get("roas", 0),  # Return on Ad Spend
        "ltv": result.get("ltv", 0),  # Lifetime Value
        "campaigns": result.get("campaigns", []),
        "best_performing": result.get("best_performing"),
        "worst_performing": result.get("worst_performing"),
        "channel_performance": result.get("channel_performance", {}),
        "attribution": result.get("attribution", {}),
        "recommendations": result.get("recommendations", []),
    }


@mcp.tool()
async def analyze_financial_metrics(
    tenant_id: str,
    period: str = "30d"
) -> dict:
    """
    Analisa métricas financeiras.
    
    Args:
        tenant_id: ID do tenant
        period: Período de análise
        
    Returns:
        Análise financeira
    """
    from bi_agent.analyzer import DataAnalyzer
    
    analyzer = DataAnalyzer(tenant_id)
    result = await analyzer.analyze_financial_metrics(period)
    
    return {
        "period": period,
        "revenue": result.get("revenue", 0),
        "revenue_growth": result.get("revenue_growth", 0),
        "deals_closed": result.get("deals_closed", 0),
        "average_deal_size": result.get("avg_deal_size", 0),
        "ai_cost": result.get("ai_cost", 0),
        "roi_on_ai": result.get("roi_on_ai", 0),
        "revenue_by_channel": result.get("by_channel", {}),
        "revenue_by_product": result.get("by_product", {}),
        "forecast": result.get("forecast", {}),
        "recommendations": result.get("recommendations", []),
    }


@mcp.tool()
async def get_executive_summary(
    tenant_id: str,
    period: str = "30d"
) -> dict:
    """
    Gera resumo executivo com principais KPIs.
    
    Args:
        tenant_id: ID do tenant
        period: Período de análise
        
    Returns:
        Resumo executivo
    """
    from bi_agent.analyzer import DataAnalyzer
    
    analyzer = DataAnalyzer(tenant_id)
    result = await analyzer.get_executive_summary(period)
    
    return {
        "period": period,
        "kpis": {
            "revenue": result.get("revenue", {}),
            "leads": result.get("leads", {}),
            "conversion_rate": result.get("conversion_rate", {}),
            "ai_cost": result.get("ai_cost", {}),
            "roas": result.get("roas", {}),
        },
        "highlights": result.get("highlights", []),
        "alerts": result.get("alerts", []),
        "top_channel": result.get("top_channel"),
        "predictions": result.get("predictions", {}),
    }


# ============================================================================
# PREDIÇÕES ML
# ============================================================================

@mcp.tool()
async def predict_revenue(
    tenant_id: str,
    months_ahead: int = 3
) -> dict:
    """
    Prediz receita futura usando modelo ML.
    
    Args:
        tenant_id: ID do tenant
        months_ahead: Quantos meses à frente prever (1-12)
        
    Returns:
        Previsões de receita com confiança
    """
    from bi_agent.predictor import PredictiveEngine
    
    predictor = PredictiveEngine(tenant_id)
    result = await predictor.predict_revenue(months_ahead)
    
    return {
        "predictions": result.get("predictions", []),
        "total_predicted": result.get("total_predicted", 0),
        "confidence": result.get("confidence", 0),
        "factors": result.get("factors", []),
        "model_info": result.get("model_info", {}),
    }


@mcp.tool()
async def predict_lead_volume(
    tenant_id: str,
    days_ahead: int = 30
) -> dict:
    """
    Prediz volume de leads futuros.
    
    Args:
        tenant_id: ID do tenant
        days_ahead: Quantos dias à frente prever
        
    Returns:
        Previsões de volume de leads
    """
    from bi_agent.predictor import PredictiveEngine
    
    predictor = PredictiveEngine(tenant_id)
    result = await predictor.predict_lead_volume(days_ahead)
    
    return {
        "predictions": result.get("daily_predictions", []),
        "total_predicted": result.get("total_predicted", 0),
        "by_channel": result.get("by_channel", {}),
        "confidence": result.get("confidence", 0),
    }


@mcp.tool()
async def predict_churn_risk(tenant_id: str) -> dict:
    """
    Identifica leads/clientes com risco de churn.
    
    Args:
        tenant_id: ID do tenant
        
    Returns:
        Lista de leads com risco de churn e recomendações
    """
    from bi_agent.predictor import PredictiveEngine
    
    predictor = PredictiveEngine(tenant_id)
    result = await predictor.predict_churn_risk()
    
    return {
        "high_risk_leads": result.get("high_risk", []),
        "medium_risk_leads": result.get("medium_risk", []),
        "total_at_risk": result.get("total_at_risk", 0),
        "potential_revenue_loss": result.get("potential_loss", 0),
        "recommended_actions": result.get("recommendations", []),
    }


@mcp.tool()
async def detect_anomalies(
    tenant_id: str,
    metric: str,
    period: str = "7d"
) -> dict:
    """
    Detecta anomalias em métricas usando ML.
    
    Args:
        tenant_id: ID do tenant
        metric: Métrica a analisar (leads, revenue, response_time, etc.)
        period: Período de análise
        
    Returns:
        Anomalias detectadas
    """
    from bi_agent.predictor import PredictiveEngine
    
    predictor = PredictiveEngine(tenant_id)
    result = await predictor.detect_anomalies(metric, period)
    
    return {
        "metric": metric,
        "period": period,
        "anomalies": result.get("anomalies", []),
        "trend": result.get("trend"),
        "alert": result.get("alert"),
        "severity": result.get("severity"),
    }


@mcp.tool()
async def predict_best_contact_time(
    tenant_id: str,
    lead_id: str
) -> dict:
    """
    Prediz melhor horário para contatar um lead.
    
    Args:
        tenant_id: ID do tenant
        lead_id: ID do lead
        
    Returns:
        Horários recomendados e probabilidades
    """
    from bi_agent.predictor import PredictiveEngine
    
    predictor = PredictiveEngine(tenant_id)
    result = await predictor.predict_best_contact_time(lead_id)
    
    return {
        "lead_id": lead_id,
        "best_times": result.get("best_times", []),
        "best_day": result.get("best_day"),
        "response_probability": result.get("response_probability", {}),
    }


# ============================================================================
# COORDENAÇÃO DE AGENTES
# ============================================================================

@mcp.tool()
async def suggest_sdr_improvement(
    tenant_id: str,
    insight_type: str,
    details: dict
) -> dict:
    """
    Sugere melhoria para SDR Agent baseada em análise.
    
    Args:
        tenant_id: ID do tenant
        insight_type: Tipo do insight (script, timing, qualification, etc.)
        details: Detalhes da melhoria sugerida
        
    Returns:
        Ação criada na fila de aprovação
    """
    from bi_agent.orchestrator import AgentOrchestrator
    
    orchestrator = AgentOrchestrator(tenant_id)
    result = await orchestrator.suggest_sdr_improvement(insight_type, details)
    
    return {
        "action_id": result.get("action_id"),
        "status": "pending_approval",
        "target_agent": "sdr",
        "action_type": result.get("action_type"),
        "expected_impact": result.get("expected_impact"),
    }


@mcp.tool()
async def suggest_ads_optimization(
    tenant_id: str,
    campaign_id: Optional[str],
    optimization_type: str,
    details: dict
) -> dict:
    """
    Sugere otimização para Ads Agent.
    
    Args:
        tenant_id: ID do tenant
        campaign_id: ID da campanha (opcional)
        optimization_type: Tipo (pause, scale, budget, targeting, etc.)
        details: Detalhes da otimização
        
    Returns:
        Ação criada na fila de aprovação
    """
    from bi_agent.orchestrator import AgentOrchestrator
    
    orchestrator = AgentOrchestrator(tenant_id)
    result = await orchestrator.suggest_ads_optimization(campaign_id, optimization_type, details)
    
    return {
        "action_id": result.get("action_id"),
        "status": "pending_approval",
        "target_agent": "ads",
        "campaign_id": campaign_id,
        "action_type": result.get("action_type"),
        "expected_impact": result.get("expected_impact"),
    }


@mcp.tool()
async def create_action_for_approval(
    tenant_id: str,
    target_agent: str,
    action_type: str,
    title: str,
    description: str,
    rationale: str,
    payload: dict,
    priority: str = "medium",
    expected_impact: Optional[dict] = None
) -> dict:
    """
    Cria ação genérica na fila de aprovação.
    
    Args:
        tenant_id: ID do tenant
        target_agent: Agente alvo (sdr, ads, knowledge, ml)
        action_type: Tipo da ação
        title: Título da ação
        description: Descrição detalhada
        rationale: Justificativa/motivo
        payload: Dados para executar a ação
        priority: Prioridade (low, medium, high, critical)
        expected_impact: Impacto esperado
        
    Returns:
        Ação criada
    """
    from bi_agent.orchestrator import AgentOrchestrator
    
    orchestrator = AgentOrchestrator(tenant_id)
    result = await orchestrator.create_action(
        target_agent=target_agent,
        action_type=action_type,
        title=title,
        description=description,
        rationale=rationale,
        payload=payload,
        priority=priority,
        expected_impact=expected_impact,
    )
    
    return {
        "action_id": result.get("action_id"),
        "status": "pending_approval",
        "created_at": result.get("created_at"),
    }


@mcp.tool()
async def get_pending_actions(
    tenant_id: str,
    target_agent: Optional[str] = None,
    priority: Optional[str] = None
) -> dict:
    """
    Lista ações pendentes de aprovação.
    
    Args:
        tenant_id: ID do tenant
        target_agent: Filtrar por agente (opcional)
        priority: Filtrar por prioridade (opcional)
        
    Returns:
        Lista de ações pendentes
    """
    from bi_agent.orchestrator import AgentOrchestrator
    
    orchestrator = AgentOrchestrator(tenant_id)
    result = await orchestrator.get_pending_actions(target_agent, priority)
    
    return {
        "total": len(result),
        "by_priority": result.get("by_priority", {}),
        "actions": result.get("actions", []),
    }


@mcp.tool()
async def execute_approved_action(
    tenant_id: str,
    action_id: str
) -> dict:
    """
    Executa uma ação que foi aprovada.
    
    Args:
        tenant_id: ID do tenant
        action_id: ID da ação aprovada
        
    Returns:
        Resultado da execução
    """
    from bi_agent.orchestrator import AgentOrchestrator
    
    orchestrator = AgentOrchestrator(tenant_id)
    result = await orchestrator.execute_action(action_id)
    
    return {
        "action_id": action_id,
        "status": result.get("status"),
        "result": result.get("result"),
        "executed_at": result.get("executed_at"),
    }


# ============================================================================
# GERAÇÃO DE CONHECIMENTO
# ============================================================================

@mcp.tool()
async def generate_insight(
    tenant_id: str,
    category: str,
    data: dict
) -> dict:
    """
    Gera insight a partir de dados analisados.
    
    Args:
        tenant_id: ID do tenant
        category: Categoria (sales, support, marketing, financial)
        data: Dados para gerar insight
        
    Returns:
        Insight gerado
    """
    from bi_agent.knowledge_writer import KnowledgeWriter
    
    writer = KnowledgeWriter(tenant_id)
    result = await writer.generate_insight(category, data)
    
    return {
        "knowledge_id": result.get("id"),
        "type": result.get("type"),
        "title": result.get("title"),
        "content": result.get("content"),
        "confidence": result.get("confidence"),
    }


@mcp.tool()
async def add_to_knowledge_base(
    tenant_id: str,
    content: str,
    knowledge_type: str,
    category: str,
    title: str,
    confidence: float = 0.7
) -> dict:
    """
    Adiciona conhecimento gerado ao RAG.
    
    Args:
        tenant_id: ID do tenant
        content: Conteúdo do conhecimento
        knowledge_type: Tipo (insight, pattern, best_practice, warning)
        category: Categoria
        title: Título
        confidence: Nível de confiança (0-1)
        
    Returns:
        Confirmação de adição ao RAG
    """
    from bi_agent.knowledge_writer import KnowledgeWriter
    
    writer = KnowledgeWriter(tenant_id)
    result = await writer.add_to_rag(
        content=content,
        knowledge_type=knowledge_type,
        category=category,
        title=title,
        confidence=confidence,
    )
    
    return {
        "knowledge_id": result.get("knowledge_id"),
        "rag_entry_id": result.get("rag_entry_id"),
        "status": "added_to_rag",
    }


@mcp.tool()
async def prepare_training_data(
    tenant_id: str,
    model_type: str
) -> dict:
    """
    Prepara dados para treinamento de modelo ML.
    
    Args:
        tenant_id: ID do tenant
        model_type: Tipo do modelo (lead_score, campaign_predictor, etc.)
        
    Returns:
        Dados preparados para treinamento
    """
    from bi_agent.knowledge_writer import KnowledgeWriter
    
    writer = KnowledgeWriter(tenant_id)
    result = await writer.prepare_training_data(model_type)
    
    return {
        "model_type": model_type,
        "samples_prepared": result.get("samples_count", 0),
        "features": result.get("features", []),
        "ready_for_training": result.get("ready", False),
        "data_path": result.get("data_path"),
    }


@mcp.tool()
async def get_knowledge_stats(tenant_id: str) -> dict:
    """
    Retorna estatísticas do conhecimento gerado.
    
    Args:
        tenant_id: ID do tenant
        
    Returns:
        Estatísticas do conhecimento
    """
    from bi_agent.knowledge_writer import KnowledgeWriter
    
    writer = KnowledgeWriter(tenant_id)
    result = await writer.get_stats()
    
    return {
        "total_knowledge": result.get("total", 0),
        "by_type": result.get("by_type", {}),
        "by_category": result.get("by_category", {}),
        "added_to_rag": result.get("in_rag", 0),
        "used_for_training": result.get("for_training", 0),
        "avg_confidence": result.get("avg_confidence", 0),
    }


# ============================================================================
# RELATÓRIOS
# ============================================================================

@mcp.tool()
async def generate_executive_report(
    tenant_id: str,
    period: str = "30d",
    format: str = "json"
) -> dict:
    """
    Gera relatório executivo completo.
    
    Args:
        tenant_id: ID do tenant
        period: Período do relatório
        format: Formato (json, pdf, excel)
        
    Returns:
        Relatório executivo
    """
    from bi_agent.report_generator import ReportGenerator
    
    generator = ReportGenerator(tenant_id)
    result = await generator.generate_executive_report(period, format)
    
    return result


@mcp.tool()
async def generate_sales_report(
    tenant_id: str,
    period: str = "30d",
    format: str = "json"
) -> dict:
    """
    Gera relatório de vendas/funil.
    
    Args:
        tenant_id: ID do tenant
        period: Período do relatório
        format: Formato (json, pdf, excel)
        
    Returns:
        Relatório de vendas
    """
    from bi_agent.report_generator import ReportGenerator
    
    generator = ReportGenerator(tenant_id)
    result = await generator.generate_sales_report(period, format)
    
    return result


@mcp.tool()
async def generate_marketing_report(
    tenant_id: str,
    period: str = "30d",
    format: str = "json"
) -> dict:
    """
    Gera relatório de marketing/ads.
    
    Args:
        tenant_id: ID do tenant
        period: Período do relatório
        format: Formato (json, pdf, excel)
        
    Returns:
        Relatório de marketing
    """
    from bi_agent.report_generator import ReportGenerator
    
    generator = ReportGenerator(tenant_id)
    result = await generator.generate_marketing_report(period, format)
    
    return result


@mcp.tool()
async def generate_ai_performance_report(
    tenant_id: str,
    period: str = "30d"
) -> dict:
    """
    Gera relatório de performance dos agentes IA.
    
    Args:
        tenant_id: ID do tenant
        period: Período do relatório
        
    Returns:
        Relatório de performance IA
    """
    from bi_agent.report_generator import ReportGenerator
    
    generator = ReportGenerator(tenant_id)
    result = await generator.generate_ai_performance_report(period)
    
    return {
        "period": period,
        "sdr_agent": result.get("sdr", {}),
        "ads_agent": result.get("ads", {}),
        "bi_agent": result.get("bi", {}),
        "overall_accuracy": result.get("overall_accuracy", 0),
        "total_decisions": result.get("total_decisions", 0),
        "overrides": result.get("overrides", {}),
        "learning_progress": result.get("learning_progress", {}),
    }


@mcp.tool()
async def export_report_pdf(
    tenant_id: str,
    report_type: str,
    period: str = "30d"
) -> dict:
    """
    Exporta relatório em PDF.
    
    Args:
        tenant_id: ID do tenant
        report_type: Tipo (executive, sales, marketing, support, financial)
        period: Período
        
    Returns:
        URL do PDF gerado
    """
    from bi_agent.report_generator import ReportGenerator
    
    generator = ReportGenerator(tenant_id)
    result = await generator.export_pdf(report_type, period)
    
    return {
        "report_type": report_type,
        "period": period,
        "pdf_url": result.get("url"),
        "file_size_kb": result.get("size_kb"),
        "generated_at": result.get("generated_at"),
    }


@mcp.tool()
async def export_report_excel(
    tenant_id: str,
    data_type: str,
    period: str = "30d",
    filters: Optional[dict] = None
) -> dict:
    """
    Exporta dados em Excel.
    
    Args:
        tenant_id: ID do tenant
        data_type: Tipo de dados (leads, campaigns, tickets, etc.)
        period: Período
        filters: Filtros adicionais
        
    Returns:
        URL do Excel gerado
    """
    from bi_agent.report_generator import ReportGenerator
    
    generator = ReportGenerator(tenant_id)
    result = await generator.export_excel(data_type, period, filters)
    
    return {
        "data_type": data_type,
        "period": period,
        "excel_url": result.get("url"),
        "rows_exported": result.get("rows"),
        "file_size_kb": result.get("size_kb"),
        "generated_at": result.get("generated_at"),
    }


@mcp.tool()
async def get_report_api_data(
    tenant_id: str,
    endpoint: str,
    params: Optional[dict] = None
) -> dict:
    """
    Retorna dados formatados para API de integração externa.
    
    Args:
        tenant_id: ID do tenant
        endpoint: Endpoint virtual (kpis, funnel, campaigns, etc.)
        params: Parâmetros adicionais
        
    Returns:
        Dados formatados para API
    """
    from bi_agent.report_generator import ReportGenerator
    
    generator = ReportGenerator(tenant_id)
    result = await generator.get_api_data(endpoint, params or {})
    
    return {
        "endpoint": endpoint,
        "data": result.get("data"),
        "metadata": {
            "generated_at": result.get("generated_at"),
            "cache_ttl": result.get("cache_ttl", 300),
        }
    }


# ============================================================================
# CHAT / ANALISTA VIRTUAL
# ============================================================================

@mcp.tool()
async def ask_analyst(
    tenant_id: str,
    question: str,
    period: str = "30d",
    ad_account_id: Optional[str] = None,
    context: Optional[dict] = None
) -> dict:
    """
    Faz uma pergunta ao analista de BI virtual.
    
    Args:
        tenant_id: ID do tenant
        question: Pergunta em linguagem natural
        period: Período de análise (7d, 30d, 90d, this_month, last_month, ou datas customizadas)
        ad_account_id: ID da conta de anúncios específica (opcional, None = todas)
        context: Contexto adicional
        
    Returns:
        Resposta do analista com dados de suporte
    """
    from bi_agent.agent import BIAgent
    
    # Monta contexto completo com filtros
    full_context = context or {}
    full_context["period"] = period
    full_context["ad_account_id"] = ad_account_id
    
    agent = BIAgent(tenant_id, ad_account_id=ad_account_id)
    result = await agent.answer_question(question, full_context)
    
    return {
        "question": question,
        "answer": result.get("answer"),
        "supporting_data": result.get("data", {}),
        "visualizations": result.get("visualizations", []),
        "suggested_actions": result.get("actions", []),
        "related_questions": result.get("related", []),
        "filters_applied": {
            "period": period,
            "ad_account_id": ad_account_id,
        }
    }


@mcp.tool()
async def get_proactive_insights(tenant_id: str) -> dict:
    """
    Obtém insights proativos que o BI Agent identificou.
    
    Args:
        tenant_id: ID do tenant
        
    Returns:
        Lista de insights proativos
    """
    from bi_agent.agent import BIAgent
    
    agent = BIAgent(tenant_id)
    result = await agent.get_proactive_insights()
    
    return {
        "insights": result.get("insights", []),
        "alerts": result.get("alerts", []),
        "opportunities": result.get("opportunities", []),
        "last_analysis": result.get("last_analysis"),
    }


# Exporta lista de ferramentas para registro no MCP Server
BI_TOOLS = [
    # Análise
    run_daily_analysis,
    analyze_sales_funnel,
    analyze_support_metrics,
    analyze_marketing_performance,
    analyze_financial_metrics,
    get_executive_summary,
    # Predições
    predict_revenue,
    predict_lead_volume,
    predict_churn_risk,
    detect_anomalies,
    predict_best_contact_time,
    # Coordenação
    suggest_sdr_improvement,
    suggest_ads_optimization,
    create_action_for_approval,
    get_pending_actions,
    execute_approved_action,
    # Conhecimento
    generate_insight,
    add_to_knowledge_base,
    prepare_training_data,
    get_knowledge_stats,
    # Relatórios
    generate_executive_report,
    generate_sales_report,
    generate_marketing_report,
    generate_ai_performance_report,
    export_report_pdf,
    export_report_excel,
    get_report_api_data,
    # Chat
    ask_analyst,
    get_proactive_insights,
]


def register_tools(server) -> None:
    """Registra todas as ferramentas de BI no servidor MCP."""
    from mcp.server import ToolParameter
    
    # =====================================================
    # ANÁLISE DE DADOS
    # =====================================================
    server.register_tool(
        name="run_daily_analysis",
        description="Executa análise completa do dia. Coleta métricas, detecta anomalias, gera insights e sugere ações.",
        parameters=[
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
        ],
        handler=run_daily_analysis,
        category="bi"
    )
    
    server.register_tool(
        name="analyze_sales_funnel",
        description="Analisa funil de vendas com gargalos e oportunidades de melhoria.",
        parameters=[
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="period", type="string", description="Período: 7d, 30d, 90d", required=False, default="30d"),
            ToolParameter(name="pipeline_id", type="string", description="ID do pipeline (opcional)", required=False),
        ],
        handler=analyze_sales_funnel,
        category="bi"
    )
    
    server.register_tool(
        name="analyze_support_metrics",
        description="Analisa métricas de atendimento: tempo de resposta, SLA, satisfação.",
        parameters=[
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="period", type="string", description="Período: 7d, 30d, 90d", required=False, default="30d"),
        ],
        handler=analyze_support_metrics,
        category="bi"
    )
    
    server.register_tool(
        name="analyze_marketing_performance",
        description="Analisa performance de marketing: ROAS, CPL, atribuição por canal.",
        parameters=[
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="period", type="string", description="Período: 7d, 30d, 90d", required=False, default="30d"),
        ],
        handler=analyze_marketing_performance,
        category="bi"
    )
    
    server.register_tool(
        name="get_executive_summary",
        description="Gera resumo executivo com KPIs, alertas e recomendações.",
        parameters=[
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="period", type="string", description="Período: 7d, 30d, 90d", required=False, default="30d"),
        ],
        handler=get_executive_summary,
        category="bi"
    )
    
    # =====================================================
    # PREDIÇÕES ML
    # =====================================================
    server.register_tool(
        name="predict_revenue",
        description="Prediz receita para os próximos meses usando modelos ML.",
        parameters=[
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="months", type="number", description="Quantidade de meses para prever", required=False, default=3),
        ],
        handler=predict_revenue,
        category="bi"
    )
    
    server.register_tool(
        name="predict_lead_volume",
        description="Prediz volume de leads esperado.",
        parameters=[
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="days", type="number", description="Dias para prever", required=False, default=7),
        ],
        handler=predict_lead_volume,
        category="bi"
    )
    
    server.register_tool(
        name="predict_churn_risk",
        description="Identifica leads/clientes com risco de churn.",
        parameters=[
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
        ],
        handler=predict_churn_risk,
        category="bi"
    )
    
    server.register_tool(
        name="detect_anomalies",
        description="Detecta anomalias em métricas específicas.",
        parameters=[
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="metric", type="string", description="Métrica para analisar: conversion_rate, response_time, roas, etc"),
        ],
        handler=detect_anomalies,
        category="bi"
    )
    
    # =====================================================
    # COORDENAÇÃO DE AGENTES
    # =====================================================
    server.register_tool(
        name="suggest_sdr_improvement",
        description="Sugere melhoria para o agente SDR baseado em análise.",
        parameters=[
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="insight", type="object", description="Insight que gerou a sugestão"),
        ],
        handler=suggest_sdr_improvement,
        category="bi"
    )
    
    server.register_tool(
        name="suggest_ads_optimization",
        description="Sugere otimização para o agente de Ads baseado em análise.",
        parameters=[
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="insight", type="object", description="Insight que gerou a sugestão"),
        ],
        handler=suggest_ads_optimization,
        category="bi"
    )
    
    server.register_tool(
        name="create_action_for_approval",
        description="Cria ação na fila de aprovação do admin.",
        parameters=[
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="target_agent", type="string", description="Agente alvo: sdr, ads, knowledge"),
            ToolParameter(name="action_type", type="string", description="Tipo de ação"),
            ToolParameter(name="title", type="string", description="Título da ação"),
            ToolParameter(name="description", type="string", description="Descrição detalhada"),
            ToolParameter(name="rationale", type="string", description="Justificativa"),
            ToolParameter(name="payload", type="object", description="Dados para executar a ação"),
            ToolParameter(name="priority", type="string", description="Prioridade: low, medium, high, critical", required=False, default="medium"),
            ToolParameter(name="expected_impact", type="object", description="Impacto esperado", required=False),
        ],
        handler=create_action_for_approval,
        category="bi"
    )
    
    # =====================================================
    # GERAÇÃO DE CONHECIMENTO
    # =====================================================
    server.register_tool(
        name="generate_insight",
        description="Gera insight a partir de dados analisados.",
        parameters=[
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="category", type="string", description="Categoria: sales, support, marketing"),
            ToolParameter(name="data", type="object", description="Dados que suportam o insight"),
        ],
        handler=generate_insight,
        category="bi"
    )
    
    server.register_tool(
        name="add_to_knowledge_base",
        description="Adiciona conhecimento gerado ao RAG.",
        parameters=[
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="content", type="string", description="Conteúdo do conhecimento"),
            ToolParameter(name="knowledge_type", type="string", description="Tipo: insight, pattern, best_practice, warning"),
            ToolParameter(name="category", type="string", description="Categoria: sales, support, marketing"),
            ToolParameter(name="title", type="string", description="Título", required=False),
            ToolParameter(name="confidence", type="number", description="Confiança (0-1)", required=False, default=0.7),
        ],
        handler=add_to_knowledge_base,
        category="bi"
    )
    
    # =====================================================
    # RELATÓRIOS
    # =====================================================
    server.register_tool(
        name="generate_executive_report",
        description="Gera relatório executivo completo.",
        parameters=[
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="period", type="string", description="Período: 7d, 30d, 90d", required=False, default="30d"),
        ],
        handler=generate_executive_report,
        category="bi"
    )
    
    server.register_tool(
        name="export_report_pdf",
        description="Exporta relatório em PDF.",
        parameters=[
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="report_type", type="string", description="Tipo: executive, sales, marketing, support"),
            ToolParameter(name="period", type="string", description="Período", required=False, default="30d"),
        ],
        handler=export_report_pdf,
        category="bi"
    )
    
    server.register_tool(
        name="export_report_excel",
        description="Exporta dados em Excel.",
        parameters=[
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="data_type", type="string", description="Tipo de dados: leads, campaigns, tickets"),
            ToolParameter(name="period", type="string", description="Período", required=False, default="30d"),
        ],
        handler=export_report_excel,
        category="bi"
    )
    
    # =====================================================
    # CHAT COM ANALISTA
    # =====================================================
    server.register_tool(
        name="ask_analyst",
        description="Faz pergunta ao analista de BI. Responde sobre métricas, tendências e recomendações.",
        parameters=[
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
            ToolParameter(name="question", type="string", description="Pergunta do usuário"),
            ToolParameter(name="period", type="string", description="Período: 7d, 30d, 90d, this_month, last_month", required=False, default="30d"),
            ToolParameter(name="ad_account_id", type="string", description="ID da conta de anúncios (null = todas)", required=False),
            ToolParameter(name="context", type="object", description="Contexto adicional", required=False),
        ],
        handler=ask_analyst,
        category="bi"
    )
    
    server.register_tool(
        name="get_proactive_insights",
        description="Obtém insights proativos gerados pelo BI Agent.",
        parameters=[
            ToolParameter(name="tenant_id", type="string", description="ID do tenant"),
        ],
        handler=get_proactive_insights,
        category="bi"
    )

