"""
Copywriter Agent Service
Agente de IA para criação de conteúdo viral (Reels, TikToks, Shorts)
"""

import json
import uuid
import structlog
from typing import Optional, List, Dict, Any
from datetime import datetime
from openai import OpenAI
from tavily import TavilyClient

from app.config import get_settings
from app.models.content_schemas import (
    ContentAgentStep, ChatResponse, ResearchResult,
    HookGenerationResponse, ReelGenerationResponse
)
from app.services.creators_storage import get_creators_storage
from app.services.transcription_service import get_transcription_service

logger = structlog.get_logger()
settings = get_settings()


class CopywriterAgentService:
    """
    Agente de IA para criação de conteúdo viral modelando criadores.

    Fluxo:
    1. Usuário pede um Reel sobre [tema]
    2. Agente pesquisa na web (Tavily) e gera relatório
    3. Usuário aprova relatório
    4. Agente lista criadores disponíveis
    5. Usuário seleciona criador
    6. Agente gera 10+ hooks no estilo do criador
    7. Usuário seleciona hook
    8. Agente escreve roteiro final em português
    """

    def __init__(self):
        self.openai_client = OpenAI(
            api_key=settings.openai_api_key,
            project=settings.openai_project_id if settings.openai_project_id else None,
        )
        self.tavily_client = TavilyClient(api_key=settings.tavily_api_key) if settings.tavily_api_key else None
        self.model = settings.openai_model or "gpt-4o-mini"
        self.storage = get_creators_storage()
        self.transcription_service = get_transcription_service()

    # =========================================================================
    # CHAT PRINCIPAL
    # =========================================================================

    async def chat(
        self,
        tenant_id: str,
        user_id: str,
        message: str,
        session_id: Optional[str] = None
    ) -> ChatResponse:
        """
        Processa mensagem do usuário e retorna resposta do agente.
        Gerencia o fluxo de criação de conteúdo em etapas.
        """
        logger.info("copywriter_chat", tenant_id=tenant_id, session_id=session_id, message=message[:50])

        # Cria ou recupera sessão
        if not session_id:
            session_id = await self.storage.create_session(tenant_id, user_id)
            session_data = {"messages": [], "current_step": ContentAgentStep.IDLE.value}
        else:
            session_data = await self.storage.get_session(session_id)
            if not session_data:
                session_id = await self.storage.create_session(tenant_id, user_id)
                session_data = {"messages": [], "current_step": ContentAgentStep.IDLE.value}

        # Adiciona mensagem do usuário
        await self.storage.add_message_to_session(
            session_id, "user", message, session_data.get("current_step")
        )

        # Processa baseado no estado atual
        current_step = ContentAgentStep(session_data.get("current_step", "idle"))

        if current_step == ContentAgentStep.IDLE:
            # Nova conversa - detecta intenção
            response = await self._handle_new_request(tenant_id, session_id, message, session_data)

        elif current_step == ContentAgentStep.RESEARCH:
            # Aguardando aprovação da pesquisa
            response = await self._handle_research_approval(tenant_id, session_id, message, session_data)

        elif current_step == ContentAgentStep.SELECT_CREATOR:
            # Aguardando seleção de criador
            response = await self._handle_creator_selection(tenant_id, session_id, message, session_data)

        elif current_step == ContentAgentStep.GENERATE_HOOKS:
            # Aguardando seleção de hook
            response = await self._handle_hook_selection(tenant_id, session_id, message, session_data)

        elif current_step == ContentAgentStep.WRITE_REEL:
            # Reel escrito, aguardando feedback
            response = await self._handle_reel_feedback(tenant_id, session_id, message, session_data)

        else:
            response = await self._handle_general_chat(tenant_id, session_id, message, session_data)

        # Salva resposta do assistente
        await self.storage.add_message_to_session(
            session_id, "assistant", response.message, response.current_step.value
        )

        return response

    # =========================================================================
    # HANDLERS POR ETAPA
    # =========================================================================

    async def _handle_new_request(
        self,
        tenant_id: str,
        session_id: str,
        message: str,
        session_data: Dict
    ) -> ChatResponse:
        """Processa nova requisição - detecta se quer criar conteúdo"""

        # Detecta intenção com IA
        intent_prompt = f"""Analise a mensagem do usuário e determine a intenção.

Mensagem: "{message}"

O usuário está pedindo para:
1. criar_reel - Criar um Reel/TikTok/Short sobre algum tema
2. pesquisar - Apenas pesquisar sobre um tema
3. listar_criadores - Ver criadores disponíveis
4. adicionar_criador - Adicionar novo criador
5. outro - Outra intenção

Retorne JSON: {{"intent": "criar_reel|pesquisar|listar_criadores|adicionar_criador|outro", "topic": "tema extraído se houver"}}"""

        response = self.openai_client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": intent_prompt}],
            temperature=0.3,
            response_format={"type": "json_object"}
        )
        intent_data = json.loads(response.choices[0].message.content)
        intent = intent_data.get("intent", "outro")
        topic = intent_data.get("topic", "")

        if intent == "criar_reel" and topic:
            # Inicia fluxo de criação
            return await self._start_research_phase(tenant_id, session_id, topic)

        elif intent == "listar_criadores":
            creators = await self.storage.list_creators(tenant_id)
            if not creators:
                msg = "Você ainda não tem criadores cadastrados. Adicione criadores para modelar seus roteiros!"
            else:
                creator_list = "\n".join([f"• **{c['name']}** ({c['video_count']} vídeos)" for c in creators])
                msg = f"📚 **Criadores disponíveis:**\n\n{creator_list}\n\nQual deles você gostaria de modelar?"

            return ChatResponse(
                message=msg,
                session_id=session_id,
                current_step=ContentAgentStep.IDLE
            )

        elif intent == "adicionar_criador":
            return ChatResponse(
                message="Para adicionar um criador, use a página **Gerenciar Criadores** no menu lateral, ou me envie URLs de vídeos do criador que deseja adicionar.",
                session_id=session_id,
                current_step=ContentAgentStep.IDLE
            )

        else:
            # Resposta geral
            return await self._handle_general_chat(tenant_id, session_id, message, session_data)

    async def _start_research_phase(
        self,
        tenant_id: str,
        session_id: str,
        topic: str
    ) -> ChatResponse:
        """Inicia fase de pesquisa sobre o tema"""

        await self.storage.update_session(session_id, topic=topic, current_step=ContentAgentStep.RESEARCH.value)

        # Faz pesquisa com Tavily
        research_data = await self._do_research(topic)

        # Salva pesquisa na sessão
        await self.storage.update_session(session_id, research_data=research_data)

        # Formata relatório
        report = self._format_research_report(research_data)

        return ChatResponse(
            message=f"🔍 **Pesquisa concluída sobre: {topic}**\n\n{report}\n\n---\n\n✅ **Aprova este relatório para continuar?** Se quiser alterar algo, me diga!",
            session_id=session_id,
            current_step=ContentAgentStep.RESEARCH,
            requires_action=True,
            action_type="approve_research",
            metadata={"topic": topic, "research": research_data}
        )

    async def _handle_research_approval(
        self,
        tenant_id: str,
        session_id: str,
        message: str,
        session_data: Dict
    ) -> ChatResponse:
        """Processa aprovação ou alteração da pesquisa"""

        # Detecta se aprovou
        approval_check = f"""O usuário está aprovando a pesquisa ou pedindo alterações?

Mensagem: "{message}"

Retorne JSON: {{"approved": true/false, "changes_requested": "descrição das alterações se houver"}}"""

        response = self.openai_client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": approval_check}],
            temperature=0.3,
            response_format={"type": "json_object"}
        )
        result = json.loads(response.choices[0].message.content)

        if result.get("approved"):
            # Avança para seleção de criador
            creators = await self.storage.list_creators(tenant_id)

            if not creators:
                return ChatResponse(
                    message="❌ Você não tem criadores cadastrados para modelar. Adicione criadores primeiro na página **Gerenciar Criadores**.",
                    session_id=session_id,
                    current_step=ContentAgentStep.RESEARCH
                )

            await self.storage.update_session(session_id, current_step=ContentAgentStep.SELECT_CREATOR.value)

            creator_list = "\n".join([f"{i+1}. **{c['name']}** ({c['video_count']} vídeos)" for i, c in enumerate(creators)])

            return ChatResponse(
                message=f"✅ Pesquisa aprovada!\n\n📚 **Selecione um criador para modelar o estilo:**\n\n{creator_list}\n\nDigite o número ou nome do criador.",
                session_id=session_id,
                current_step=ContentAgentStep.SELECT_CREATOR,
                requires_action=True,
                action_type="select_creator",
                options=[{"id": c["id"], "name": c["name"], "video_count": c["video_count"]} for c in creators]
            )
        else:
            # Precisa refazer ou ajustar pesquisa
            changes = result.get("changes_requested", "")
            topic = session_data.get("topic", "")

            # Refaz pesquisa com foco nas alterações
            research_data = await self._do_research(f"{topic} - foco em: {changes}")
            await self.storage.update_session(session_id, research_data=research_data)

            report = self._format_research_report(research_data)

            return ChatResponse(
                message=f"🔄 **Pesquisa atualizada:**\n\n{report}\n\n---\n\n✅ **Aprova agora?**",
                session_id=session_id,
                current_step=ContentAgentStep.RESEARCH,
                requires_action=True,
                action_type="approve_research"
            )

    async def _handle_creator_selection(
        self,
        tenant_id: str,
        session_id: str,
        message: str,
        session_data: Dict
    ) -> ChatResponse:
        """Processa seleção de criador"""

        creators = await self.storage.list_creators(tenant_id)
        selected_creator = None

        # Tenta identificar criador por número ou nome
        msg_lower = message.lower().strip()

        # Por número
        try:
            num = int(message.strip()) - 1
            if 0 <= num < len(creators):
                selected_creator = creators[num]
        except ValueError:
            pass

        # Por nome
        if not selected_creator:
            for c in creators:
                if c["name"].lower() in msg_lower or msg_lower in c["name"].lower():
                    selected_creator = c
                    break

        if not selected_creator:
            creator_list = "\n".join([f"{i+1}. **{c['name']}**" for i, c in enumerate(creators)])
            return ChatResponse(
                message=f"❌ Não encontrei esse criador. Escolha um da lista:\n\n{creator_list}",
                session_id=session_id,
                current_step=ContentAgentStep.SELECT_CREATOR
            )

        # Salva criador selecionado
        await self.storage.update_session(
            session_id,
            selected_creator=selected_creator["name"],
            current_step=ContentAgentStep.GENERATE_HOOKS.value
        )

        # Gera hooks
        hooks = await self._generate_hooks(
            tenant_id,
            session_data.get("topic", ""),
            selected_creator["name"],
            session_data.get("research_data", {})
        )

        await self.storage.update_session(session_id, generated_hooks=hooks)

        hooks_list = "\n".join([f"{i+1}. {h}" for i, h in enumerate(hooks)])

        return ChatResponse(
            message=f"✅ Criador **{selected_creator['name']}** selecionado!\n\n🎯 **Hooks gerados no estilo do criador:**\n\n{hooks_list}\n\n---\n\nDigite o **número** do hook que você prefere.",
            session_id=session_id,
            current_step=ContentAgentStep.GENERATE_HOOKS,
            requires_action=True,
            action_type="select_hook",
            options=[{"index": i, "text": h} for i, h in enumerate(hooks)]
        )

    async def _handle_hook_selection(
        self,
        tenant_id: str,
        session_id: str,
        message: str,
        session_data: Dict
    ) -> ChatResponse:
        """Processa seleção de hook"""

        hooks = session_data.get("generated_hooks", [])
        selected_hook = None

        # Tenta identificar por número
        try:
            num = int(message.strip()) - 1
            if 0 <= num < len(hooks):
                selected_hook = hooks[num]
        except ValueError:
            # Tenta encontrar por texto parcial
            msg_lower = message.lower()
            for h in hooks:
                if msg_lower in h.lower():
                    selected_hook = h
                    break

        if not selected_hook:
            return ChatResponse(
                message="❌ Não entendi qual hook você escolheu. Digite o **número** (1-10) do hook desejado.",
                session_id=session_id,
                current_step=ContentAgentStep.GENERATE_HOOKS
            )

        # Salva hook e gera reel
        await self.storage.update_session(
            session_id,
            selected_hook=selected_hook,
            current_step=ContentAgentStep.WRITE_REEL.value
        )

        # Gera roteiro final
        reel_script = await self._write_reel(
            tenant_id,
            session_data.get("topic", ""),
            selected_hook,
            session_data.get("selected_creator", ""),
            session_data.get("research_data", {})
        )

        await self.storage.update_session(session_id, final_reel=reel_script)

        return ChatResponse(
            message=f"✨ **Roteiro finalizado!**\n\n---\n\n{reel_script}\n\n---\n\n📋 **Contagem:** ~{len(reel_script.split())} palavras\n\n👍 O que achou? Posso ajustar algo?",
            session_id=session_id,
            current_step=ContentAgentStep.WRITE_REEL,
            final_content=reel_script
        )

    async def _handle_reel_feedback(
        self,
        tenant_id: str,
        session_id: str,
        message: str,
        session_data: Dict
    ) -> ChatResponse:
        """Processa feedback sobre o reel gerado"""

        # Detecta se quer novo reel, ajuste ou está satisfeito
        feedback_check = f"""O usuário está:
1. satisfeito - Gostou do roteiro
2. ajustar - Quer ajustes específicos
3. novo - Quer criar outro conteúdo
4. outro

Mensagem: "{message}"

Retorne JSON: {{"action": "satisfeito|ajustar|novo|outro", "adjustment": "o que ajustar se for ajustar"}}"""

        response = self.openai_client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": feedback_check}],
            temperature=0.3,
            response_format={"type": "json_object"}
        )
        result = json.loads(response.choices[0].message.content)
        action = result.get("action")

        if action == "satisfeito":
            await self.storage.update_session(session_id, current_step=ContentAgentStep.COMPLETED.value)
            return ChatResponse(
                message="🎉 Ótimo! Fico feliz que gostou! Se precisar de mais conteúdo, é só pedir!",
                session_id=session_id,
                current_step=ContentAgentStep.COMPLETED
            )

        elif action == "ajustar":
            adjustment = result.get("adjustment", message)
            # Reescreve com ajustes
            reel_script = await self._adjust_reel(
                session_data.get("final_reel", ""),
                adjustment,
                session_data.get("selected_creator", "")
            )
            await self.storage.update_session(session_id, final_reel=reel_script)

            return ChatResponse(
                message=f"✏️ **Roteiro ajustado:**\n\n---\n\n{reel_script}\n\n---\n\n👍 Melhor agora?",
                session_id=session_id,
                current_step=ContentAgentStep.WRITE_REEL,
                final_content=reel_script
            )

        elif action == "novo":
            # Reset para novo conteúdo
            await self.storage.update_session(session_id, current_step=ContentAgentStep.IDLE.value)
            return ChatResponse(
                message="🆕 Certo! Sobre o que você gostaria de criar o próximo conteúdo?",
                session_id=session_id,
                current_step=ContentAgentStep.IDLE
            )

        else:
            return await self._handle_general_chat(tenant_id, session_id, message, session_data)

    async def _handle_general_chat(
        self,
        tenant_id: str,
        session_id: str,
        message: str,
        session_data: Dict
    ) -> ChatResponse:
        """Resposta geral para mensagens fora do fluxo"""

        prompt = f"""Você é um copywriter sênior especializado em criação de Reels virais.

O usuário enviou: "{message}"

Responda de forma amigável e direcione para criar conteúdo. Você pode:
- Criar Reels/TikToks/Shorts sobre qualquer tema
- Pesquisar informações para o roteiro
- Modelar o estilo de criadores cadastrados

Responda em português brasileiro, de forma concisa."""

        response = self.openai_client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7
        )

        return ChatResponse(
            message=response.choices[0].message.content,
            session_id=session_id,
            current_step=ContentAgentStep(session_data.get("current_step", "idle"))
        )

    # =========================================================================
    # FUNÇÕES DE PESQUISA E GERAÇÃO
    # =========================================================================

    async def _do_research(self, topic: str) -> Dict[str, Any]:
        """Pesquisa sobre um tema usando Tavily"""

        if not self.tavily_client:
            # Fallback se Tavily não configurado
            return await self._research_with_openai(topic)

        try:
            # Pesquisa principal
            search_result = self.tavily_client.search(
                query=f"{topic} fatos curiosos estatísticas",
                search_depth="advanced",
                max_results=5,
                include_answer=True
            )

            facts = []
            sources = []

            if search_result.get("answer"):
                facts.append(search_result["answer"])

            for result in search_result.get("results", []):
                facts.append(result.get("content", "")[:500])
                sources.append(result.get("url", ""))

            # Processa com IA para extrair insights
            return await self._process_research_results(topic, facts, sources)

        except Exception as e:
            logger.error("tavily_search_failed", error=str(e))
            return await self._research_with_openai(topic)

    async def _research_with_openai(self, topic: str) -> Dict[str, Any]:
        """Pesquisa usando apenas OpenAI (fallback)"""

        prompt = f"""Você é um pesquisador especializado em criar conteúdo viral.

Pesquise sobre o tema: "{topic}"

Gere um relatório com:
1. Explicação geral do assunto
2. 5-7 fatos curiosos e interessantes
3. Dados e estatísticas relevantes
4. Objeções ou limitações comuns

Retorne JSON:
{{
    "topic": "{topic}",
    "summary": "Resumo geral",
    "facts": ["fato 1", "fato 2", ...],
    "statistics": ["estatística 1", ...],
    "interesting_points": ["ponto interessante 1", ...],
    "objections": ["objeção 1", ...],
    "sources": []
}}

Responda APENAS com JSON."""

        response = self.openai_client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            response_format={"type": "json_object"}
        )

        return json.loads(response.choices[0].message.content)

    async def _process_research_results(
        self,
        topic: str,
        facts: List[str],
        sources: List[str]
    ) -> Dict[str, Any]:
        """Processa resultados da pesquisa em formato estruturado"""

        prompt = f"""Analise estas informações sobre "{topic}" e organize em um relatório para criação de conteúdo viral:

INFORMAÇÕES BRUTAS:
{chr(10).join(facts)}

Organize em JSON:
{{
    "topic": "{topic}",
    "summary": "Resumo conciso e interessante",
    "facts": ["fato curioso 1", "fato curioso 2", ...],
    "statistics": ["dado estatístico 1", ...],
    "interesting_points": ["ponto que gera curiosidade 1", ...],
    "objections": ["limitação ou contra-argumento 1", ...],
    "hook_ideas": ["ideia de gancho 1", "ideia de gancho 2", ...]
}}

Foque em informações DOPAMINÉRGICAS e surpreendentes, não óbvias."""

        response = self.openai_client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            response_format={"type": "json_object"}
        )

        result = json.loads(response.choices[0].message.content)
        result["sources"] = sources
        return result

    def _format_research_report(self, research_data: Dict[str, Any]) -> str:
        """Formata relatório de pesquisa em markdown"""

        topic = research_data.get("topic", "")
        summary = research_data.get("summary", "")
        facts = research_data.get("facts", [])
        statistics = research_data.get("statistics", [])
        interesting = research_data.get("interesting_points", [])
        sources = research_data.get("sources", [])

        report = f"**📌 Tema:** {topic}\n\n"
        report += f"**📝 Resumo:** {summary}\n\n"

        if facts:
            report += "**🔥 Fatos Curiosos:**\n"
            for f in facts[:5]:
                report += f"• {f}\n"
            report += "\n"

        if statistics:
            report += "**📊 Dados e Estatísticas:**\n"
            for s in statistics[:3]:
                report += f"• {s}\n"
            report += "\n"

        if interesting:
            report += "**💡 Pontos Interessantes:**\n"
            for p in interesting[:3]:
                report += f"• {p}\n"
            report += "\n"

        if sources:
            report += "**🔗 Fontes:**\n"
            for s in sources[:3]:
                report += f"• {s}\n"

        return report

    async def _generate_hooks(
        self,
        tenant_id: str,
        topic: str,
        creator_name: str,
        research_data: Dict[str, Any]
    ) -> List[str]:
        """Gera hooks no estilo do criador"""

        # Busca transcrições do criador
        transcriptions = await self.storage.get_creator_transcriptions(tenant_id, creator_name)

        if not transcriptions:
            transcriptions_context = "Nenhuma transcrição disponível. Crie hooks criativos e impactantes."
        else:
            # Usa até 3 transcrições como referência
            transcriptions_context = "\n\n---\n\n".join(transcriptions[:3])

        prompt = f"""Você é um copywriter sênior. Crie hooks para um Reel sobre "{topic}".

ESTILO DO CRIADOR ({creator_name}):
{transcriptions_context}

PESQUISA SOBRE O TEMA:
{json.dumps(research_data, ensure_ascii=False, indent=2)}

REGRAS:
1. Gere exatamente 10 hooks diferentes
2. Os hooks devem ser a PRIMEIRA FRASE do Reel (3-5 segundos)
3. Imite o estilo do criador: vocabulário, tom, estrutura de frases
4. Use os fatos curiosos da pesquisa como base
5. Hooks devem ser em PORTUGUÊS BRASILEIRO
6. Cada hook deve gerar curiosidade imediata

Tipos de hooks para variar:
- Pergunta provocativa
- Afirmação chocante
- Curiosidade (Você sabia que...)
- Contraste (Todo mundo pensa X, mas...)
- História pessoal (Eu descobri que...)

Retorne JSON: {{"hooks": ["hook 1", "hook 2", ..., "hook 10"]}}"""

        response = self.openai_client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.9,
            response_format={"type": "json_object"}
        )

        result = json.loads(response.choices[0].message.content)
        return result.get("hooks", [])

    async def _write_reel(
        self,
        tenant_id: str,
        topic: str,
        hook: str,
        creator_name: str,
        research_data: Dict[str, Any]
    ) -> str:
        """Escreve roteiro completo do Reel"""

        # Busca transcrições do criador
        transcriptions = await self.storage.get_creator_transcriptions(tenant_id, creator_name)

        if not transcriptions:
            transcriptions_context = ""
        else:
            transcriptions_context = f"\n\nEXEMPLOS DO CRIADOR ({creator_name}):\n" + "\n\n---\n\n".join(transcriptions[:2])

        prompt = f"""Você é um copywriter sênior. Escreva um roteiro de Reel COMPLETO sobre "{topic}".

HOOK SELECIONADO:
{hook}

PESQUISA:
{json.dumps(research_data, ensure_ascii=False, indent=2)}
{transcriptions_context}

REGRAS IMPORTANTES:
1. Comece com o hook selecionado EXATAMENTE como está
2. Roteiro entre 150-250 palavras
3. Escrito em PORTUGUÊS BRASILEIRO
4. Imite o estilo do criador:
   - Comprimento das frases
   - Vocabulário
   - Tom de voz
   - Transições
5. Use informações da pesquisa
6. Termine com CTA (call to action) sutil

ESTRUTURA RECOMENDADA:
- Hook (3-5 segundos)
- Desenvolvimento com fatos interessantes (20-30 segundos)
- Clímax/Revelação principal (10 segundos)
- CTA final (5 segundos)

Escreva apenas o roteiro, sem títulos ou formatação extra."""

        response = self.openai_client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.8
        )

        return response.choices[0].message.content

    async def _adjust_reel(
        self,
        current_script: str,
        adjustment: str,
        creator_name: str
    ) -> str:
        """Ajusta roteiro existente baseado no feedback"""

        prompt = f"""Ajuste este roteiro de Reel:

ROTEIRO ATUAL:
{current_script}

AJUSTE SOLICITADO:
{adjustment}

Mantenha o estilo e tom, apenas faça o ajuste solicitado.
Retorne apenas o roteiro ajustado, sem explicações."""

        response = self.openai_client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7
        )

        return response.choices[0].message.content

    # =========================================================================
    # GERENCIAMENTO DE CRIADORES
    # =========================================================================

    async def add_creator(
        self,
        tenant_id: str,
        name: str,
        video_urls: List[str]
    ) -> Dict[str, Any]:
        """Adiciona novo criador com transcrições"""

        transcriptions = []

        for url in video_urls:
            try:
                result = self.transcription_service.process_video(url)
                transcriptions.append({
                    "video_url": result["video_url"],
                    "video_title": result["video_title"],
                    "transcription": result["transcription"],
                    "duration_seconds": result["duration_seconds"],
                    "platform": result["platform"],
                    "created_at": datetime.now().isoformat()
                })
            except Exception as e:
                logger.error("transcription_failed", url=url, error=str(e))

        creator = await self.storage.create_creator(tenant_id, name, transcriptions)

        return {
            "success": True,
            "creator": creator,
            "transcribed_count": len(transcriptions),
            "failed_count": len(video_urls) - len(transcriptions)
        }

    async def add_video_to_creator(
        self,
        tenant_id: str,
        creator_id: str,
        video_url: str
    ) -> Dict[str, Any]:
        """Adiciona vídeo a um criador existente"""

        try:
            result = self.transcription_service.process_video(video_url)
            transcription = {
                "video_url": result["video_url"],
                "video_title": result["video_title"],
                "transcription": result["transcription"],
                "duration_seconds": result["duration_seconds"],
                "platform": result["platform"],
                "created_at": datetime.now().isoformat()
            }

            await self.storage.add_transcription(tenant_id, creator_id, transcription)

            return {"success": True, "transcription": transcription}

        except Exception as e:
            logger.error("add_video_failed", error=str(e))
            return {"success": False, "error": str(e)}


# Singleton
_copywriter_agent: Optional[CopywriterAgentService] = None


def get_copywriter_agent() -> CopywriterAgentService:
    """Retorna instância singleton do agente de copywriting"""
    global _copywriter_agent
    if _copywriter_agent is None:
        _copywriter_agent = CopywriterAgentService()
    return _copywriter_agent
