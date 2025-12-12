"""
BI Agent - Agente Principal de Business Intelligence
=====================================================

Coordena todas as operações de análise, predição e sugestão de ações.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List

from .analyzer import DataAnalyzer
from .predictor import PredictiveEngine
from .orchestrator import AgentOrchestrator
from .knowledge_writer import KnowledgeWriter
from .report_generator import ReportGenerator

logger = logging.getLogger(__name__)


class BIAgent:
    """
    Agente Autônomo de Business Intelligence
    
    Responsabilidades:
    1. Analisar dados periodicamente
    2. Gerar predições com ML
    3. Detectar anomalias
    4. Sugerir ações para SDR e Ads
    5. Alimentar Knowledge Base
    6. Preparar dados para ML training
    """
    
    def __init__(self, tenant_id: str, ad_account_id: Optional[str] = None):
        self.tenant_id = tenant_id
        self.ad_account_id = ad_account_id  # Filtro opcional para conta de anúncios
        self.analyzer = DataAnalyzer(tenant_id, ad_account_id=ad_account_id)
        self.predictor = PredictiveEngine(tenant_id)
        self.orchestrator = AgentOrchestrator(tenant_id)
        self.knowledge_writer = KnowledgeWriter(tenant_id)
        self.report_generator = ReportGenerator(tenant_id)
        
    async def run_daily_cycle(self) -> Dict[str, Any]:
        """
        Ciclo diário de análise autônoma.
        
        Este é o método principal que executa toda a análise do dia.
        """
        start_time = datetime.now()
        logger.info(f"[BI Agent] Iniciando ciclo diário para tenant {self.tenant_id}")
        
        try:
            # 1. Coleta métricas de todas as áreas
            metrics = await self._collect_all_metrics()
            logger.info(f"[BI Agent] Métricas coletadas: {len(metrics)} pontos de dados")
            
            # 2. Gera predições
            predictions = await self._generate_predictions(metrics)
            logger.info(f"[BI Agent] Predições geradas: {len(predictions)}")
            
            # 3. Detecta anomalias
            anomalies = await self._detect_all_anomalies(metrics)
            logger.info(f"[BI Agent] Anomalias detectadas: {len(anomalies)}")
            
            # 4. Gera insights
            insights = await self._generate_insights(metrics, predictions, anomalies)
            logger.info(f"[BI Agent] Insights gerados: {len(insights)}")
            
            # 5. Sugere ações (vão para fila de aprovação)
            actions = await self._suggest_actions(insights, anomalies)
            logger.info(f"[BI Agent] Ações sugeridas: {len(actions)}")
            
            # 6. Alimenta RAG com novos conhecimentos
            rag_entries = await self._update_knowledge_base(insights)
            logger.info(f"[BI Agent] Entradas RAG criadas: {len(rag_entries)}")
            
            # 7. Prepara dados para ML training
            training_data = await self._prepare_training_data(metrics)
            logger.info(f"[BI Agent] Dados de treino preparados: {training_data.get('samples', 0)} amostras")
            
            # 8. Salva análise
            execution_time = int((datetime.now() - start_time).total_seconds() * 1000)
            analysis = await self._save_analysis(
                metrics=metrics,
                predictions=predictions,
                anomalies=anomalies,
                insights=insights,
                actions=actions,
                execution_time=execution_time
            )
            
            logger.info(f"[BI Agent] Ciclo concluído em {execution_time}ms")
            
            return {
                "id": analysis.get("id"),
                "status": "completed",
                "metrics_count": len(metrics),
                "predictions": predictions,
                "anomalies": anomalies,
                "insights": insights,
                "actions": actions,
                "execution_time_ms": execution_time,
            }
            
        except Exception as e:
            logger.error(f"[BI Agent] Erro no ciclo diário: {e}")
            raise
    
    async def _collect_all_metrics(self) -> Dict[str, Any]:
        """Coleta métricas de todas as áreas."""
        tasks = [
            self.analyzer.collect_sales_metrics(),
            self.analyzer.collect_support_metrics(),
            self.analyzer.collect_marketing_metrics(),
            self.analyzer.collect_financial_metrics(),
            self.analyzer.collect_ai_metrics(),
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        metrics = {}
        areas = ['sales', 'support', 'marketing', 'financial', 'ai']
        
        for area, result in zip(areas, results):
            if isinstance(result, Exception):
                logger.warning(f"Erro ao coletar métricas de {area}: {result}")
                metrics[area] = {}
            else:
                metrics[area] = result
                
        return metrics
    
    async def _generate_predictions(self, metrics: Dict[str, Any]) -> List[Dict]:
        """Gera predições baseadas nas métricas."""
        predictions = []
        
        # Predição de receita
        try:
            revenue_pred = await self.predictor.predict_revenue(months_ahead=3)
            predictions.append({
                "type": "revenue",
                "predictions": revenue_pred.get("predictions", []),
                "confidence": revenue_pred.get("confidence", 0),
            })
        except Exception as e:
            logger.warning(f"Erro na predição de receita: {e}")
        
        # Predição de volume de leads
        try:
            leads_pred = await self.predictor.predict_lead_volume(days_ahead=30)
            predictions.append({
                "type": "lead_volume",
                "predictions": leads_pred.get("daily_predictions", []),
                "total": leads_pred.get("total_predicted", 0),
            })
        except Exception as e:
            logger.warning(f"Erro na predição de leads: {e}")
        
        # Predição de churn
        try:
            churn_pred = await self.predictor.predict_churn_risk()
            if churn_pred.get("high_risk"):
                predictions.append({
                    "type": "churn_risk",
                    "high_risk_count": len(churn_pred.get("high_risk", [])),
                    "potential_loss": churn_pred.get("potential_loss", 0),
                })
        except Exception as e:
            logger.warning(f"Erro na predição de churn: {e}")
        
        return predictions
    
    async def _detect_all_anomalies(self, metrics: Dict[str, Any]) -> List[Dict]:
        """Detecta anomalias em todas as métricas."""
        anomalies = []
        
        metrics_to_check = [
            ("leads", "sales"),
            ("revenue", "financial"),
            ("response_time", "support"),
            ("conversion_rate", "sales"),
            ("roas", "marketing"),
        ]
        
        for metric, area in metrics_to_check:
            try:
                result = await self.predictor.detect_anomalies(metric, "7d")
                if result.get("anomalies"):
                    anomalies.extend([
                        {**a, "metric": metric, "area": area}
                        for a in result.get("anomalies", [])
                    ])
            except Exception as e:
                logger.warning(f"Erro ao detectar anomalias em {metric}: {e}")
        
        return anomalies
    
    async def _generate_insights(
        self,
        metrics: Dict[str, Any],
        predictions: List[Dict],
        anomalies: List[Dict]
    ) -> List[Dict]:
        """Gera insights a partir dos dados coletados."""
        insights = []
        
        # Insight de vendas
        sales = metrics.get("sales", {})
        if sales.get("conversion_rate_change", 0) < -0.1:
            insights.append({
                "type": "warning",
                "category": "sales",
                "title": "Queda na taxa de conversão",
                "content": f"Taxa de conversão caiu {abs(sales.get('conversion_rate_change', 0)*100):.1f}% esta semana.",
                "confidence": 0.9,
                "priority": "high",
            })
        
        # Insight de marketing
        marketing = metrics.get("marketing", {})
        if marketing.get("roas", 0) < 1.0:
            insights.append({
                "type": "warning",
                "category": "marketing",
                "title": "ROAS abaixo do mínimo",
                "content": f"ROAS atual de {marketing.get('roas', 0):.2f}x está abaixo do mínimo (1.0x).",
                "confidence": 0.95,
                "priority": "critical",
            })
        
        # Insight de suporte
        support = metrics.get("support", {})
        if support.get("avg_response_time", 0) > 30:  # mais de 30 min
            insights.append({
                "type": "warning",
                "category": "support",
                "title": "Tempo de resposta elevado",
                "content": f"Tempo médio de resposta está em {support.get('avg_response_time', 0):.0f} minutos.",
                "confidence": 0.85,
                "priority": "medium",
            })
        
        # Insights de anomalias
        for anomaly in anomalies:
            if anomaly.get("severity") == "high":
                insights.append({
                    "type": "anomaly",
                    "category": anomaly.get("area"),
                    "title": f"Anomalia detectada em {anomaly.get('metric')}",
                    "content": anomaly.get("description", ""),
                    "confidence": 0.8,
                    "priority": "high",
                })
        
        return insights
    
    async def _suggest_actions(
        self,
        insights: List[Dict],
        anomalies: List[Dict]
    ) -> List[Dict]:
        """Sugere ações baseadas nos insights."""
        actions = []
        
        for insight in insights:
            if insight.get("priority") in ["high", "critical"]:
                action = await self._create_action_from_insight(insight)
                if action:
                    actions.append(action)
        
        return actions
    
    async def _create_action_from_insight(self, insight: Dict) -> Optional[Dict]:
        """Cria uma ação sugerida a partir de um insight."""
        category = insight.get("category")
        
        if category == "sales" and "conversão" in insight.get("title", "").lower():
            return await self.orchestrator.suggest_sdr_improvement(
                "qualification",
                {
                    "reason": insight.get("content"),
                    "suggested_change": "Revisar script de qualificação",
                }
            )
        
        elif category == "marketing" and "roas" in insight.get("title", "").lower():
            return await self.orchestrator.suggest_ads_optimization(
                None,  # todas as campanhas
                "budget",
                {
                    "reason": insight.get("content"),
                    "suggested_change": "Pausar campanhas com ROAS < 1.0",
                }
            )
        
        return None
    
    async def _update_knowledge_base(self, insights: List[Dict]) -> List[str]:
        """Adiciona insights ao RAG."""
        entries = []
        
        for insight in insights:
            if insight.get("confidence", 0) >= 0.7:
                try:
                    result = await self.knowledge_writer.add_to_rag(
                        content=insight.get("content"),
                        knowledge_type=insight.get("type"),
                        category=insight.get("category"),
                        title=insight.get("title"),
                        confidence=insight.get("confidence"),
                    )
                    entries.append(result.get("knowledge_id"))
                except Exception as e:
                    logger.warning(f"Erro ao adicionar insight ao RAG: {e}")
        
        return entries
    
    async def _prepare_training_data(self, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Prepara dados para treinamento dos modelos ML."""
        try:
            return await self.knowledge_writer.prepare_training_data("all")
        except Exception as e:
            logger.warning(f"Erro ao preparar dados de treino: {e}")
            return {"samples": 0}
    
    async def _save_analysis(
        self,
        metrics: Dict,
        predictions: List,
        anomalies: List,
        insights: List,
        actions: List,
        execution_time: int
    ) -> Dict[str, Any]:
        """Salva a análise no banco de dados."""
        # Aqui seria a chamada para o banco de dados
        # Por enquanto retorna um mock
        return {
            "id": f"analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "tenant_id": self.tenant_id,
            "status": "completed",
        }
    
    async def answer_question(
        self,
        question: str,
        context: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Responde uma pergunta em linguagem natural.
        
        Este método é usado pelo chat do analista virtual.
        """
        logger.info(f"[BI Agent] Pergunta recebida: {question}")
        
        # Analisa a pergunta para determinar a área de foco
        area = self._detect_question_area(question)
        
        # Coleta dados relevantes
        data = await self._get_relevant_data(area, context)
        
        # Gera resposta
        answer = await self._generate_answer(question, data, area)
        
        # Sugere ações relacionadas se aplicável
        actions = await self._suggest_related_actions(question, data)
        
        return {
            "answer": answer,
            "data": data,
            "visualizations": self._get_relevant_visualizations(area),
            "actions": actions,
            "related": self._get_related_questions(question, area),
        }
    
    def _detect_question_area(self, question: str) -> str:
        """Detecta a área de foco da pergunta."""
        question_lower = question.lower()
        
        if any(w in question_lower for w in ["venda", "lead", "conversão", "funil"]):
            return "sales"
        elif any(w in question_lower for w in ["atendimento", "ticket", "resposta", "suporte"]):
            return "support"
        elif any(w in question_lower for w in ["campanha", "ads", "marketing", "roas", "cpl"]):
            return "marketing"
        elif any(w in question_lower for w in ["receita", "faturamento", "custo", "roi"]):
            return "financial"
        else:
            return "global"
    
    async def _get_relevant_data(
        self,
        area: str,
        context: Optional[Dict]
    ) -> Dict[str, Any]:
        """Obtém dados relevantes para responder a pergunta."""
        period = context.get("period", "30d") if context else "30d"
        
        if area == "sales":
            return await self.analyzer.analyze_sales_funnel(period)
        elif area == "support":
            return await self.analyzer.analyze_support_metrics(period)
        elif area == "marketing":
            return await self.analyzer.analyze_marketing_performance(period)
        elif area == "financial":
            return await self.analyzer.analyze_financial_metrics(period)
        else:
            return await self.analyzer.get_executive_summary(period)
    
    async def _generate_answer(
        self,
        question: str,
        data: Dict,
        area: str
    ) -> str:
        """Gera resposta textual baseada nos dados."""
        # Em uma implementação real, usaria LLM para gerar resposta
        # Por enquanto retorna resposta baseada em templates
        
        if area == "sales":
            return f"Analisei os dados de vendas. Taxa de conversão atual: {data.get('conversion_rate', 0):.1f}%. Total de leads: {data.get('total_leads', 0)}."
        elif area == "marketing":
            return f"O ROAS atual é de {data.get('roas', 0):.2f}x com gasto total de R${data.get('total_spend', 0):,.2f}."
        else:
            return "Análise concluída. Veja os dados detalhados abaixo."
    
    async def _suggest_related_actions(
        self,
        question: str,
        data: Dict
    ) -> List[Dict]:
        """Sugere ações relacionadas à pergunta."""
        return []
    
    def _get_relevant_visualizations(self, area: str) -> List[Dict]:
        """Retorna visualizações relevantes para a área."""
        return [
            {"type": "line_chart", "title": f"Tendência de {area}"},
            {"type": "bar_chart", "title": f"Distribuição por canal"},
        ]
    
    def _get_related_questions(self, question: str, area: str) -> List[str]:
        """Retorna perguntas relacionadas."""
        related = {
            "sales": [
                "Qual canal tem melhor conversão?",
                "Quanto tempo leva para fechar um lead?",
                "Quais são os gargalos do funil?",
            ],
            "marketing": [
                "Qual campanha tem melhor ROAS?",
                "Qual é o custo por lead?",
                "Como está a performance por canal?",
            ],
            "support": [
                "Qual é o tempo médio de resposta?",
                "Quantos tickets estão abertos?",
                "Qual horário tem mais demanda?",
            ],
        }
        return related.get(area, [])
    
    async def get_proactive_insights(self) -> Dict[str, Any]:
        """
        Obtém insights proativos que o agente identificou.
        
        Retorna alertas, oportunidades e insights que merecem atenção.
        """
        # Busca última análise
        # Filtra insights relevantes
        
        return {
            "insights": [],
            "alerts": [],
            "opportunities": [],
            "last_analysis": None,
        }

