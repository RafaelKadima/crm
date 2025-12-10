<?php

namespace App\Http\Controllers;

use App\Models\AgentMessageFeedback;
use App\Models\AgentDetectedQuestion;
use App\Models\LeadMemory;
use App\Models\ConversationPattern;
use App\Models\TicketMessage;
use App\Models\SdrFaq;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Controller para sistema de aprendizado do agente
 */
class AgentLearningController extends Controller
{
    /**
     * Registra feedback de uma mensagem do agente (👍/👎)
     */
    public function submitFeedback(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'message_id' => 'required|uuid|exists:ticket_messages,id',
            'rating' => 'required|in:positive,negative,neutral',
            'corrected_response' => 'nullable|string|max:2000',
            'feedback_reason' => 'nullable|string|max:500',
            'tags' => 'nullable|array',
        ]);

        try {
            $message = TicketMessage::with(['ticket.lead.pipeline', 'ticket.channel'])->findOrFail($validated['message_id']);
            $ticket = $message->ticket;
            $lead = $ticket->lead;
            // Usa a lógica centralizada do modelo Ticket
            $agent = $ticket->sdrAgent();

            if (!$agent) {
                return response()->json(['error' => 'Mensagem não é de um agente IA'], 400);
            }

            // Busca a mensagem do lead que gerou essa resposta
            $leadMessage = TicketMessage::where('ticket_id', $ticket->id)
                ->where('sent_at', '<', $message->sent_at)
                ->where('sender_type', 'contact')
                ->orderByDesc('sent_at')
                ->first();

            $feedback = AgentMessageFeedback::create([
                'tenant_id' => $ticket->tenant_id,
                'message_id' => $message->id,
                'ticket_id' => $ticket->id,
                'lead_id' => $lead->id,
                'agent_id' => $agent->id,
                'evaluated_by' => Auth::id(),
                'rating' => $validated['rating'],
                'original_response' => $message->message,
                'corrected_response' => $validated['corrected_response'] ?? null,
                'feedback_reason' => $validated['feedback_reason'] ?? null,
                'tags' => $validated['tags'] ?? [],
                'lead_message' => $leadMessage?->message ?? '',
                'detected_intent' => $message->metadata['intent'] ?? null,
                'context_snapshot' => [
                    'stage' => $lead->stage?->name,
                    'temperature' => $message->metadata['qualification']['temperature'] ?? null,
                ],
            ]);

            // Envia para o serviço Python processar
            $this->sendToPythonLearning($feedback);

            Log::info('Agent feedback submitted', [
                'feedback_id' => $feedback->id,
                'rating' => $validated['rating'],
                'agent_id' => $agent->id,
            ]);

            return response()->json([
                'success' => true,
                'feedback_id' => $feedback->id,
                'message' => $validated['rating'] === 'positive' 
                    ? 'Obrigado pelo feedback positivo! 👍' 
                    : 'Feedback registrado. Vamos melhorar! 🎯'
            ]);

        } catch (\Exception $e) {
            Log::error('Feedback submission error', ['error' => $e->getMessage()]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Lista perguntas detectadas para aprovação
     */
    public function listDetectedQuestions(Request $request, string $agentId): JsonResponse
    {
        $questions = AgentDetectedQuestion::forAgent($agentId)
            ->where('tenant_id', Auth::user()->tenant_id)
            ->orderByDesc('occurrence_count')
            ->paginate(20);

        return response()->json($questions);
    }

    /**
     * Aprova/rejeita uma pergunta detectada
     */
    public function reviewDetectedQuestion(Request $request, string $questionId): JsonResponse
    {
        $validated = $request->validate([
            'action' => 'required|in:approve,reject,edit',
            'answer' => 'nullable|string|max:2000',
        ]);

        $question = AgentDetectedQuestion::where('tenant_id', Auth::user()->tenant_id)
            ->findOrFail($questionId);

        try {
            switch ($validated['action']) {
                case 'approve':
                    // Atualiza resposta se fornecida
                    if (!empty($validated['answer'])) {
                        $question->suggested_answer = $validated['answer'];
                    }
                    $question->approved_by = Auth::id();
                    
                    // Converte para FAQ
                    $faq = $question->convertToFaq();
                    
                    return response()->json([
                        'success' => true,
                        'faq_id' => $faq?->id,
                        'message' => 'Pergunta convertida em FAQ!'
                    ]);

                case 'reject':
                    $question->update(['status' => 'rejected']);
                    return response()->json([
                        'success' => true,
                        'message' => 'Pergunta rejeitada'
                    ]);

                case 'edit':
                    $question->update([
                        'suggested_answer' => $validated['answer'],
                        'status' => 'pending'
                    ]);
                    return response()->json([
                        'success' => true,
                        'message' => 'Resposta atualizada'
                    ]);
            }

        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }

        return response()->json(['error' => 'Ação inválida'], 400);
    }

    /**
     * Retorna memória de longo prazo de um lead
     */
    public function getLeadMemory(string $leadId): JsonResponse
    {
        $memory = LeadMemory::where('tenant_id', Auth::user()->tenant_id)
            ->where('lead_id', $leadId)
            ->first();

        if (!$memory) {
            return response()->json([
                'exists' => false,
                'message' => 'Nenhuma memória registrada para este lead'
            ]);
        }

        return response()->json([
            'exists' => true,
            'memory' => $memory,
            'context' => $memory->getContextForAgent(),
        ]);
    }

    /**
     * Lista padrões de conversa do agente
     */
    public function listPatterns(Request $request, string $agentId): JsonResponse
    {
        $patterns = ConversationPattern::where('tenant_id', Auth::user()->tenant_id)
            ->where('agent_id', $agentId)
            ->active()
            ->orderByDesc('success_rate')
            ->get();

        return response()->json([
            'patterns' => $patterns,
            'types' => ConversationPattern::getPatternTypes(),
        ]);
    }

    /**
     * Estatísticas de aprendizado do agente
     */
    public function getLearningStats(string $agentId): JsonResponse
    {
        $tenantId = Auth::user()->tenant_id;

        $feedbackStats = AgentMessageFeedback::where('tenant_id', $tenantId)
            ->where('agent_id', $agentId)
            ->selectRaw("
                COUNT(*) as total,
                SUM(CASE WHEN rating = 'positive' THEN 1 ELSE 0 END) as positive,
                SUM(CASE WHEN rating = 'negative' THEN 1 ELSE 0 END) as negative,
                SUM(CASE WHEN processed_for_learning = true THEN 1 ELSE 0 END) as processed
            ")
            ->first();

        $questionsStats = AgentDetectedQuestion::where('tenant_id', $tenantId)
            ->where('agent_id', $agentId)
            ->selectRaw("
                COUNT(*) as total,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'converted' THEN 1 ELSE 0 END) as converted
            ")
            ->first();

        $patternsStats = ConversationPattern::where('tenant_id', $tenantId)
            ->where('agent_id', $agentId)
            ->selectRaw("
                COUNT(*) as total,
                AVG(success_rate) as avg_success_rate
            ")
            ->first();

        return response()->json([
            'feedback' => [
                'total' => $feedbackStats->total ?? 0,
                'positive' => $feedbackStats->positive ?? 0,
                'negative' => $feedbackStats->negative ?? 0,
                'processed' => $feedbackStats->processed ?? 0,
                'positive_rate' => $feedbackStats->total > 0 
                    ? round(($feedbackStats->positive / $feedbackStats->total) * 100, 1) 
                    : 0,
            ],
            'questions' => [
                'total' => $questionsStats->total ?? 0,
                'pending' => $questionsStats->pending ?? 0,
                'converted' => $questionsStats->converted ?? 0,
            ],
            'patterns' => [
                'total' => $patternsStats->total ?? 0,
                'avg_success_rate' => round($patternsStats->avg_success_rate ?? 0, 2),
            ],
        ]);
    }

    /**
     * Envia feedback para processamento no Python
     */
    protected function sendToPythonLearning(AgentMessageFeedback $feedback): void
    {
        try {
            $pythonUrl = config('services.ai_agent.url', 'http://localhost:8001');
            
            Http::timeout(10)->post("{$pythonUrl}/learning/process-feedback", [
                'feedback_id' => $feedback->id,
                'rating' => $feedback->rating,
                'original_response' => $feedback->original_response,
                'corrected_response' => $feedback->corrected_response,
                'lead_message' => $feedback->lead_message,
                'detected_intent' => $feedback->detected_intent,
                'agent_id' => $feedback->agent_id,
                'tenant_id' => $feedback->tenant_id,
            ]);

        } catch (\Exception $e) {
            // Não bloqueia o fluxo principal
            Log::warning('Failed to send feedback to Python', ['error' => $e->getMessage()]);
        }
    }
}

