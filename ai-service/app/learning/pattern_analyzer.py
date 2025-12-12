"""
Analisador de Padrões de Conversa
Identifica padrões de sucesso para replicar
"""
from typing import Optional, Dict, Any, List
from datetime import datetime
import json
import structlog
from openai import AsyncOpenAI

from app.config import get_settings

logger = structlog.get_logger()
settings = get_settings()


class PatternAnalyzer:
    """
    Analisa conversas para identificar padrões de sucesso.
    
    Tipos de padrões:
    - Abertura: Como iniciar conversa
    - Qualificação: Perguntas que qualificam
    - Objeções: Respostas que superam objeções
    - Agendamento: Técnicas de fechamento de agenda
    - Follow-up: Mensagens de retomada
    """
    
    def __init__(self):
        self.openai = AsyncOpenAI(
            api_key=settings.openai_api_key,
            project=settings.openai_project_id if settings.openai_project_id else None
        )
    
    async def analyze_conversation(
        self,
        messages: List[Dict[str, Any]],
        outcome: str,
        agent_id: str,
        tenant_id: str
    ) -> Dict[str, Any]:
        """
        Analisa uma conversa completa e extrai padrões.
        
        Args:
            messages: Lista de mensagens da conversa
            outcome: Resultado (scheduled, purchased, lost, etc)
            agent_id: ID do agente
            tenant_id: ID do tenant
        
        Returns:
            Padrões identificados e métricas
        """
        if len(messages) < 3:
            return {"patterns": [], "reason": "conversation_too_short"}
        
        # Determina se foi sucesso ou fracasso
        is_success = outcome in ["scheduled", "purchased", "qualified", "converted"]
        
        # Formata conversa para análise
        formatted = self._format_conversation(messages)
        
        # Analisa com LLM
        patterns = await self._extract_patterns(formatted, outcome, is_success)
        
        logger.info("conversation_analyzed",
            outcome=outcome,
            is_success=is_success,
            patterns_found=len(patterns.get("patterns", []))
        )
        
        return patterns
    
    def _format_conversation(self, messages: List[Dict]) -> str:
        """Formata mensagens para análise"""
        lines = []
        for i, msg in enumerate(messages, 1):
            sender = msg.get("sender_type", "unknown")
            content = msg.get("content") or msg.get("message", "")
            timestamp = msg.get("timestamp", "")
            
            sender_label = "🤖 AGENTE" if sender in ["ia", "agent"] else "👤 LEAD"
            lines.append(f"{i}. [{sender_label}]: {content}")
        
        return "\n".join(lines)
    
    async def _extract_patterns(
        self,
        conversation: str,
        outcome: str,
        is_success: bool
    ) -> Dict[str, Any]:
        """Extrai padrões da conversa usando LLM"""
        
        if is_success:
            prompt = f"""
Analise esta conversa que terminou em SUCESSO ({outcome}).
Identifique os padrões e técnicas que levaram ao sucesso.

CONVERSA:
{conversation}

Extraia em JSON:
{{
    "patterns": [
        {{
            "type": "greeting|qualification|objection_handling|scheduling|follow_up|closing|rapport",
            "name": "nome descritivo do padrão",
            "trigger": "situação ou frase do lead que ativou",
            "response": "resposta do agente que funcionou",
            "why_worked": "por que funcionou",
            "replicable": true/false
        }}
    ],
    "key_moments": [
        {{
            "moment": "descrição do momento decisivo",
            "impact": "impacto no resultado"
        }}
    ],
    "overall_strategy": "estratégia geral usada",
    "success_factors": ["fatores que contribuíram para o sucesso"]
}}
"""
        else:
            prompt = f"""
Analise esta conversa que terminou em FRACASSO ({outcome}).
Identifique o que poderia ter sido feito diferente.

CONVERSA:
{conversation}

Extraia em JSON:
{{
    "patterns": [
        {{
            "type": "missed_opportunity|wrong_response|timing_issue|lack_of_follow_up",
            "name": "nome do problema",
            "moment": "momento onde ocorreu",
            "what_happened": "o que aconteceu",
            "better_approach": "abordagem melhor",
            "lesson": "lição para o futuro"
        }}
    ],
    "critical_errors": ["erros críticos cometidos"],
    "improvement_suggestions": ["sugestões de melhoria"]
}}
"""
        
        try:
            response = await self.openai.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                max_tokens=1500
            )
            
            result = json.loads(response.choices[0].message.content)
            result["is_success"] = is_success
            result["outcome"] = outcome
            result["analyzed_at"] = datetime.now().isoformat()
            
            return result
            
        except Exception as e:
            logger.error("extract_patterns_error", error=str(e))
            return {"patterns": [], "error": str(e)}
    
    async def find_applicable_pattern(
        self,
        lead_message: str,
        context: Dict[str, Any],
        agent_id: str,
        tenant_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Busca um padrão aplicável para a situação atual.
        
        Retorna o padrão mais relevante com sugestão de resposta.
        """
        # Aqui buscaria padrões salvos no banco
        # Por enquanto, retorna None (implementação futura)
        
        return None
    
    async def suggest_response_improvement(
        self,
        original_response: str,
        lead_message: str,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Sugere melhorias para uma resposta baseado em padrões conhecidos.
        """
        prompt = f"""
Analise esta resposta do agente e sugira melhorias:

Mensagem do lead: {lead_message}
Resposta do agente: {original_response}
Contexto: {json.dumps(context, ensure_ascii=False)}

Responda em JSON:
{{
    "score": 0-10,
    "strengths": ["pontos fortes"],
    "weaknesses": ["pontos fracos"],
    "improved_response": "versão melhorada da resposta",
    "tips": ["dicas para melhorar"]
}}
"""
        
        try:
            response = await self.openai.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                max_tokens=800
            )
            
            return json.loads(response.choices[0].message.content)
            
        except Exception as e:
            logger.error("suggest_improvement_error", error=str(e))
            return {"score": 0, "error": str(e)}
    
    def get_pattern_types(self) -> Dict[str, str]:
        """Retorna tipos de padrões disponíveis"""
        return {
            "greeting": "Saudação e Abertura",
            "qualification": "Qualificação de Lead",
            "objection_handling": "Tratamento de Objeções",
            "scheduling": "Agendamento de Reunião",
            "follow_up": "Follow-up e Retomada",
            "closing": "Fechamento",
            "rapport": "Construção de Rapport",
            "rescue": "Resgate de Lead Frio"
        }


# Singleton
pattern_analyzer = PatternAnalyzer()

