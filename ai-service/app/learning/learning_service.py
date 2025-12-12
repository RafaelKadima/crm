"""
Serviço Principal de Aprendizado
Processa feedbacks e melhora o agente continuamente
"""
from typing import Optional, Dict, Any, List
from datetime import datetime
import json
import structlog
from openai import AsyncOpenAI

from app.config import get_settings
from app.rag.vector_store import vector_store

logger = structlog.get_logger()
settings = get_settings()


class LearningService:
    """
    Serviço de aprendizado contínuo do agente.
    
    Responsabilidades:
    1. Processar feedbacks positivos/negativos
    2. Ajustar respostas baseado em correções
    3. Detectar padrões de sucesso
    4. Atualizar memória longa do lead
    """
    
    def __init__(self):
        self.openai = AsyncOpenAI(
            api_key=settings.openai_api_key,
            project=settings.openai_project_id if settings.openai_project_id else None
        )
    
    async def process_feedback(
        self,
        feedback_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Processa um feedback de mensagem.
        
        Se positivo: Reforça o padrão
        Se negativo: Aprende com a correção
        """
        rating = feedback_data.get("rating")
        original = feedback_data.get("original_response", "")
        corrected = feedback_data.get("corrected_response")
        lead_message = feedback_data.get("lead_message", "")
        intent = feedback_data.get("detected_intent")
        agent_id = feedback_data.get("agent_id")
        tenant_id = feedback_data.get("tenant_id")
        
        result = {
            "processed": True,
            "learning_type": rating,
            "actions_taken": []
        }
        
        try:
            if rating == "positive":
                # Reforça o padrão - pode criar embedding da resposta boa
                await self._reinforce_positive_pattern(
                    lead_message=lead_message,
                    response=original,
                    intent=intent,
                    agent_id=agent_id,
                    tenant_id=tenant_id
                )
                result["actions_taken"].append("positive_pattern_reinforced")
                
            elif rating == "negative" and corrected:
                # Aprende com a correção
                await self._learn_from_correction(
                    lead_message=lead_message,
                    wrong_response=original,
                    correct_response=corrected,
                    intent=intent,
                    agent_id=agent_id,
                    tenant_id=tenant_id
                )
                result["actions_taken"].append("correction_learned")
            
            logger.info("feedback_processed",
                rating=rating,
                agent_id=agent_id,
                actions=result["actions_taken"]
            )
            
        except Exception as e:
            logger.error("feedback_processing_error", error=str(e))
            result["error"] = str(e)
        
        return result
    
    async def _reinforce_positive_pattern(
        self,
        lead_message: str,
        response: str,
        intent: Optional[str],
        agent_id: str,
        tenant_id: str
    ):
        """
        Reforça um padrão positivo criando embedding para RAG.
        Isso faz com que respostas similares sejam sugeridas no futuro.
        """
        # Cria um "conhecimento" a partir da interação bem-sucedida
        knowledge_text = f"""
Pergunta/Situação: {lead_message}
Resposta Ideal: {response}
Intenção: {intent or 'geral'}
"""
        
        # Gera embedding
        embedding_response = await self.openai.embeddings.create(
            model=settings.openai_embedding_model,
            input=knowledge_text
        )
        embedding = embedding_response.data[0].embedding
        
        # Salva no vector store como conhecimento aprendido
        await vector_store.save_learned_knowledge(
            tenant_id=tenant_id,
            agent_id=agent_id,
            content=knowledge_text,
            embedding=embedding,
            source="positive_feedback",
            metadata={
                "intent": intent,
                "original_message": lead_message[:200],
                "learned_at": datetime.now().isoformat()
            }
        )
    
    async def _learn_from_correction(
        self,
        lead_message: str,
        wrong_response: str,
        correct_response: str,
        intent: Optional[str],
        agent_id: str,
        tenant_id: str
    ):
        """
        Aprende com uma correção, criando conhecimento da resposta correta.
        """
        # Analisa a diferença para entender o erro
        analysis_prompt = f"""
Analise a correção feita pelo usuário:

Mensagem do lead: {lead_message}
Resposta errada do agente: {wrong_response}
Resposta correta (correção): {correct_response}

Identifique:
1. O que estava errado na resposta original?
2. Por que a correção é melhor?
3. Que regra podemos extrair para evitar esse erro no futuro?

Responda em JSON:
{{"error_type": "...", "lesson": "...", "rule": "..."}}
"""
        
        try:
            analysis = await self.openai.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": analysis_prompt}],
                response_format={"type": "json_object"}
            )
            
            lesson = json.loads(analysis.choices[0].message.content)
            
            # Cria conhecimento com a correção
            knowledge_text = f"""
## Correção de Resposta

Situação: {lead_message}
❌ Resposta Incorreta: {wrong_response}
✅ Resposta Correta: {correct_response}

Regra aprendida: {lesson.get('rule', '')}
Tipo de erro: {lesson.get('error_type', '')}
"""
            
            # Gera embedding
            embedding_response = await self.openai.embeddings.create(
                model=settings.openai_embedding_model,
                input=knowledge_text
            )
            embedding = embedding_response.data[0].embedding
            
            # Salva como conhecimento
            await vector_store.save_learned_knowledge(
                tenant_id=tenant_id,
                agent_id=agent_id,
                content=knowledge_text,
                embedding=embedding,
                source="correction_feedback",
                metadata={
                    "intent": intent,
                    "error_type": lesson.get("error_type"),
                    "learned_at": datetime.now().isoformat()
                }
            )
            
            logger.info("correction_learned",
                error_type=lesson.get("error_type"),
                agent_id=agent_id
            )
            
        except Exception as e:
            logger.error("learn_from_correction_error", error=str(e))
    
    async def update_lead_memory(
        self,
        lead_id: str,
        tenant_id: str,
        conversation_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Atualiza a memória de longo prazo do lead baseado na conversa.
        """
        messages = conversation_data.get("messages", [])
        outcome = conversation_data.get("outcome")  # scheduled, purchased, lost, etc
        
        # Analisa a conversa para extrair insights
        analysis_prompt = f"""
Analise esta conversa e extraia insights sobre o lead:

Conversa:
{self._format_messages_for_analysis(messages)}

Resultado: {outcome or 'em andamento'}

Extraia em JSON:
{{
    "interests": ["lista de interesses detectados"],
    "pain_points": ["dores/problemas mencionados"],
    "objections": ["objeções levantadas"],
    "communication_style": "formal|informal|direto|detalhista",
    "decision_pattern": "rapido|pesquisador|consulta_outros",
    "conversion_probability": 0.0-1.0,
    "recommended_approach": "abordagem recomendada para próximo contato"
}}
"""
        
        try:
            analysis = await self.openai.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": analysis_prompt}],
                response_format={"type": "json_object"}
            )
            
            insights = json.loads(analysis.choices[0].message.content)
            
            logger.info("lead_memory_updated",
                lead_id=lead_id,
                conversion_probability=insights.get("conversion_probability")
            )
            
            return {
                "success": True,
                "insights": insights
            }
            
        except Exception as e:
            logger.error("update_lead_memory_error", error=str(e))
            return {"success": False, "error": str(e)}
    
    def _format_messages_for_analysis(self, messages: List[Dict]) -> str:
        """Formata mensagens para análise"""
        formatted = []
        for msg in messages[-20:]:  # Últimas 20 mensagens
            sender = msg.get("sender_type", "unknown")
            content = msg.get("content") or msg.get("message", "")
            formatted.append(f"[{sender}]: {content}")
        return "\n".join(formatted)
    
    async def analyze_successful_conversation(
        self,
        tenant_id: str,
        agent_id: str,
        conversation_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Analisa uma conversa bem-sucedida para extrair padrões.
        """
        messages = conversation_data.get("messages", [])
        outcome = conversation_data.get("outcome")
        
        if outcome not in ["scheduled", "purchased", "qualified"]:
            return {"analyzed": False, "reason": "not_successful_outcome"}
        
        # Extrai padrões da conversa
        analysis_prompt = f"""
Esta conversa terminou em sucesso ({outcome}). Analise e extraia padrões replicáveis:

Conversa:
{self._format_messages_for_analysis(messages)}

Extraia em JSON:
{{
    "patterns": [
        {{
            "type": "greeting|qualification|objection_handling|scheduling|closing",
            "trigger": "frase ou situação que ativou o padrão",
            "successful_response": "resposta que funcionou",
            "why_it_worked": "por que funcionou"
        }}
    ],
    "key_moments": ["momentos decisivos na conversa"],
    "best_practices": ["práticas que podem ser replicadas"]
}}
"""
        
        try:
            analysis = await self.openai.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": analysis_prompt}],
                response_format={"type": "json_object"}
            )
            
            patterns = json.loads(analysis.choices[0].message.content)
            
            logger.info("successful_conversation_analyzed",
                agent_id=agent_id,
                patterns_found=len(patterns.get("patterns", []))
            )
            
            return {
                "analyzed": True,
                "patterns": patterns
            }
            
        except Exception as e:
            logger.error("analyze_conversation_error", error=str(e))
            return {"analyzed": False, "error": str(e)}


# Singleton
learning_service = LearningService()

