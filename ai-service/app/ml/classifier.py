"""
Machine Learning - Classificação e Predição
"""
from typing import List, Dict, Any, Optional, Tuple
import json
import structlog
from openai import AsyncOpenAI

from app.config import get_settings
from app.models.schemas import (
    LeadTemperature, LeadPrediction, IntentClassification,
    Qualification, Message, LeadInfo
)

logger = structlog.get_logger()
settings = get_settings()


class MLClassifier:
    """
    Classificador ML usando LLM para:
    - Classificação de leads (quente/morno/frio)
    - Detecção de intenção
    - Qualificação automática
    - Predição de conversão
    """
    
    def __init__(self):
        self.openai = AsyncOpenAI(api_key=settings.openai_api_key)
    
    async def classify_intent(
        self,
        message: str,
        history: List[Message] = None,
        context: str = ""
    ) -> IntentClassification:
        """
        Classifica a intenção da mensagem do lead.
        """
        history_text = ""
        if history:
            history_text = "\n".join([
                f"{'Lead' if m.sender_type.value == 'contact' else 'Agente'}: {m.content}"
                for m in history[-5:]
            ])
        
        prompt = f"""Analise a mensagem do lead e classifique a intenção principal.

Histórico recente:
{history_text}

Mensagem atual do lead: "{message}"

{f"Contexto adicional: {context}" if context else ""}

Classifique em uma das seguintes intenções:
- greeting: saudação inicial
- question_product: pergunta sobre produto/serviço
- question_price: pergunta sobre preço
- question_payment: pergunta sobre pagamento/condições
- objection: objeção ou resistência
- interest: demonstração de interesse
- scheduling: interesse em agendar reunião/demo
- complaint: reclamação
- support: pedido de suporte
- goodbye: despedida
- unclear: não está claro
- other: outra intenção

Responda APENAS em JSON:
{{"intent": "nome_da_intencao", "confidence": 0.0-1.0, "entities": {{"chave": "valor"}}}}"""

        try:
            response = await self.openai.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=200,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            
            return IntentClassification(
                intent=result.get("intent", "unclear"),
                confidence=float(result.get("confidence", 0.5)),
                alternatives=result.get("alternatives", [])
            )
            
        except Exception as e:
            logger.error("classify_intent_error", error=str(e))
            return IntentClassification(intent="unclear", confidence=0.0)
    
    async def qualify_lead(
        self,
        lead: LeadInfo,
        messages: List[Message],
        context: str = ""
    ) -> Qualification:
        """
        Qualifica o lead baseado na conversa.
        Usa metodologia BANT + detecção de dores.
        """
        conversation = "\n".join([
            f"{'Lead' if m.sender_type.value == 'contact' else 'Agente'}: {m.content}"
            for m in messages[-20:]
        ])
        
        prompt = f"""Analise a conversa e qualifique o lead usando a metodologia BANT.

Lead: {lead.name}
Estágio atual: {lead.stage_name or 'Novo'}

Conversa:
{conversation}

{f"Contexto adicional: {context}" if context else ""}

Avalie:
1. Temperatura do lead (hot/warm/cold)
2. Score de 0-100
3. Dores identificadas
4. Interesses demonstrados
5. Objeções levantadas
6. Se mencionou orçamento
7. Se mencionou prazo/timeline
8. Se é tomador de decisão
9. Produto de interesse

Responda APENAS em JSON:
{{
    "temperature": "hot|warm|cold",
    "score": 0-100,
    "pain_points": ["dor1", "dor2"],
    "interests": ["interesse1"],
    "objections": ["objeção1"],
    "budget_mentioned": true|false,
    "timeline_mentioned": true|false,
    "decision_maker": true|false,
    "product_interest": "nome do produto ou null"
}}"""

        try:
            response = await self.openai.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=500,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            
            temp_map = {
                "hot": LeadTemperature.HOT,
                "warm": LeadTemperature.WARM,
                "cold": LeadTemperature.COLD
            }
            
            return Qualification(
                temperature=temp_map.get(result.get("temperature", ""), LeadTemperature.UNKNOWN),
                score=float(result.get("score", 0)),
                pain_points=result.get("pain_points", []),
                interests=result.get("interests", []),
                objections=result.get("objections", []),
                budget_mentioned=result.get("budget_mentioned", False),
                timeline_mentioned=result.get("timeline_mentioned", False),
                decision_maker=result.get("decision_maker", False),
                product_interest=result.get("product_interest")
            )
            
        except Exception as e:
            logger.error("qualify_lead_error", error=str(e))
            return Qualification()
    
    async def predict_lead(
        self,
        lead: LeadInfo,
        qualification: Qualification,
        messages: List[Message]
    ) -> LeadPrediction:
        """
        Prediz comportamento futuro do lead.
        """
        # Métricas básicas
        total_messages = len(messages)
        lead_messages = len([m for m in messages if m.sender_type.value == "contact"])
        response_rate = lead_messages / total_messages if total_messages > 0 else 0
        
        # Análise de engajamento
        engagement_score = min(100, (
            qualification.score * 0.4 +
            (30 if qualification.budget_mentioned else 0) +
            (20 if qualification.timeline_mentioned else 0) +
            (response_rate * 50)
        ))
        
        # Probabilidade de conversão baseada na temperatura
        conversion_base = {
            LeadTemperature.HOT: 0.7,
            LeadTemperature.WARM: 0.4,
            LeadTemperature.COLD: 0.15,
            LeadTemperature.UNKNOWN: 0.25
        }
        conversion_prob = conversion_base.get(qualification.temperature, 0.25)
        
        # Ajusta pela qualificação
        if qualification.decision_maker:
            conversion_prob += 0.1
        if qualification.objections:
            conversion_prob -= 0.05 * len(qualification.objections)
        
        conversion_prob = max(0, min(1, conversion_prob))
        
        # Risco de churn
        churn_risk = 0.5 - (engagement_score / 200)  # base 0.5, reduz com engajamento
        if qualification.temperature == LeadTemperature.COLD:
            churn_risk += 0.2
        
        churn_risk = max(0, min(1, churn_risk))
        
        # Ações recomendadas
        recommended_actions = []
        
        if qualification.temperature == LeadTemperature.HOT:
            recommended_actions.append("Agendar reunião de fechamento")
            recommended_actions.append("Enviar proposta comercial")
        elif qualification.temperature == LeadTemperature.WARM:
            recommended_actions.append("Qualificar melhor as necessidades")
            recommended_actions.append("Apresentar cases de sucesso")
        else:
            recommended_actions.append("Fazer follow-up em 3 dias")
            recommended_actions.append("Enviar conteúdo educativo")
        
        if qualification.objections:
            recommended_actions.append("Tratar objeções identificadas")
        
        if not qualification.budget_mentioned:
            recommended_actions.append("Sondar orçamento disponível")
        
        return LeadPrediction(
            conversion_probability=conversion_prob,
            churn_risk=churn_risk,
            engagement_score=engagement_score,
            recommended_actions=recommended_actions,
            best_contact_time=None  # TODO: implementar análise de horários
        )
    
    async def detect_sentiment(self, message: str) -> Tuple[str, float]:
        """Detecta sentimento da mensagem"""
        prompt = f"""Analise o sentimento da mensagem:
"{message}"

Classifique como: positive, negative, neutral
E dê uma confiança de 0 a 1.

Responda em JSON: {{"sentiment": "...", "confidence": 0.0}}"""

        try:
            response = await self.openai.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=50,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            return result.get("sentiment", "neutral"), float(result.get("confidence", 0.5))
            
        except Exception as e:
            logger.error("detect_sentiment_error", error=str(e))
            return "neutral", 0.0
    
    async def should_transfer_to_human(
        self,
        messages: List[Message],
        qualification: Qualification,
        agent_attempts: int = 0
    ) -> Tuple[bool, str]:
        """
        Decide se deve transferir para um humano.
        """
        # Regras simples
        if agent_attempts > 3 and qualification.temperature == LeadTemperature.HOT:
            return True, "Lead quente com muitas interações - melhor um humano fechar"
        
        if len(qualification.objections) > 3:
            return True, "Muitas objeções - requer tratamento humano"
        
        # Análise via LLM para casos complexos
        if messages:
            last_messages = [m.content for m in messages[-5:] if m.sender_type.value == "contact"]
            
            keywords_human = ["falar com humano", "falar com pessoa", "atendente", 
                           "não entendo", "complicado", "desistir", "cancelar"]
            
            for msg in last_messages:
                if any(kw in msg.lower() for kw in keywords_human):
                    return True, "Lead solicitou atendimento humano"
        
        return False, ""


# Singleton
ml_classifier = MLClassifier()

