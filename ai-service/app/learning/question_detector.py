"""
Detector de Perguntas Frequentes
Identifica perguntas que podem virar FAQs automaticamente
"""
from typing import Optional, Dict, Any, List
from datetime import datetime
import json
import structlog
from openai import AsyncOpenAI

from app.config import get_settings

logger = structlog.get_logger()
settings = get_settings()


class QuestionDetector:
    """
    Detecta perguntas frequentes nas conversas.
    
    Fluxo:
    1. Analisa mensagem do lead
    2. Identifica se é uma pergunta
    3. Normaliza a pergunta
    4. Verifica se já existe similar
    5. Se frequente, sugere criar FAQ
    """
    
    def __init__(self):
        self.openai = AsyncOpenAI(
            api_key=settings.openai_api_key,
            project=settings.openai_project_id if settings.openai_project_id else None
        )
        # Cache local de perguntas (em produção, usar Redis)
        self._question_cache: Dict[str, Dict] = {}
    
    async def analyze_message(
        self,
        message: str,
        agent_id: str,
        tenant_id: str,
        ticket_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Analisa uma mensagem para detectar perguntas.
        
        Retorna dados da pergunta se detectada, None se não for pergunta.
        """
        # Primeiro, verifica rapidamente se parece uma pergunta
        if not self._looks_like_question(message):
            return None
        
        # Analisa com LLM
        analysis = await self._analyze_question(message)
        
        if not analysis.get("is_question"):
            return None
        
        question_data = {
            "original": message,
            "normalized": analysis.get("normalized_question"),
            "category": analysis.get("category"),
            "suggested_answer": analysis.get("suggested_answer"),
            "confidence": analysis.get("confidence", 0.5),
            "agent_id": agent_id,
            "tenant_id": tenant_id,
            "ticket_id": ticket_id,
            "detected_at": datetime.now().isoformat()
        }
        
        logger.info("question_detected",
            category=analysis.get("category"),
            confidence=analysis.get("confidence")
        )
        
        return question_data
    
    def _looks_like_question(self, message: str) -> bool:
        """Verificação rápida se a mensagem parece uma pergunta"""
        message_lower = message.lower().strip()
        
        # Termina com ?
        if message.strip().endswith("?"):
            return True
        
        # Começa com palavras interrogativas
        question_starters = [
            "qual", "quais", "como", "onde", "quando", "quanto", "quantos",
            "por que", "porque", "pq", "o que", "oq", "quem",
            "tem", "têm", "posso", "pode", "vocês", "vcs",
            "é possível", "da pra", "dá pra", "seria",
            "quanto custa", "qual o preço", "qual valor"
        ]
        
        for starter in question_starters:
            if message_lower.startswith(starter):
                return True
        
        return False
    
    async def _analyze_question(self, message: str) -> Dict[str, Any]:
        """Analisa a mensagem com LLM para extrair dados da pergunta"""
        prompt = f"""
Analise esta mensagem de um lead:

"{message}"

Responda em JSON:
{{
    "is_question": true/false,
    "normalized_question": "versão normalizada/limpa da pergunta (se for pergunta)",
    "category": "preco|produto|entrega|pagamento|garantia|horario|localizacao|geral",
    "suggested_answer": "uma resposta genérica sugerida (se possível)",
    "confidence": 0.0-1.0
}}

Se não for uma pergunta clara, retorne is_question: false.
"""
        
        try:
            response = await self.openai.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                max_tokens=500
            )
            
            return json.loads(response.choices[0].message.content)
            
        except Exception as e:
            logger.error("analyze_question_error", error=str(e))
            return {"is_question": False}
    
    async def find_similar_question(
        self,
        question: str,
        agent_id: str,
        tenant_id: str,
        threshold: float = 0.85
    ) -> Optional[Dict[str, Any]]:
        """
        Busca perguntas similares já detectadas.
        Usa embedding para comparação semântica.
        """
        try:
            # Gera embedding da pergunta
            embedding_response = await self.openai.embeddings.create(
                model=settings.openai_embedding_model,
                input=question
            )
            embedding = embedding_response.data[0].embedding
            
            # Aqui seria uma busca no banco/vector store
            # Por enquanto, retorna None (implementação futura com pgvector)
            
            return None
            
        except Exception as e:
            logger.error("find_similar_question_error", error=str(e))
            return None
    
    async def generate_answer_suggestion(
        self,
        question: str,
        agent_context: Dict[str, Any]
    ) -> str:
        """
        Gera uma sugestão de resposta para uma pergunta.
        Usa o contexto do agente (produtos, políticas, etc).
        """
        prompt = f"""
Gere uma resposta profissional para esta pergunta de um cliente:

Pergunta: {question}

Contexto do negócio:
- Produtos: {agent_context.get('products', ['produtos variados'])}
- Tom: {agent_context.get('tone', 'profissional e amigável')}

A resposta deve ser:
- Direta e objetiva
- Profissional mas amigável
- Sem inventar informações específicas (preços, prazos exatos)

Resposta:
"""
        
        try:
            response = await self.openai.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=300
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error("generate_answer_error", error=str(e))
            return ""
    
    def get_question_categories(self) -> Dict[str, str]:
        """Retorna categorias de perguntas disponíveis"""
        return {
            "preco": "Preços e Valores",
            "produto": "Produtos e Serviços",
            "entrega": "Entrega e Frete",
            "pagamento": "Formas de Pagamento",
            "garantia": "Garantia e Trocas",
            "horario": "Horário de Funcionamento",
            "localizacao": "Localização e Endereço",
            "geral": "Perguntas Gerais"
        }


# Singleton
question_detector = QuestionDetector()

