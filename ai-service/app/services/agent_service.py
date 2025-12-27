"""
Serviço Principal do Agente - Orquestra RAG, Memory, ML e LLM
"""
from typing import Optional, Dict, Any, List
from datetime import datetime
import json
import time
import structlog
import httpx
from openai import AsyncOpenAI

from app.config import get_settings
from app.models.schemas import (
    AgentRunRequest, AgentRunResponse, AgentAction, AgentDecision,
    Qualification, Intent, StageChange, Message, LeadTemperature, AppointmentRequest
)
from app.rag.vector_store import vector_store
from app.memory.memory_service import memory_service
from app.ml.classifier import ml_classifier
from app.cache import response_cache, history_cache
from app.services.usage_service import usage_service

# Import support tools para execução de diagnóstico
from mcp.tools.support_tools import (
    get_error_logs, search_codebase, read_file, search_manual
)

logger = structlog.get_logger()
settings = get_settings()

# Ferramentas que requerem execução antes de responder ao cliente
DIAGNOSTIC_TOOLS = {"get_error_logs", "search_codebase", "read_file", "search_knowledge"}


# Function definitions para o agente
# Function definitions para o agente SDR
SDR_FUNCTIONS = [
    {
        "name": "send_message",
        "description": "Envia uma mensagem para o lead",
        "parameters": {
            "type": "object",
            "properties": {
                "message": {
                    "type": "string",
                    "description": "A mensagem a ser enviada para o lead"
                }
            },
            "required": ["message"]
        }
    },
    {
        "name": "move_stage",
        "description": "Move o lead para outro estágio do funil",
        "parameters": {
            "type": "object",
            "properties": {
                "stage_name": {
                    "type": "string",
                    "description": "Nome do novo estágio"
                },
                "reason": {
                    "type": "string",
                    "description": "Motivo da mudança de estágio"
                }
            },
            "required": ["stage_name", "reason"]
        }
    },
    {
        "name": "qualify_lead",
        "description": "Registra qualificação do lead",
        "parameters": {
            "type": "object",
            "properties": {
                "temperature": {
                    "type": "string",
                    "enum": ["hot", "warm", "cold"],
                    "description": "Temperatura do lead"
                },
                "notes": {
                    "type": "string",
                    "description": "Observações sobre a qualificação"
                }
            },
            "required": ["temperature"]
        }
    },
    {
        "name": "check_availability",
        "description": "Consulta horários disponíveis do vendedor para agendamento. USE SEMPRE ANTES de agendar para oferecer opções reais ao lead.",
        "parameters": {
            "type": "object",
            "properties": {
                "message": {
                    "type": "string",
                    "description": "Mensagem perguntando preferência de dia/horário ao lead"
                }
            },
            "required": ["message"]
        }
    },
    {
        "name": "schedule_meeting",
        "description": "CONFIRMA o agendamento. OBRIGATÓRIO: só use após consultar disponibilidade (check_availability) e ter data + horário específicos confirmados pelo lead.",
        "parameters": {
            "type": "object",
            "properties": {
                "meeting_type": {
                    "type": "string",
                    "enum": ["meeting", "visit", "demo"],
                    "description": "Tipo: meeting (reunião/call), visit (visita à loja), demo (demonstração)"
                },
                "date": {
                    "type": "string",
                    "description": "Data OBRIGATÓRIA no formato YYYY-MM-DD (ex: 2025-12-06)"
                },
                "time": {
                    "type": "string",
                    "description": "Horário OBRIGATÓRIO no formato HH:MM (ex: 14:00)"
                },
                "duration_minutes": {
                    "type": "integer",
                    "description": "Duração em minutos (padrão: 30)"
                },
                "message": {
                    "type": "string",
                    "description": "Mensagem de confirmação do agendamento"
                }
            },
            "required": ["meeting_type", "date", "time", "message"]
        }
    },
    {
        "name": "finalize_and_assign",
        "description": "Finaliza o atendimento SDR e distribui o lead para um vendedor (round-robin). Use quando: 1) Agendamento concluído, 2) Lead não quer agendar, 3) Lead qualificado pronto para vendedor.",
        "parameters": {
            "type": "object",
            "properties": {
                "outcome": {
                    "type": "string",
                    "enum": ["scheduled", "not_interested", "qualified", "need_nurturing"],
                    "description": "Resultado do atendimento: scheduled (agendou), not_interested (não quer), qualified (qualificado), need_nurturing (precisa nutrição)"
                },
                "notes": {
                    "type": "string",
                    "description": "Observações sobre o atendimento"
                },
                "message": {
                    "type": "string",
                    "description": "Mensagem final para o lead"
                }
            },
            "required": ["outcome", "message"]
        }
    },
    {
        "name": "transfer_to_human",
        "description": "Transfere a conversa para um atendente humano",
        "parameters": {
            "type": "object",
            "properties": {
                "reason": {
                    "type": "string",
                    "description": "Motivo da transferência"
                },
                "priority": {
                    "type": "string",
                    "enum": ["low", "medium", "high"],
                    "description": "Prioridade do atendimento"
                }
            },
            "required": ["reason"]
        }
    },
    {
        "name": "follow_up",
        "description": "Agenda um follow-up para o lead",
        "parameters": {
            "type": "object",
            "properties": {
                "delay_hours": {
                    "type": "integer",
                    "description": "Horas até o follow-up"
                },
                "message": {
                    "type": "string",
                    "description": "Mensagem do follow-up"
                }
            },
            "required": ["delay_hours"]
        }
    }
]

