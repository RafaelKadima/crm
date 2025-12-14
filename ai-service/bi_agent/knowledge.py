"""
Knowledge Writer - Gerador de Conhecimento
===========================================

Responsável por:
- Gerar e persistir insights
- Integrar com RAG para enriquecer respostas
- Manter base de conhecimento atualizada
"""

import logging
import os
import httpx
from datetime import datetime
from typing import Optional, Dict, Any, List
import uuid
import hashlib

logger = logging.getLogger(__name__)

# Configuração
LARAVEL_URL = os.getenv("LARAVEL_API_URL", "http://nginx")
INTERNAL_KEY = os.getenv("LARAVEL_INTERNAL_KEY", "")


class KnowledgeWriter:
    """
    Gerador e gerenciador de conhecimento.
    
    Responsabilidades:
    - Criar insights a partir de análises
    - Salvar no banco via API Laravel
    - Integrar com RAG para embeddings
    - Buscar conhecimento relevante
    """
    
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        self._headers = {
            "X-Internal-Key": INTERNAL_KEY,
            "X-Tenant-ID": tenant_id,
            "Content-Type": "application/json",
        }
    
    async def _call_api(
        self, 
        endpoint: str, 
        method: str = "GET",
        data: Optional[Dict] = None,
        params: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Chama endpoint interno da API Laravel."""
        url = f"{LARAVEL_URL}/api/internal/bi/{endpoint}"
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                if method == "POST":
                    response = await client.post(url, headers=self._headers, json=data or {})
                else:
                    response = await client.get(url, headers=self._headers, params=params or {})
                
                if response.status_code in [200, 201]:
                    return response.json()
                else:
                    logger.error(f"[KnowledgeWriter] Erro na API {endpoint}: {response.status_code}")
                    return {"error": f"API error: {response.status_code}"}
                    
        except Exception as e:
            logger.error(f"[KnowledgeWriter] Erro ao chamar {endpoint}: {e}")
            return {"error": str(e)}
    
    async def _call_rag_api(
        self,
        endpoint: str,
        method: str = "POST",
        data: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Chama API do serviço RAG interno.
        """
        # RAG endpoint local (mesmo serviço de IA)
        url = f"http://localhost:8000/rag/{endpoint}"
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                if method == "POST":
                    response = await client.post(
                        url, 
                        json=data or {},
                        headers={"X-Tenant-ID": self.tenant_id}
                    )
                else:
                    response = await client.get(
                        url, 
                        params=data or {},
                        headers={"X-Tenant-ID": self.tenant_id}
                    )
                
                if response.status_code == 200:
                    return response.json()
                else:
                    logger.warning(f"[KnowledgeWriter] RAG API error: {response.status_code}")
                    return {"error": f"RAG error: {response.status_code}"}
                    
        except Exception as e:
            logger.warning(f"[KnowledgeWriter] RAG não disponível: {e}")
            return {"error": str(e)}
    
    async def write_insight(
        self,
        title: str,
        content: str,
        category: str,
        knowledge_type: str = "insight",
        confidence: float = 0.8,
        supporting_data: Optional[Dict] = None,
        add_to_rag: bool = True
    ) -> Dict[str, Any]:
        """
        Cria e persiste um novo insight.
        
        Args:
            title: Título do insight
            content: Conteúdo detalhado
            category: sales, support, marketing, financial, ai, general
            knowledge_type: insight, pattern, best_practice, warning, anomaly
            confidence: 0.0 a 1.0
            supporting_data: Dados que suportam o insight
            add_to_rag: Se deve adicionar ao RAG para buscas futuras
        """
        # Verifica se insight similar já existe (evita duplicação)
        content_hash = hashlib.md5(content.encode()).hexdigest()[:10]
        
        # Prepara dados para API
        knowledge_data = {
            "knowledge_type": knowledge_type,
            "category": category,
            "title": title,
            "content": content,
            "confidence": confidence,
            "supporting_data": supporting_data,
            "added_to_rag": False,  # Será atualizado após adicionar ao RAG
        }
        
        # Persiste no banco via Laravel
        result = await self._call_api("knowledge", method="POST", data=knowledge_data)
        
        if "error" in result:
            logger.warning(f"[KnowledgeWriter] Erro ao salvar conhecimento: {result.get('error')}")
            return {"success": False, "error": result.get("error")}
        
        knowledge_id = result.get("knowledge_id")
        logger.info(f"[KnowledgeWriter] Conhecimento salvo: {knowledge_id} - {title}")
        
        # Adiciona ao RAG se solicitado
        rag_status = "not_requested"
        if add_to_rag:
            rag_result = await self._add_to_rag(
                knowledge_id=knowledge_id,
                title=title,
                content=content,
                category=category,
                metadata={
                    "type": knowledge_type,
                    "confidence": confidence,
                    "created_at": datetime.now().isoformat(),
                }
            )
            rag_status = "success" if rag_result.get("success") else "failed"
        
        return {
            "success": True,
            "knowledge_id": knowledge_id,
            "title": title,
            "category": category,
            "added_to_rag": rag_status == "success",
            "rag_status": rag_status,
        }
    
    async def _add_to_rag(
        self,
        knowledge_id: str,
        title: str,
        content: str,
        category: str,
        metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Adiciona conhecimento ao sistema RAG para busca semântica.
        """
        # Formata documento para indexação
        document = f"""
## {title}

{content}

Categoria: {category}
Tipo: {metadata.get('type', 'insight')}
Confiança: {metadata.get('confidence', 0.8)}
"""
        
        rag_data = {
            "tenant_id": self.tenant_id,
            "document_id": knowledge_id,
            "content": document,
            "metadata": {
                **metadata,
                "category": category,
                "title": title,
                "source": "bi_agent",
            },
            "collection": f"bi_knowledge_{self.tenant_id}",
        }
        
        result = await self._call_rag_api("ingest", method="POST", data=rag_data)
        
        if "error" not in result:
            logger.info(f"[KnowledgeWriter] Conhecimento adicionado ao RAG: {knowledge_id}")
            return {"success": True}
        
        return {"success": False, "error": result.get("error")}
    
    async def search_knowledge(
        self,
        query: str,
        category: Optional[str] = None,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Busca conhecimento relevante no RAG.
        """
        search_data = {
            "tenant_id": self.tenant_id,
            "query": query,
            "limit": limit,
            "collection": f"bi_knowledge_{self.tenant_id}",
        }
        
        if category:
            search_data["filter"] = {"category": category}
        
        result = await self._call_rag_api("search", method="POST", data=search_data)
        
        if "error" in result:
            logger.warning(f"[KnowledgeWriter] Erro na busca RAG: {result.get('error')}")
            return []
        
        return result.get("results", [])
    
    async def generate_insight(
        self,
        analysis_data: Dict[str, Any],
        area: str
    ) -> Optional[Dict[str, Any]]:
        """
        Gera insight automaticamente a partir dos dados de análise.
        """
        # Detecta padrões importantes
        insights_to_create = []
        
        if area == "sales":
            insights_to_create.extend(self._detect_sales_patterns(analysis_data))
        elif area == "marketing":
            insights_to_create.extend(self._detect_marketing_patterns(analysis_data))
        elif area == "support":
            insights_to_create.extend(self._detect_support_patterns(analysis_data))
        
        # Cria insights detectados
        created = []
        for insight_data in insights_to_create:
            result = await self.write_insight(**insight_data)
            if result.get("success"):
                created.append(result)
        
        return {
            "insights_created": len(created),
            "details": created,
        }
    
    def _detect_sales_patterns(self, data: Dict) -> List[Dict]:
        """Detecta padrões em dados de vendas."""
        insights = []
        
        # Queda na conversão
        if data.get("conversion_rate_change", 0) < -0.1:
            insights.append({
                "title": "Queda significativa na taxa de conversão",
                "content": f"A taxa de conversão caiu {abs(data.get('conversion_rate_change', 0)*100):.1f}% no período. "
                          "Recomenda-se revisar a qualidade dos leads e o processo de vendas.",
                "category": "sales",
                "knowledge_type": "warning",
                "confidence": 0.9,
                "supporting_data": {
                    "conversion_rate": data.get("conversion_rate"),
                    "change": data.get("conversion_rate_change"),
                },
            })
        
        # Alta performance
        if data.get("conversion_rate", 0) > 0.3:
            insights.append({
                "title": "Taxa de conversão acima da média",
                "content": f"A taxa de conversão está em {data.get('conversion_rate', 0)*100:.1f}%, "
                          "acima da média do mercado. Documente as práticas atuais para replicar.",
                "category": "sales",
                "knowledge_type": "best_practice",
                "confidence": 0.85,
            })
        
        return insights
    
    def _detect_marketing_patterns(self, data: Dict) -> List[Dict]:
        """Detecta padrões em dados de marketing."""
        insights = []
        
        # ROAS crítico
        if data.get("roas", 1) < 1.0 and data.get("total_spend", 0) > 0:
            insights.append({
                "title": "ROAS crítico - Campanhas dando prejuízo",
                "content": f"O ROAS está em {data.get('roas', 0):.2f}x. "
                          "Para cada R$ 1 investido, o retorno é menor que o investimento. "
                          "Revise as campanhas ou pause as menos performantes.",
                "category": "marketing",
                "knowledge_type": "warning",
                "confidence": 0.95,
                "supporting_data": {
                    "roas": data.get("roas"),
                    "spend": data.get("total_spend"),
                },
            })
        
        # Campanha top performer
        best = data.get("best_campaign")
        if best and best.get("roas", 0) > 3:
            insights.append({
                "title": f"Campanha {best.get('name', 'N/A')} com ROAS excelente",
                "content": f"A campanha está com ROAS de {best.get('roas', 0):.2f}x. "
                          "Considere escalar o orçamento ou replicar a estratégia.",
                "category": "marketing",
                "knowledge_type": "best_practice",
                "confidence": 0.9,
            })
        
        return insights
    
    def _detect_support_patterns(self, data: Dict) -> List[Dict]:
        """Detecta padrões em dados de suporte."""
        insights = []
        
        # Acúmulo de tickets
        if data.get("open_tickets", 0) > 20:
            insights.append({
                "title": "Acúmulo de tickets abertos",
                "content": f"Há {data.get('open_tickets')} tickets abertos aguardando atendimento. "
                          "Considere priorizar o atendimento ou aumentar a equipe.",
                "category": "support",
                "knowledge_type": "warning",
                "confidence": 0.85,
                "supporting_data": {
                    "open_tickets": data.get("open_tickets"),
                },
            })
        
        return insights
    
    async def enrich_context(self, question: str, category: Optional[str] = None) -> str:
        """
        Enriquece contexto com conhecimento relevante do RAG.
        """
        results = await self.search_knowledge(question, category, limit=3)
        
        if not results:
            return ""
        
        context_parts = ["### Conhecimento relevante anterior:\n"]
        for result in results:
            content = result.get("content", "")
            score = result.get("score", 0)
            if score > 0.7:  # Apenas resultados relevantes
                context_parts.append(f"- {content[:300]}...")
        
        return "\n".join(context_parts) if len(context_parts) > 1 else ""
    
    async def add_to_rag(
        self,
        content: str,
        knowledge_type: str,
        category: str,
        title: str,
        confidence: float = 0.8
    ) -> Dict[str, Any]:
        """
        Adiciona conhecimento ao RAG (método público).
        
        Wrapper para compatibilidade com BIAgent.
        """
        try:
            result = await self.write_insight(
                title=title,
                content=content,
                category=category,
                knowledge_type=knowledge_type,
                confidence=confidence,
                add_to_rag=True
            )
            return result
        except Exception as e:
            logger.error(f"[KnowledgeWriter] Erro em add_to_rag: {e}")
            return {"success": False, "error": str(e)}
    
    async def prepare_training_data(self, scope: str = "all") -> Dict[str, Any]:
        """
        Prepara dados para treinamento de modelos ML.
        
        Por enquanto retorna dados vazios - implementação futura.
        """
        # TODO: Implementar coleta de dados históricos para treinamento
        # Por enquanto, retorna estrutura básica
        logger.info(f"[KnowledgeWriter] Preparando dados de treino (scope: {scope})")
        
        return {
            "samples": 0,
            "scope": scope,
            "features": [],
            "labels": [],
            "message": "Training data preparation not yet implemented",
        }
