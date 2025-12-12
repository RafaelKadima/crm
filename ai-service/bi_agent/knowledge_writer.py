"""
Knowledge Writer - Escritor de Conhecimento
============================================

Responsável por adicionar conhecimento ao RAG e preparar dados para ML.
"""

import logging
from datetime import datetime
from typing import Optional, Dict, Any, List
import uuid

logger = logging.getLogger(__name__)


class KnowledgeWriter:
    """
    Escritor de conhecimento do BI Agent.
    
    Responsabilidades:
    - Gerar insights estruturados
    - Adicionar ao RAG (Knowledge Base)
    - Preparar dados para treinamento ML
    - Manter histórico de conhecimento gerado
    """
    
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        self._db = None  # Será injetado
        self._rag_service = None  # Será injetado
    
    async def generate_insight(
        self,
        category: str,
        data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Gera um insight estruturado a partir de dados.
        """
        knowledge_id = str(uuid.uuid4())
        
        # Determina tipo de insight
        insight_type = self._determine_insight_type(data)
        
        # Gera título e conteúdo
        title, content = self._generate_content(category, data)
        
        # Calcula confiança
        confidence = self._calculate_confidence(data)
        
        insight = {
            "id": knowledge_id,
            "tenant_id": self.tenant_id,
            "type": insight_type,
            "category": category,
            "title": title,
            "content": content,
            "confidence": confidence,
            "supporting_data": data,
            "created_at": datetime.now().isoformat(),
        }
        
        # TODO: Salvar no banco
        # await self._db.bi_generated_knowledge.create(insight)
        
        logger.info(f"[KnowledgeWriter] Insight gerado: {knowledge_id}")
        
        return insight
    
    async def add_to_rag(
        self,
        content: str,
        knowledge_type: str,
        category: str,
        title: str,
        confidence: float = 0.7,
        metadata: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Adiciona conhecimento ao RAG (Knowledge Base).
        """
        knowledge_id = str(uuid.uuid4())
        
        # Prepara entrada para o RAG
        rag_entry = {
            "content": content,
            "context": f"bi_{knowledge_type}",
            "category": category,
            "metadata": {
                "source": "bi_agent",
                "knowledge_id": knowledge_id,
                "type": knowledge_type,
                "title": title,
                "confidence": confidence,
                "generated_at": datetime.now().isoformat(),
                **(metadata or {}),
            },
        }
        
        # TODO: Chamar serviço RAG real
        # rag_entry_id = await self._rag_service.add_entry(rag_entry)
        rag_entry_id = str(uuid.uuid4())  # Mock
        
        # Salva conhecimento gerado
        knowledge = {
            "id": knowledge_id,
            "tenant_id": self.tenant_id,
            "knowledge_type": knowledge_type,
            "category": category,
            "title": title,
            "content": content,
            "confidence": confidence,
            "metadata": metadata,
            "added_to_rag": True,
            "added_to_rag_at": datetime.now().isoformat(),
        }
        
        # TODO: Salvar no banco
        # await self._db.bi_generated_knowledge.create(knowledge)
        
        logger.info(f"[KnowledgeWriter] Conhecimento adicionado ao RAG: {knowledge_id}")
        
        return {
            "knowledge_id": knowledge_id,
            "rag_entry_id": rag_entry_id,
        }
    
    async def prepare_training_data(
        self,
        model_type: str
    ) -> Dict[str, Any]:
        """
        Prepara dados para treinamento de modelo ML.
        
        Tipos de modelo:
        - lead_score: Dados para LeadScoreNet
        - campaign_predictor: Dados para CampaignPredictorNet
        - churn_predictor: Dados para previsão de churn
        - all: Todos os modelos
        """
        logger.info(f"[KnowledgeWriter] Preparando dados de treino para: {model_type}")
        
        if model_type == "all":
            # Prepara para todos os modelos
            results = {
                "lead_score": await self._prepare_lead_score_data(),
                "campaign_predictor": await self._prepare_campaign_data(),
            }
            
            total_samples = sum(r.get("samples_count", 0) for r in results.values())
            
            return {
                "model_type": "all",
                "samples_count": total_samples,
                "by_model": results,
                "ready": total_samples > 100,
            }
        
        elif model_type == "lead_score":
            return await self._prepare_lead_score_data()
        
        elif model_type == "campaign_predictor":
            return await self._prepare_campaign_data()
        
        else:
            return {
                "model_type": model_type,
                "samples_count": 0,
                "ready": False,
                "error": f"Tipo de modelo desconhecido: {model_type}",
            }
    
    async def _prepare_lead_score_data(self) -> Dict[str, Any]:
        """Prepara dados para modelo LeadScoreNet."""
        # TODO: Implementar coleta real de dados
        return {
            "model_type": "lead_score",
            "samples_count": 450,
            "features": [
                "channel_type",
                "response_time",
                "message_count",
                "engagement_score",
                "stage_progression",
            ],
            "ready": True,
            "data_path": f"/data/training/{self.tenant_id}/lead_score",
        }
    
    async def _prepare_campaign_data(self) -> Dict[str, Any]:
        """Prepara dados para modelo CampaignPredictorNet."""
        # TODO: Implementar coleta real de dados
        return {
            "model_type": "campaign_predictor",
            "samples_count": 120,
            "features": [
                "budget",
                "audience_size",
                "creative_type",
                "placement",
                "historical_roas",
            ],
            "ready": True,
            "data_path": f"/data/training/{self.tenant_id}/campaign_predictor",
        }
    
    async def get_stats(self) -> Dict[str, Any]:
        """
        Retorna estatísticas do conhecimento gerado.
        """
        # TODO: Implementar consulta real ao banco
        return {
            "total": 150,
            "by_type": {
                "insight": 80,
                "pattern": 35,
                "best_practice": 20,
                "warning": 10,
                "anomaly": 5,
            },
            "by_category": {
                "sales": 60,
                "support": 40,
                "marketing": 35,
                "financial": 15,
            },
            "in_rag": 120,
            "for_training": 100,
            "avg_confidence": 0.78,
        }
    
    async def write_to_rag(self, insights: List[Dict]) -> List[str]:
        """
        Adiciona múltiplos insights ao RAG.
        """
        entries = []
        
        for insight in insights:
            if insight.get("confidence", 0) >= 0.7:
                try:
                    result = await self.add_to_rag(
                        content=insight.get("content", ""),
                        knowledge_type=insight.get("type", "insight"),
                        category=insight.get("category", "general"),
                        title=insight.get("title", ""),
                        confidence=insight.get("confidence", 0.7),
                    )
                    entries.append(result.get("knowledge_id"))
                except Exception as e:
                    logger.warning(f"Erro ao adicionar insight ao RAG: {e}")
        
        return entries
    
    def _determine_insight_type(self, data: Dict) -> str:
        """Determina o tipo de insight baseado nos dados."""
        if data.get("is_anomaly"):
            return "anomaly"
        elif data.get("is_warning"):
            return "warning"
        elif data.get("is_pattern"):
            return "pattern"
        elif data.get("is_best_practice"):
            return "best_practice"
        return "insight"
    
    def _generate_content(
        self,
        category: str,
        data: Dict
    ) -> tuple[str, str]:
        """Gera título e conteúdo do insight."""
        # Templates por categoria
        templates = {
            "sales": {
                "title": "Análise de Vendas",
                "content": f"Baseado nos dados de vendas: {data.get('summary', '')}",
            },
            "support": {
                "title": "Análise de Suporte",
                "content": f"Métricas de atendimento indicam: {data.get('summary', '')}",
            },
            "marketing": {
                "title": "Análise de Marketing",
                "content": f"Performance de campanhas: {data.get('summary', '')}",
            },
        }
        
        template = templates.get(category, {
            "title": "Insight",
            "content": str(data),
        })
        
        return template["title"], template["content"]
    
    def _calculate_confidence(self, data: Dict) -> float:
        """Calcula confiança do insight."""
        # Fatores que aumentam confiança
        confidence = 0.5
        
        if data.get("sample_size", 0) > 100:
            confidence += 0.2
        elif data.get("sample_size", 0) > 50:
            confidence += 0.1
        
        if data.get("statistical_significance", 0) > 0.95:
            confidence += 0.2
        elif data.get("statistical_significance", 0) > 0.90:
            confidence += 0.1
        
        if data.get("corroborating_data"):
            confidence += 0.1
        
        return min(0.95, confidence)
    
    async def prepare_ml_training_data(
        self,
        metrics: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Prepara dados de métricas para treinamento ML.
        """
        return await self.prepare_training_data("all")