# Function definitions para o agente de Suporte Técnico
SUPPORT_FUNCTIONS = [
    {
        "name": "send_message",
        "description": "Envia uma mensagem para o cliente",
        "parameters": {
            "type": "object",
            "properties": {
                "message": {
                    "type": "string",
                    "description": "A mensagem a ser enviada"
                }
            },
            "required": ["message"]
        }
    },
    {
        "name": "get_error_logs",
        "description": "Busca logs de erro do sistema OmniFy HUB. Use SEMPRE quando o cliente relatar erro, bug ou comportamento inesperado. Retorna os logs relevantes para diagnóstico.",
        "parameters": {
            "type": "object",
            "properties": {
                "error_type": {
                    "type": "string",
                    "description": "Tipo de erro a buscar: 'laravel' (backend), 'javascript' (frontend), 'api' (requisições), 'all' (todos)"
                },
                "time_range": {
                    "type": "string",
                    "description": "Período: '1h' (última hora), '24h' (último dia), '7d' (última semana)"
                },
                "search_term": {
                    "type": "string",
                    "description": "Termo específico para buscar nos logs (ex: nome de função, mensagem de erro)"
                }
            },
            "required": ["error_type"]
        }
    },
    {
        "name": "search_codebase",
        "description": "Busca no código fonte do OmniFy HUB. Use para encontrar onde um bug pode estar, entender como uma funcionalidade foi implementada, ou localizar arquivos relevantes.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Texto ou padrão a buscar no código (ex: 'function handleLogin', 'class TicketService')"
                },
                "file_type": {
                    "type": "string",
                    "description": "Tipo de arquivo: 'php', 'js', 'vue', 'ts', 'all'"
                },
                "path": {
                    "type": "string",
                    "description": "Caminho específico para buscar (ex: 'app/Services', 'resources/js')"
                }
            },
            "required": ["query"]
        }
    },
    {
        "name": "read_file",
        "description": "Lê o conteúdo de um arquivo específico do código fonte. Use após search_codebase para analisar um arquivo em detalhes.",
        "parameters": {
            "type": "object",
            "properties": {
                "file_path": {
                    "type": "string",
                    "description": "Caminho do arquivo (ex: 'app/Services/TicketService.php')"
                },
                "start_line": {
                    "type": "integer",
                    "description": "Linha inicial (opcional)"
                },
                "end_line": {
                    "type": "integer",
                    "description": "Linha final (opcional)"
                }
            },
            "required": ["file_path"]
        }
    },
    {
        "name": "search_knowledge",
        "description": "Busca na base de conhecimento (FAQs, tutoriais, documentação). Use para encontrar soluções conhecidas antes de investigar logs.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Pergunta ou descrição do problema"
                },
                "category": {
                    "type": "string",
                    "description": "Categoria: 'faq', 'tutorial', 'troubleshooting', 'all'"
                }
            },
            "required": ["query"]
        }
    },
    {
        "name": "move_lead_stage",
        "description": "Move o lead/ticket para outro estágio do pipeline de suporte. Use para atualizar o status conforme o progresso do atendimento.",
        "parameters": {
            "type": "object",
            "properties": {
                "stage_name": {
                    "type": "string",
                    "description": "Nome do estágio: 'Nova Solicitação', 'Em Análise', 'Aguardando Correção', 'Aguardando Teste', 'Resolvido', 'Escalado'"
                },
                "reason": {
                    "type": "string",
                    "description": "Motivo da mudança de estágio"
                }
            },
            "required": ["stage_name", "reason"]
        }
    },
    {
        "name": "transfer_to_human",
        "description": "Transfere a conversa para um desenvolvedor humano. Use SOMENTE quando não conseguir resolver sozinho após várias tentativas.",
        "parameters": {
            "type": "object",
            "properties": {
                "reason": {
                    "type": "string",
                    "description": "Motivo da transferência e resumo do problema identificado"
                },
                "priority": {
                    "type": "string",
                    "enum": ["low", "medium", "high", "critical"],
                    "description": "Prioridade: low (dúvida simples), medium (bug menor), high (funcionalidade quebrada), critical (sistema fora do ar)"
                },
                "diagnosis": {
                    "type": "string",
                    "description": "Resumo do diagnóstico feito (logs analisados, arquivos verificados, possível causa)"
                }
            },
            "required": ["reason", "priority"]
        }
    },
    {
        "name": "request_fix_approval",
        "description": "Solicita aprovação para aplicar uma correção de código. Use quando você identificou o bug e sabe como corrigi-lo. A correção será enviada para um desenvolvedor aprovar via WhatsApp.",
        "parameters": {
            "type": "object",
            "properties": {
                "file_path": {
                    "type": "string",
                    "description": "Caminho do arquivo a ser corrigido (ex: 'app/Http/Controllers/TicketController.php')"
                },
                "old_code": {
                    "type": "string",
                    "description": "Código atual que contém o bug (deve ser EXATAMENTE como está no arquivo)"
                },
                "new_code": {
                    "type": "string",
                    "description": "Código corrigido que vai substituir o código antigo"
                },
                "problem_description": {
                    "type": "string",
                    "description": "Descrição do problema que o cliente está enfrentando"
                },
                "diagnosis_summary": {
                    "type": "string",
                    "description": "Resumo do diagnóstico: o que você encontrou nos logs/código"
                },
                "fix_explanation": {
                    "type": "string",
                    "description": "Explicação técnica de por que esta correção resolve o problema"
                },
                "commit_message": {
                    "type": "string",
                    "description": "Mensagem do commit (ex: 'fix: corrige validação de upload de imagem')"
                }
            },
            "required": ["file_path", "old_code", "new_code", "problem_description", "diagnosis_summary", "fix_explanation"]
        }
    },
    {
        "name": "apply_fix_autonomous",
        "description": "Aplica uma correção de código de forma AUTÔNOMA, sem precisar de aprovação. O sistema faz backup automático e, se algo quebrar, reverte automaticamente. Use quando você tem certeza do diagnóstico e da correção.",
        "parameters": {
            "type": "object",
            "properties": {
                "file_path": {
                    "type": "string",
                    "description": "Caminho do arquivo a ser corrigido (ex: 'app/Http/Controllers/TicketController.php')"
                },
                "old_code": {
                    "type": "string",
                    "description": "Código atual que contém o bug (deve ser EXATAMENTE como está no arquivo)"
                },
                "new_code": {
                    "type": "string",
                    "description": "Código corrigido que vai substituir o código antigo"
                },
                "problem_description": {
                    "type": "string",
                    "description": "Descrição do problema que o cliente está enfrentando"
                },
                "diagnosis_summary": {
                    "type": "string",
                    "description": "Resumo do diagnóstico: o que você encontrou nos logs/código"
                },
                "fix_explanation": {
                    "type": "string",
                    "description": "Explicação técnica de por que esta correção resolve o problema"
                },
                "commit_message": {
                    "type": "string",
                    "description": "Mensagem do commit (ex: 'fix: corrige validação de upload de imagem')"
                }
            },
            "required": ["file_path", "old_code", "new_code", "problem_description", "diagnosis_summary", "fix_explanation", "commit_message"]
        }
    }
]


