"""
BI Agent - Agente Principal de Business Intelligence
=====================================================

Coordena todas as operações de análise, predição e sugestão de ações.
"""

import asyncio
import logging
import os
import json
import httpx
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List

from .analyzer import DataAnalyzer
from .predictor import PredictiveEngine
from .orchestrator import AgentOrchestrator
from .knowledge import KnowledgeWriter
from .reports import ReportGenerator
from .cache import BICache, CachedDataAnalyzer
from .metrics import BIAgentMetrics, PeriodComparison

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
    
    def __init__(
        self, 
        tenant_id: str, 
        ad_account_id: Optional[str] = None,
        campaign_ids: Optional[List[str]] = None,
        use_cache: bool = True
    ):
        self.tenant_id = tenant_id
        self.ad_account_id = ad_account_id  # Filtro opcional para conta de anúncios
        self.campaign_ids = campaign_ids  # Filtro opcional para campanhas específicas
        
        # Core analyzers
        self._base_analyzer = DataAnalyzer(tenant_id, ad_account_id=ad_account_id)
        self.predictor = PredictiveEngine(tenant_id)
        self.orchestrator = AgentOrchestrator(tenant_id)
        self.knowledge_writer = KnowledgeWriter(tenant_id)
        self.report_generator = ReportGenerator(tenant_id)
        
        # Cache e métricas
        self.cache = BICache(tenant_id)
        self.bi_metrics = BIAgentMetrics(tenant_id)
        
        # Configuração dinâmica (será carregada no início do ciclo)
        self.config = {}
        
        # Analyzer com cache opcional
        if use_cache:
            self.analyzer = CachedDataAnalyzer(self._base_analyzer, self.cache)
        else:
            self.analyzer = self._base_analyzer
        
        # Comparação de períodos
        self.period_comparison = PeriodComparison(self._base_analyzer, self.predictor)
        
        # Configurações para chamadas à API do Laravel
        self.laravel_url = os.getenv("LARAVEL_API_URL", "http://nginx")
        self.internal_key = os.getenv("LARAVEL_INTERNAL_KEY", "")
        
    async def run_daily_cycle(self, async_mode: bool = False) -> Dict[str, Any]:
        """
        Ciclo diário de análise autônoma.
        
        Args:
            async_mode: Se True, despacha para Celery worker.
        """
        if async_mode:
            try:
                # Importação local para evitar ciclo
                from worker import run_daily_analysis 
                task = run_daily_analysis.delay(self.tenant_id)
                logger.info(f"[BI Agent] Tarefa despachada para fila: {task.id}")
                return {
                    "status": "queued",
                    "task_id": str(task.id),
                    "tenant_id": self.tenant_id
                }
            except Exception as e:
                logger.error(f"[BI Agent] Erro ao despachar tarefa: {e}")
                # Fallback para execução síncrona
                return await self._execute_daily_cycle()
        
        return await self._execute_daily_cycle()

    async def _execute_daily_cycle(self) -> Dict[str, Any]:
        """
        Execução real do ciclo diário (lógica core).
        """
        start_time = datetime.now()
        logger.info(f"[BI Agent] Iniciando ciclo diário para tenant {self.tenant_id}")
        
        try:
            # 0. Carrega configurações do tenant
            await self._load_tenant_config()
            
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
        sales_config = self.config.get("sales", {})
        min_conversion_drop = sales_config.get("max_conversion_drop", -0.1)  # Default -10%
        
        sales = metrics.get("sales", {})
        if sales.get("conversion_rate_change", 0) < min_conversion_drop:
            insights.append({
                "type": "warning",
                "category": "sales",
                "title": "Queda na taxa de conversão",
                "content": f"Taxa de conversão caiu {abs(sales.get('conversion_rate_change', 0)*100):.1f}% esta semana (Limite: {abs(min_conversion_drop*100):.1f}%).",
                "confidence": 0.9,
                "priority": "high",
            })
        
        # Insight de marketing
        marketing_config = self.config.get("marketing", {})
        min_roas = marketing_config.get("min_roas", 1.0)  # Default 1.0
        
        marketing = metrics.get("marketing", {})
        if marketing.get("roas", 0) < min_roas:
            insights.append({
                "type": "warning",
                "category": "marketing",
                "title": "ROAS abaixo do mínimo",
                "content": f"ROAS atual de {marketing.get('roas', 0):.2f}x está abaixo do mínimo ({min_roas:.1f}x).",
                "confidence": 0.95,
                "priority": "critical",
            })
        
        # Insight de suporte
        support_config = self.config.get("support", {})
        max_response_time = support_config.get("max_response_time", 30)  # Default 30 min
        
        support = metrics.get("support", {})
        if support.get("avg_response_time", 0) > max_response_time:  # mais de X min
            insights.append({
                "type": "warning",
                "category": "support",
                "title": "Tempo de resposta elevado",
                "content": f"Tempo médio de resposta está em {support.get('avg_response_time', 0):.0f} minutos (Meta: {max_response_time} min).",
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
    
    async def _load_tenant_config(self):
        """Carrega configurações personalizadas do tenant."""
        try:
            # Usa o orchestrator para buscar configs via API Laravel
            # Endpoint: /api/internal/bi/config/settings
            config_data = await self.orchestrator._call_api("config/settings")
            
            if config_data and "settings" in config_data:
                self.config = config_data.get("settings", {})
                logger.info(f"[BI Agent] Configurações carregadas para tenant {self.tenant_id}")
            else:
                logger.warning("[BI Agent] Usando configurações padrão (API sem dados)")
                self.config = {}
                
        except Exception as e:
            logger.error(f"[BI Agent] Erro ao carregar configurações: {e}")
            self.config = {}

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
        
        payload = {
            "metrics": metrics,
            "predictions": predictions,
            "anomalies": anomalies,
            "insights": insights,
            "actions_generated": [a.get("action_id") for a in actions],
            "execution_time_ms": execution_time,
            "analyzed_at": datetime.now().isoformat(),
        }
        
        try:
            # Persiste via API Laravel
            result = await self.orchestrator._call_api("analysis", method="POST", data=payload)
            
            if "id" in result:
                return {
                    "id": result.get("id"),
                    "tenant_id": self.tenant_id,
                    "status": "saved",
                }
        except Exception as e:
            logger.error(f"[BI Agent] Erro ao salvar análise: {e}")
        
        # Fallback se falhar
        return {
            "id": f"local_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "tenant_id": self.tenant_id,
            "status": "completed_but_not_saved",
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
        logger.info(f"[BI Agent] Contexto: {context}")
        
        # Analisa a pergunta para determinar a área de foco
        area = self._detect_question_area(question)
        logger.info(f"[BI Agent] Área detectada: {area}")
        
        # Se a pergunta é sobre marketing/campanhas e temos conta de anúncios, busca dados reais
        if area == "marketing" and self.ad_account_id:
            data = await self._get_campaigns_data(context)
        else:
            # Coleta dados relevantes do analyzer
            data = await self._get_relevant_data(area, context)
        
        # Gera resposta com LLM
        answer = await self._generate_answer_with_llm(question, data, area, context)
        
        # Sugere ações relacionadas se aplicável
        actions = await self._suggest_related_actions(question, data)
        
        return {
            "answer": answer,
            "data": data,
            "visualizations": self._get_relevant_visualizations(area),
            "actions": actions,
            "related": self._get_related_questions(question, area),
        }
    
    async def _get_campaigns_data(self, context: Optional[Dict] = None) -> Dict[str, Any]:
        """Busca dados reais das campanhas via API interna do Laravel."""
        period = context.get("period", "30d") if context else "30d"
        
        # Mapeia período para date_preset do Meta
        date_preset_map = {
            "7d": "last_7d",
            "30d": "last_30d",
            "90d": "last_90d",
            "this_month": "this_month",
            "last_month": "last_month",
        }
        date_preset = date_preset_map.get(period, "last_7d")
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Se temos campaign_ids (UUIDs do banco), primeiro busca os platform_campaign_ids
                platform_campaign_ids = []
                if self.campaign_ids:
                    # Busca mapeamento de UUIDs para platform_campaign_ids via Laravel
                    campaigns_url = f"{self.laravel_url}/api/internal/ads/campaigns"
                    headers = {
                        "X-Internal-Key": self.internal_key,
                        "X-Tenant-ID": self.tenant_id,
                        "Content-Type": "application/json",
                    }
                    params = {"ad_account_id": self.ad_account_id}
                    
                    campaigns_response = await client.get(campaigns_url, headers=headers, params=params)
                    if campaigns_response.status_code == 200:
                        campaigns_data = campaigns_response.json()
                        all_campaigns = campaigns_data.get("campaigns", [])
                        # Mapeia UUIDs para platform_campaign_ids
                        for camp in all_campaigns:
                            if camp.get("id") in self.campaign_ids:
                                platform_id = camp.get("platform_campaign_id")
                                if platform_id:
                                    platform_campaign_ids.append(str(platform_id))
                        logger.info(f"[BI Agent] Mapeou {len(platform_campaign_ids)} campanhas de {len(self.campaign_ids)} UUIDs")
                
                # Busca insights das campanhas
                url = f"{self.laravel_url}/api/internal/ads/accounts/{self.ad_account_id}/campaigns/insights"
                headers = {
                    "X-Internal-Key": self.internal_key,
                    "X-Tenant-ID": self.tenant_id,
                    "Content-Type": "application/json",
                }
                params = {"date_preset": date_preset}
                
                logger.info(f"[BI Agent] Buscando campanhas: {url}")
                response = await client.get(url, headers=headers, params=params)
                
                if response.status_code == 200:
                    result = response.json()
                    campaigns = result.get("data", [])
                    
                    logger.info(f"[BI Agent] Recebeu {len(campaigns)} campanhas da API")
                    
                    # Filtra campanhas específicas se solicitado (usando platform_campaign_ids)
                    if platform_campaign_ids:
                        campaigns = [c for c in campaigns if str(c.get("id")) in platform_campaign_ids]
                        logger.info(f"[BI Agent] Filtrou para {len(campaigns)} campanhas")
                    
                    # Calcula totais
                    total_spend = sum(float(c.get("spend", 0) or 0) for c in campaigns)
                    total_impressions = sum(int(c.get("impressions", 0) or 0) for c in campaigns)
                    total_clicks = sum(int(c.get("clicks", 0) or 0) for c in campaigns)
                    total_conversions = sum(int(c.get("conversions", 0) or 0) for c in campaigns)
                    
                    avg_ctr = (total_clicks / total_impressions * 100) if total_impressions > 0 else 0
                    avg_cpc = (total_spend / total_clicks) if total_clicks > 0 else 0
                    
                    return {
                        "account_name": result.get("account_name", ""),
                        "period": period,
                        "campaigns": campaigns,
                        "total_campaigns": len(campaigns),
                        "totals": {
                            "spend": total_spend,
                            "impressions": total_impressions,
                            "clicks": total_clicks,
                            "conversions": total_conversions,
                            "ctr": round(avg_ctr, 2),
                            "cpc": round(avg_cpc, 2),
                        },
                        "source": "meta_ads_api",
                    }
                else:
                    logger.error(f"[BI Agent] Erro ao buscar campanhas: {response.status_code} - {response.text}")
                    
        except Exception as e:
            logger.error(f"[BI Agent] Erro ao buscar dados de campanhas: {e}")
            import traceback
            logger.error(f"[BI Agent] Traceback: {traceback.format_exc()}")
        
        return {"campaigns": [], "error": "Não foi possível buscar dados das campanhas"}
    
    async def _generate_answer_with_llm(
        self,
        question: str,
        data: Dict,
        area: str,
        context: Optional[Dict] = None
    ) -> str:
        """Gera resposta usando LLM com os dados coletados."""
        try:
            from openai import OpenAI
            
            client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            
            # Prepara dados para o prompt
            campaigns = data.get("campaigns", [])
            totals = data.get("totals", {})
            
            # Formata dados das campanhas para análise
            campaigns_info = []
            for c in campaigns[:10]:  # Limita a 10 campanhas
                campaigns_info.append({
                    "name": c.get("name", ""),
                    "objective": c.get("objective", "").replace("OUTCOME_", ""),
                    "status": c.get("status", ""),
                    "spend": f"R$ {float(c.get('spend', 0)):.2f}",
                    "impressions": c.get("impressions", 0),
                    "clicks": c.get("clicks", 0),
                    "ctr": f"{float(c.get('ctr', 0)):.2f}%",
                    "cpc": f"R$ {float(c.get('cpc', 0)):.2f}",
                    "conversions": c.get("conversions", 0),
                    "roas": c.get("roas", 0),
                })
            
            system_prompt = """Você é um analista de BI especializado em marketing digital e campanhas de anúncios.
Analise os dados fornecidos e responda à pergunta do usuário de forma clara e profissional.

REGRAS IMPORTANTES:
1. Sempre considere o OBJETIVO da campanha ao avaliar performance:
   - ENGAGEMENT/AWARENESS: Foque em impressões, alcance, engajamento. ROAS baixo é ESPERADO.
   - TRAFFIC: Foque em cliques, CPC, CTR.
   - SALES/LEADS: Foque em conversões, CPA, ROAS.
2. Nunca critique uma campanha de engajamento por ter ROAS baixo.
3. Forneça insights acionáveis e recomendações específicas.
4. Use formatação clara com bullet points quando apropriado.
5. Responda em português brasileiro.
6. Seja direto mas completo na análise."""

            user_prompt = f"""Pergunta: {question}

DADOS DAS CAMPANHAS (período: {data.get('period', '30d')}):
Conta: {data.get('account_name', 'N/A')}
Total de campanhas: {data.get('total_campaigns', 0)}

TOTAIS:
- Investimento: R$ {totals.get('spend', 0):.2f}
- Impressões: {totals.get('impressions', 0):,}
- Cliques: {totals.get('clicks', 0):,}
- CTR médio: {totals.get('ctr', 0):.2f}%
- CPC médio: R$ {totals.get('cpc', 0):.2f}
- Conversões: {totals.get('conversions', 0)}

DETALHES POR CAMPANHA:
{json.dumps(campaigns_info, indent=2, ensure_ascii=False)}

Analise esses dados e responda à pergunta considerando os objetivos de cada campanha."""

            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.7,
                max_tokens=1500
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"[BI Agent] Erro ao gerar resposta com LLM: {e}")
            # Fallback para resposta básica
            return await self._generate_answer(question, data, area)
    
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
    
    async def generate_report(
        self,
        report_type: str = "executive_summary",
        period: str = "30d",
        formats: List[str] = None
    ) -> Dict[str, Any]:
        """
        Gera relatório em PDF e/ou Excel.
        
        Args:
            report_type: executive_summary, sales, marketing
            period: Período de análise
            formats: Lista de formatos desejados ["pdf", "excel"]
        
        Returns:
            Dict com arquivos gerados em base64
        """
        if formats is None:
            formats = ["pdf"]
        
        # Registra métrica
        start = datetime.now()
        
        # Coleta dados baseado no tipo
        if report_type == "executive_summary":
            data = await self._base_analyzer.get_executive_summary(period)
            title = f"Resumo Executivo - {datetime.now().strftime('%d/%m/%Y')}"
        elif report_type == "sales":
            data = await self._base_analyzer.collect_sales_metrics(period)
            title = f"Relatório de Vendas - {datetime.now().strftime('%d/%m/%Y')}"
        elif report_type == "marketing":
            data = await self._base_analyzer.analyze_marketing_performance(period)
            title = f"Relatório de Marketing - {datetime.now().strftime('%d/%m/%Y')}"
        else:
            data = await self._base_analyzer.get_executive_summary(period)
            title = f"Relatório - {datetime.now().strftime('%d/%m/%Y')}"
        
        # Gera relatório
        result = self.report_generator.generate_report(title, data, report_type, formats)
        
        # Registra métrica
        duration = int((datetime.now() - start).total_seconds() * 1000)
        await self.bi_metrics.record_analysis(f"report_{report_type}", duration, result.get("success", False))
        
        return result
    
    async def compare_periods(
        self,
        period1_days: int = 30,
        period2_days: int = 30,
        areas: List[str] = None
    ) -> Dict[str, Any]:
        """
        Compara métricas entre dois períodos consecutivos.
        
        Args:
            period1_days: Dias do período mais recente
            period2_days: Dias do período anterior
            areas: Áreas para comparar (sales, marketing, financial)
        
        Returns:
            Comparação detalhada entre períodos
        """
        return await self.period_comparison.compare_periods(period1_days, period2_days, areas)
    
    async def detect_trends(self, days: int = 90) -> Dict[str, Any]:
        """
        Detecta tendências automaticamente nos últimos N dias.
        
        Args:
            days: Número de dias para análise
        
        Returns:
            Tendências detectadas e recomendações
        """
        return await self.period_comparison.detect_trends(days)
    
    async def get_dashboard_metrics(self) -> Dict[str, Any]:
        """
        Retorna dashboard de métricas do próprio BI Agent.
        
        Inclui:
        - Quantidade de análises realizadas
        - Tempo médio de resposta
        - Predições e acurácia
        - Insights gerados
        """
        return await self.bi_metrics.get_dashboard()
    
    async def invalidate_cache(self) -> Dict[str, Any]:
        """
        Invalida cache do BI Agent.
        
        Útil quando dados são atualizados manualmente.
        """
        invalidated = await self.cache.invalidate_all()
        return {
            "success": True,
            "keys_invalidated": invalidated,
        }
    
    async def get_cache_stats(self) -> Dict[str, Any]:
        """
        Retorna estatísticas do cache.
        """
        return await self.cache.stats()