class AgentService:
    """
    Serviço principal que orquestra o agente SDR IA.
    
    Fluxo:
    1. Recebe mensagem do lead
    2. Carrega memória (curta + longa)
    3. Busca conhecimento relevante (RAG)
    4. Classifica intenção e qualifica lead (ML)
    5. Gera resposta e decide ação (LLM com function calling)
    6. Salva contexto na memória
    7. Retorna ação para o Laravel executar
    """
    
    def __init__(self):
        self.openai = AsyncOpenAI(
            api_key=settings.openai_api_key,
            project=settings.openai_project_id if settings.openai_project_id else None
        )
    
    async def run(self, request: AgentRunRequest) -> AgentRunResponse:
        """
        Executa o agente para uma mensagem recebida.
        """
        start_time = datetime.now()

        # Debug: mostra o que chegou no request.agent
        print(f"[AGENT] Received agent config: name={request.agent.name}, type={request.agent.type}", flush=True)

        logger.info(
            "agent_run_started",
            lead_id=request.lead.id,
            message_id=request.message_id,
            agent_id=request.agent.id
        )
        
        try:
            # 0. Verifica cache de resposta (evita chamar LLM para mensagens repetidas)
            cached_response = await response_cache.get_cached_response(
                message=request.message,
                tenant_id=request.tenant.id,
                agent_id=request.agent.id
            )
            
            if cached_response:
                logger.info("cache_hit_returning_cached_response",
                    message_preview=request.message[:50],
                    lead_id=request.lead.id
                )
                # Reconstrói a resposta do cache
                cached_action = AgentAction(cached_response.get("action", "send_message"))
                return AgentRunResponse(
                    action=cached_action,
                    message=cached_response.get("message", ""),
                    qualification=Qualification(
                        temperature=LeadTemperature(cached_response.get("qualification", {}).get("temperature", "warm")),
                        score=cached_response.get("qualification", {}).get("score", 50),
                        pain_points=cached_response.get("qualification", {}).get("pain_points", []),
                        objections=cached_response.get("qualification", {}).get("objections", []),
                        interests=cached_response.get("qualification", {}).get("interests", [])
                    ),
                    intent=Intent(
                        name=cached_response.get("intent", {}).get("name", "unknown"),
                        confidence=cached_response.get("intent", {}).get("confidence", 0.5)
                    ),
                    decision=AgentDecision(
                        action=cached_action,
                        confidence=cached_response.get("decision", {}).get("confidence", 0.8),
                        reasoning=cached_response.get("decision", {}).get("reasoning", "Resposta do cache")
                    ),
                    metrics={"processing_time_ms": int((datetime.now() - start_time).total_seconds() * 1000), "from_cache": True}
                )
            
            # 1. Carrega memória curta
            short_term = await memory_service.get_short_term_memory(request.lead.id)
            
            # 2. Carrega memória longa (se habilitado)
            long_term = None
            if request.include_long_memory:
                long_term = await memory_service.get_long_term_memory(
                    request.lead.id,
                    request.tenant.id,
                    request.message
                )
            
            # 3. Busca conhecimento via RAG (se habilitado)
            rag_chunks = []
            if request.include_rag:
                print(f"[RAG] Buscando conhecimento para: '{request.message}'")
                print(f"[RAG] Tenant: {request.tenant.id}, Agent: {request.agent.id}")
                rag_result = await vector_store.search_knowledge(
                    query=request.message,
                    tenant_id=request.tenant.id,
                    agent_id=request.agent.id
                )
                rag_chunks = rag_result.chunks
                print(f"[RAG] Chunks encontrados: {len(rag_chunks)}")
                for chunk in rag_chunks:
                    print(f"[RAG] - {chunk.source}: {chunk.content[:100]}... (sim: {chunk.similarity:.4f})")
            
            # 4. Classifica intenção
            intent_result = await ml_classifier.classify_intent(
                message=request.message,
                history=request.history or short_term.messages
            )
            
            # 5. Qualifica lead
            all_messages = (request.history or short_term.messages)
            # Adiciona mensagem atual
            all_messages.append(Message(
                id=request.message_id,
                content=request.message,
                direction="inbound",
                sender_type="contact",
                created_at=datetime.now()
            ))
            
            qualification = await ml_classifier.qualify_lead(
                lead=request.lead,
                messages=all_messages
            )
            
            # 6. Verifica se deve transferir para humano
            should_transfer, transfer_reason = await ml_classifier.should_transfer_to_human(
                messages=all_messages,
                qualification=qualification
            )
            
            if should_transfer:
                return AgentRunResponse(
                    action=AgentAction.TRANSFER_TO_HUMAN,
                    message=f"Transferindo para atendimento humano. Motivo: {transfer_reason}",
                    qualification=qualification,
                    intent=Intent(
                        name=intent_result.intent,
                        confidence=intent_result.confidence
                    ),
                    decision=AgentDecision(
                        action=AgentAction.TRANSFER_TO_HUMAN,
                        confidence=0.9,
                        reasoning=transfer_reason
                    ),
                    requires_human=True,
                    metrics=self._calculate_metrics(start_time)
                )
            
            # 7. Monta contexto completo
            context = memory_service.build_context_for_agent(
                short_term=short_term,
                long_term=long_term or type('obj', (object,), {
                    'key_insights': [], 'preferences': {}, 'interaction_style': 'unknown'
                })(),
                rag_chunks=rag_chunks,
                lead=request.lead
            )
            
            # 8. Gera resposta via LLM com function calling
            # Contexto para logging de atividades de suporte
            log_context = {
                "tenant_id": request.tenant.id,
                "agent_id": request.agent.id,
                "ticket_id": request.ticket_id,
                "lead_id": request.lead.id,
                "user_message": request.message
            }
            response = await self._generate_response(
                message=request.message,
                context=context,
                agent_config=request.agent,
                tenant_config=request.tenant,
                intent=intent_result.intent,
                qualification=qualification,
                log_context=log_context
            )
            
            # 9. Salva contexto atualizado
            await memory_service.save_short_term_context(
                lead_id=request.lead.id,
                intent=intent_result.intent,
                action=response.action.value,
                summary=f"Lead disse: {request.message[:100]}. Agente: {response.action.value}"
            )
            
            # 10. Adiciona insights à memória longa se relevante
            if qualification.temperature == LeadTemperature.HOT:
                await memory_service.add_insight_to_memory(
                    lead_id=request.lead.id,
                    tenant_id=request.tenant.id,
                    insight=f"Lead demonstrou alto interesse. Intenção: {intent_result.intent}",
                    category="qualification"
                )
            
            # 11. Calcula métricas (mescla tempo com tokens já capturados)
            time_metrics = self._calculate_metrics(start_time)
            if response.metrics:
                response.metrics.update(time_metrics)
            else:
                response.metrics = time_metrics
            response.context_used = {
                "rag_chunks": len(rag_chunks),
                "history_messages": len(all_messages),
                "long_term_insights": len(long_term.key_insights if long_term else [])
            }
            
            logger.info(
                "agent_run_completed",
                lead_id=request.lead.id,
                action=response.action.value,
                duration_ms=response.metrics.get("duration_ms")
            )
            
            # Salva resposta no cache (para mensagens similares futuras)
            await response_cache.set_cached_response(
                message=request.message,
                tenant_id=request.tenant.id,
                agent_id=request.agent.id,
                response=response.model_dump(mode="json")
            )
            
            # 12. Registra uso de tokens no Laravel (para controle de custos)
            await usage_service.log_ai_usage(
                tenant_id=request.tenant.id,
                input_tokens=response.metrics.get("input_tokens", 2000),  # Estimativa se não disponível
                output_tokens=response.metrics.get("output_tokens", 150),
                model=request.agent.ai_model,
                lead_id=request.lead.id,
                agent_id=request.agent.id,
                action_type=response.action.value,
                response_time_ms=response.metrics.get("duration_ms"),
                from_cache=False
            )
            
            return response
            
        except Exception as e:
            logger.error("agent_run_error", error=str(e), lead_id=request.lead.id)
            
            # Fallback: resposta genérica
            return AgentRunResponse(
                action=AgentAction.SEND_MESSAGE,
                message="Desculpe, tive um problema técnico. Pode repetir sua mensagem?",
                decision=AgentDecision(
                    action=AgentAction.SEND_MESSAGE,
                    confidence=0.5,
                    reasoning=f"Erro interno: {str(e)}"
                ),
                metrics=self._calculate_metrics(start_time)
            )
    
    async def _generate_response(
        self,
        message: str,
        context: str,
        agent_config,
        tenant_config,
        intent: str,
        qualification: Qualification,
        log_context: Optional[Dict[str, Any]] = None
    ) -> AgentRunResponse:
        """
        Gera resposta usando LLM com function calling.
        """
        # Data e hora atual
        from datetime import datetime, timedelta
        import locale
        try:
            locale.setlocale(locale.LC_TIME, 'pt_BR.UTF-8')
        except:
            pass

        now = datetime.now()
        today_str = now.strftime("%Y-%m-%d")
        today_formatted = now.strftime("%d/%m/%Y")
        current_time = now.strftime("%H:%M")
        weekday = ['segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado', 'domingo'][now.weekday()]

        # System prompt diferente para agente de SUPORTE vs SDR
        if agent_config.type == "support":
            # Prompt simplificado para suporte - foco em diagnóstico
            system_prompt = f"""{agent_config.prompt}

## Contexto da Conversa
{context}

## Data/Hora Atual
{weekday}, {today_formatted} às {current_time}"""
        else:
            # Monta system prompt para SDR
            system_prompt = f"""{agent_config.prompt}

## ⚠️ DATA E HORA ATUAL (CRÍTICO - LEIA COM ATENÇÃO!)
- HOJE é: {weekday}, {today_formatted} ({today_str})
- Hora atual: {current_time}

### REGRAS DE DATAS (SIGA RIGOROSAMENTE):
- "HOJE" = {today_str} (dia {now.day})
- "AMANHÃ" = {(now + timedelta(days=1)).strftime('%Y-%m-%d')} (dia {(now + timedelta(days=1)).day})
- Se o lead mencionar um número de dia (ex: "dia 05"), calcule a data correta no mês atual
- SEMPRE use formato YYYY-MM-DD para datas
- SEMPRE use formato HH:MM para horários (ex: 10:00, 14:30)

## Contexto da Conversa
{context}

## Intenção: {intent}

## Lead
- Temperatura: {qualification.temperature.value}
- Score: {qualification.score}
- Dores: {', '.join(qualification.pain_points) or 'Nenhuma identificada'}
- Objeções: {', '.join(qualification.objections) or 'Nenhuma'}

## Produtos: {json.dumps([p.get('name', '') for p in tenant_config.products[:5]], ensure_ascii=False)}
## Estágios: {json.dumps([s.get('name', '') for s in tenant_config.stages], ensure_ascii=False)}

## ⚠️ REGRAS IMPORTANTES (OBRIGATÓRIO SEGUIR):

### 1. NÃO PEÇA CONFIRMAÇÃO MÚLTIPLAS VEZES
- Se o lead já disse "sim" ou confirmou, EXECUTE A AÇÃO imediatamente
- NÃO pergunte de novo o horário se ele já informou
- NÃO pergunte de novo a data se ele já informou

### 2. MANTENHA O CONTEXTO DA CONVERSA
- Leia TODA a conversa antes de responder
- Se o lead disse "amanhã" antes, NÃO mude para "hoje"
- Se o lead disse "10h" antes, use 10:00 (não invente outro horário)

### 3. AGENDAMENTO
- Quando tiver data E horário confirmados, use schedule_meeting IMEDIATAMENTE
- Exemplo: Lead diz "amanhã às 10h" e depois "sim" → USE: date="{(now + timedelta(days=1)).strftime('%Y-%m-%d')}", time="10:00"
- NÃO peça mais confirmações após o lead dizer "sim"

### 4. EVITE ALUCINAÇÕES
- NÃO invente horários ou datas
- Se não entendeu, pergunte UMA vez apenas
- Use EXATAMENTE o que o lead disse

## Tom: {agent_config.tone}
## Idioma: {agent_config.language}
"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Mensagem do lead: {message}"}
        ]

        # Seleciona funções baseado no tipo do agente
        print(f"[AGENT] Agent type: '{agent_config.type}', using {'SUPPORT' if agent_config.type == 'support' else 'SDR'} functions", flush=True)
        available_functions = SUPPORT_FUNCTIONS if agent_config.type == "support" else SDR_FUNCTIONS
        print(f"[AGENT] Available functions: {[f['name'] for f in available_functions]}", flush=True)

        try:
            # Loop para executar ferramentas de diagnóstico antes de responder
            # Máximo de 10 iterações para permitir diagnósticos completos
            total_tokens = {"input": 0, "output": 0, "total": 0}
            max_iterations = 10

            for iteration in range(max_iterations):
                print(f"[AGENT] Iteration {iteration + 1}/{max_iterations}, calling OpenAI...", flush=True)

                response = await self.openai.chat.completions.create(
                    model=agent_config.ai_model,
                    messages=messages,
                    tools=[{"type": "function", "function": f} for f in available_functions],
                    tool_choice="auto",
                    temperature=agent_config.temperature,
                    max_tokens=agent_config.max_tokens
                )

                assistant_message = response.choices[0].message
                print(f"[AGENT] Response: tool_calls={assistant_message.tool_calls is not None}, content={assistant_message.content[:100] if assistant_message.content else 'None'}", flush=True)

                # Acumula tokens usados
                usage_info = response.usage
                if usage_info:
                    total_tokens["input"] += usage_info.prompt_tokens
                    total_tokens["output"] += usage_info.completion_tokens
                    total_tokens["total"] += usage_info.total_tokens

                # Se não houver function call, temos a resposta final
                if not assistant_message.tool_calls:
                    print(f"[AGENT] No tool calls, returning response", flush=True)
                    token_metrics = {
                        "input_tokens": total_tokens["input"],
                        "output_tokens": total_tokens["output"],
                        "total_tokens": total_tokens["total"],
                    }
                    return AgentRunResponse(
                        action=AgentAction.SEND_MESSAGE,
                        message=assistant_message.content,
                        qualification=qualification,
                        intent=Intent(name=intent, confidence=0.8),
                        decision=AgentDecision(
                            action=AgentAction.SEND_MESSAGE,
                            confidence=0.8,
                            reasoning="Resposta direta sem ação específica"
                        ),
                        metrics=token_metrics
                    )

                tool_call = assistant_message.tool_calls[0]
                function_name = tool_call.function.name
                function_args = json.loads(tool_call.function.arguments)
                print(f"[AGENT] Tool call: {function_name}({function_args})", flush=True)

                logger.info("agent_tool_call",
                    function=function_name,
                    args=function_args,
                    iteration=iteration
                )

                # Se for uma ferramenta de diagnóstico, executa e continua o loop
                if function_name in DIAGNOSTIC_TOOLS:
                    tool_result = await self._execute_diagnostic_tool(function_name, function_args, log_context)

                    # Adiciona a chamada e resultado à conversa
                    messages.append({
                        "role": "assistant",
                        "content": None,
                        "tool_calls": [
                            {
                                "id": tool_call.id,
                                "type": "function",
                                "function": {
                                    "name": function_name,
                                    "arguments": tool_call.function.arguments
                                }
                            }
                        ]
                    })
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": json.dumps(tool_result, ensure_ascii=False, default=str)
                    })

                    logger.info("diagnostic_tool_executed",
                        function=function_name,
                        result_preview=str(tool_result)[:200]
                    )
                    continue

                # Se não for ferramenta de diagnóstico, processa normalmente
                token_metrics = {
                    "input_tokens": total_tokens["input"],
                    "output_tokens": total_tokens["output"],
                    "total_tokens": total_tokens["total"],
                }
                result = self._process_function_call(
                    function_name=function_name,
                    function_args=function_args,
                    qualification=qualification,
                    intent=intent
                )
                result.metrics = token_metrics
                return result

            # Se atingiu o limite de iterações, retorna erro
            logger.warning("agent_max_iterations_reached", iterations=max_iterations)
            return AgentRunResponse(
                action=AgentAction.SEND_MESSAGE,
                message="Desculpe, estou tendo dificuldade em processar sua solicitação. Um atendente humano irá ajudá-lo em breve.",
                qualification=qualification,
                intent=Intent(name=intent, confidence=0.5),
                decision=AgentDecision(
                    action=AgentAction.TRANSFER_TO_HUMAN,
                    confidence=0.9,
                    reasoning="Limite de iterações atingido"
                ),
                requires_human=True
            )

        except Exception as e:
            logger.error("generate_response_error", error=str(e))
            raise

    async def _execute_diagnostic_tool(
        self,
        function_name: str,
        function_args: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Executa uma ferramenta de diagnóstico e retorna o resultado.
        Também registra a atividade para histórico do suporte.
        """
        start_time = time.time()
        result = None

        try:
            if function_name == "get_error_logs":
                result = await get_error_logs(
                    log_type=function_args.get("error_type", "laravel"),
                    lines=100,
                    filter=function_args.get("search_term")
                )

            elif function_name == "search_codebase":
                file_type = function_args.get("file_type")
                pattern = f"**/*.{file_type}" if file_type and file_type != "all" else "**/*"
                result = await search_codebase(
                    query=function_args.get("query", ""),
                    file_pattern=pattern,
                    max_results=20
                )

            elif function_name == "read_file":
                result = await read_file(
                    file_path=function_args.get("file_path", ""),
                    line_start=function_args.get("start_line"),
                    line_end=function_args.get("end_line")
                )

            elif function_name == "search_knowledge":
                result = await search_manual(
                    query=function_args.get("query", ""),
                    section=function_args.get("category")
                )

            else:
                result = {"success": False, "error": f"Ferramenta desconhecida: {function_name}"}

            # Calcula tempo de execução
            execution_time_ms = int((time.time() - start_time) * 1000)

            # Registra atividade de diagnóstico (em background, não bloqueia)
            if context:
                await self._log_support_activity(
                    tenant_id=context.get("tenant_id"),
                    agent_id=context.get("agent_id"),
                    ticket_id=context.get("ticket_id"),
                    lead_id=context.get("lead_id"),
                    action_type="diagnostic",
                    tool_used=function_name,
                    tool_arguments=function_args,
                    tool_result=json.dumps(result, ensure_ascii=False, default=str)[:5000],
                    execution_time_ms=execution_time_ms,
                    user_message=context.get("user_message")
                )

            return result

        except Exception as e:
            logger.error("diagnostic_tool_error", function=function_name, error=str(e))
            return {"success": False, "error": str(e)}

    async def _log_support_activity(
        self,
        tenant_id: Optional[str],
        agent_id: Optional[str],
        ticket_id: Optional[str],
        lead_id: Optional[str],
        action_type: str,
        tool_used: Optional[str] = None,
        tool_arguments: Optional[Dict] = None,
        tool_result: Optional[str] = None,
        user_message: Optional[str] = None,
        agent_response: Optional[str] = None,
        error_found: bool = False,
        error_details: Optional[Dict] = None,
        resolution_provided: bool = False,
        resolution_summary: Optional[str] = None,
        execution_time_ms: Optional[int] = None,
        tokens_used: Optional[int] = None
    ):
        """
        Envia log de atividade de suporte para o Laravel.
        Executa em background sem bloquear a resposta.
        """
        if not tenant_id or not agent_id:
            return

        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    f"{settings.LARAVEL_API_URL}/api/internal/support/activity",
                    json={
                        "tenant_id": tenant_id,
                        "agent_id": agent_id,
                        "ticket_id": ticket_id,
                        "lead_id": lead_id,
                        "action_type": action_type,
                        "tool_used": tool_used,
                        "tool_arguments": tool_arguments,
                        "tool_result": tool_result,
                        "user_message": user_message,
                        "agent_response": agent_response,
                        "error_found": error_found,
                        "error_details": error_details,
                        "resolution_provided": resolution_provided,
                        "resolution_summary": resolution_summary,
                        "execution_time_ms": execution_time_ms,
                        "tokens_used": tokens_used,
                    },
                    headers={
                        "X-Internal-Key": settings.LARAVEL_API_KEY,
                        "Content-Type": "application/json"
                    },
                    timeout=5
                )
        except Exception as e:
            # Log silencioso - não deve interromper o fluxo principal
            logger.warning("support_activity_log_failed", error=str(e))
    
    def _process_function_call(
        self,
        function_name: str,
        function_args: Dict[str, Any],
        qualification: Qualification,
        intent: str
    ) -> AgentRunResponse:
        """
        Processa o function call e retorna a resposta apropriada.
        """
        action_map = {
            "send_message": AgentAction.SEND_MESSAGE,
            "move_stage": AgentAction.MOVE_STAGE,
            "qualify_lead": AgentAction.QUALIFY_LEAD,
            "check_availability": AgentAction.CHECK_AVAILABILITY,
            "schedule_meeting": AgentAction.SCHEDULE_MEETING,
            "finalize_and_assign": AgentAction.FINALIZE_AND_ASSIGN,
            "transfer_to_human": AgentAction.TRANSFER_TO_HUMAN,
            "request_info": AgentAction.REQUEST_INFO,
            "follow_up": AgentAction.FOLLOW_UP,
            # Support actions
            "check_order_status": AgentAction.SEND_MESSAGE, # Mapeia para send_message por enquanto, mas com lógica customizada
            "analyze_problem_image": AgentAction.SEND_MESSAGE # Mapeia para send_message com resposta da visão
        }

        action = action_map.get(function_name, AgentAction.SEND_MESSAGE)
        
        response = AgentRunResponse(
            action=action,
            qualification=qualification,
            intent=Intent(name=intent, confidence=0.8),
            decision=AgentDecision(
                action=action,
                confidence=0.9,
                reasoning=f"Function call: {function_name}"
            )
        )
        
        # Processa argumentos específicos
        if function_name == "send_message":
            response.message = function_args.get("message", "")
            
        elif function_name == "move_stage":
            response.stage_change = StageChange(
                to_stage=function_args.get("stage_name", ""),
                reason=function_args.get("reason", "")
            )
            response.message = f"Movendo lead para estágio: {function_args.get('stage_name')}"
            
        elif function_name == "check_availability":
            # Marca que precisa consultar disponibilidade
            response.message = function_args.get("message", 
                "Qual dia e horário ficariam melhores para você?")
            response.suggested_next_actions = ["wait_for_date_preference", "show_available_slots"]
            # Flag para Laravel buscar disponibilidade
            response.needs_availability_check = True
            
        elif function_name == "schedule_meeting":
            # Só agenda se tiver data E hora
            date_str = function_args.get("date")
            time_str = function_args.get("time")
            
            if not date_str or not time_str:
                # Sem data/hora, apenas envia mensagem perguntando
                response.action = AgentAction.CHECK_AVAILABILITY
                response.message = function_args.get("message", 
                    "Para confirmar o agendamento, preciso da data e horário. Qual seria melhor para você?")
                response.needs_availability_check = True
            else:
                try:
                    scheduled_at = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
                    meeting_type = function_args.get("meeting_type", "meeting")
                    type_map = {"meeting": "meeting", "visit": "visit", "demo": "demo", "call": "meeting", "video": "meeting", "presential": "visit"}
                    
                    response.appointment = AppointmentRequest(
                        type=type_map.get(meeting_type, "meeting"),
                        scheduled_at=scheduled_at,
                        duration_minutes=function_args.get("duration_minutes", 30),
                        title=f"Agendamento via SDR - {meeting_type}",
                    )
                    response.message = function_args.get("message", 
                        f"Pronto! Agendamento confirmado para {date_str} às {time_str}.")
                    response.suggested_next_actions = ["confirm_meeting", "send_reminder"]
                except ValueError:
                    response.message = "Desculpe, não consegui entender a data/horário. Pode confirmar no formato dia/mês às hora?"
        
        elif function_name == "finalize_and_assign":
            # Finaliza atendimento SDR e distribui para vendedor
            response.message = function_args.get("message", "Obrigado pelo contato!")
            response.sdr_outcome = function_args.get("outcome", "qualified")
            response.sdr_notes = function_args.get("notes", "")
            response.needs_assignment = True
            response.suggested_next_actions = ["assign_to_seller", "move_to_next_stage"]
            
        elif function_name == "transfer_to_human":
            response.requires_human = True
            response.message = function_args.get("reason", "Transferindo para atendimento humano")
            
        elif function_name == "request_info":
            response.message = function_args.get("message", "")
            
        elif function_name == "follow_up":
            response.follow_up_needed = True
            from datetime import timedelta
            response.follow_up_time = datetime.now() + timedelta(
                hours=function_args.get("delay_hours", 24)
            )
            response.message = function_args.get("message", "")

        elif function_name == "check_order_status":
            # TODO: Integrar com ERP real. Por enquanto retorna mock.
            order_id = function_args.get("order_id", "N/A")
            response.message = f"Verifiquei o pedido {order_id}. Ele consta como 'Em Trânsito' e deve chegar até sexta-feira."
            response.decision.reasoning = f"Consulta de pedido {order_id} realizada."

        elif function_name == "analyze_problem_image":
            # Aqui chamaria o GPT-4o Vision separadamente ou usaria a descrição já gerada se a imagem foi passada no input inicial
            image_url = function_args.get("image_url")
            # Mock da análise visual por enquanto (a implementação real requer chamada multimodal ao GPT-4o)
            response.message = f"Analisei a imagem ({image_url}). Parece haver um dano físico na lateral do produto. Nesse caso, recomendo iniciarmos o processo de troca."
            response.decision.reasoning = "Análise visual identificou dano físico."

        # =====================================================
        # SUPPORT AGENT TECHNICAL TOOLS
        # =====================================================
        elif function_name == "get_error_logs":
            # Marca que precisa executar a ferramenta MCP
            response.action = AgentAction.SEND_MESSAGE
            response.mcp_tool_call = {
                "tool": "get_error_logs",
                "params": {
                    "log_type": function_args.get("error_type", "laravel"),
                    "lines": 100,
                    "filter": function_args.get("search_term")
                }
            }
            response.message = "Vou verificar os logs do sistema..."
            response.decision.reasoning = f"Buscando logs de erro: {function_args.get('error_type', 'laravel')}"

        elif function_name == "search_codebase":
            response.action = AgentAction.SEND_MESSAGE
            response.mcp_tool_call = {
                "tool": "search_codebase",
                "params": {
                    "query": function_args.get("query"),
                    "file_pattern": f"**/*.{function_args.get('file_type', '*')}" if function_args.get('file_type') else "**/*",
                    "max_results": 20
                }
            }
            response.message = f"Buscando no código fonte: {function_args.get('query')}..."
            response.decision.reasoning = f"Buscando código: {function_args.get('query')}"

        elif function_name == "read_file":
            response.action = AgentAction.SEND_MESSAGE
            response.mcp_tool_call = {
                "tool": "read_file",
                "params": {
                    "file_path": function_args.get("file_path"),
                    "line_start": function_args.get("start_line"),
                    "line_end": function_args.get("end_line")
                }
            }
            response.message = f"Lendo arquivo: {function_args.get('file_path')}..."
            response.decision.reasoning = f"Lendo arquivo: {function_args.get('file_path')}"

        elif function_name == "search_knowledge":
            # Usa o RAG existente para buscar na base de conhecimento
            response.action = AgentAction.SEND_MESSAGE
            response.mcp_tool_call = {
                "tool": "search_manual",
                "params": {
                    "query": function_args.get("query"),
                    "section": function_args.get("category")
                }
            }
            response.message = "Consultando a base de conhecimento..."
            response.decision.reasoning = f"Buscando conhecimento: {function_args.get('query')}"

        elif function_name == "move_lead_stage":
            response.action = AgentAction.MOVE_STAGE
            response.stage_change = StageChange(
                to_stage=function_args.get("stage_name", ""),
                reason=function_args.get("reason", "")
            )
            response.message = f"Atualizando status para: {function_args.get('stage_name')}"
            response.decision.reasoning = f"Movendo para estágio: {function_args.get('stage_name')}"

        return response
    
    def _calculate_metrics(self, start_time: datetime) -> Dict[str, Any]:
        """Calcula métricas da execução"""
        duration = (datetime.now() - start_time).total_seconds() * 1000
        return {
            "duration_ms": int(duration),
            "timestamp": datetime.now().isoformat()
        }


# Singleton
agent_service = AgentService()

