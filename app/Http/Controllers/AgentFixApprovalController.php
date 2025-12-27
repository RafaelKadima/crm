<?php

namespace App\Http\Controllers;

use App\Jobs\ProcessApprovedFix;
use App\Jobs\SendFixApprovalRequest;
use App\Models\AgentFixRequest;
use App\Models\SdrAgent;
use App\Models\Ticket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AgentFixApprovalController extends Controller
{
    /**
     * Criar nova solicitação de fix (chamado pelo Python/ai-service)
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tenant_id' => 'required|uuid|exists:tenants,id',
            'ticket_id' => 'required|uuid|exists:tickets,id',
            'agent_id' => 'required|uuid|exists:sdr_agents,id',
            'problem_description' => 'required|string|max:2000',
            'diagnosis_summary' => 'required|string|max:2000',
            'diagnostic_data' => 'nullable|array',
            'file_path' => 'required|string|max:500',
            'old_code' => 'required|string|max:10000',
            'new_code' => 'required|string|max:10000',
            'fix_explanation' => 'required|string|max:2000',
            'commit_message' => 'nullable|string|max:200',
        ]);

        // Validar caminho do arquivo
        if (!AgentFixRequest::isPathAllowed($validated['file_path'])) {
            return response()->json([
                'success' => false,
                'error' => 'Caminho do arquivo não permitido por segurança',
            ], 403);
        }

        // Validar tamanho do diff
        if (!AgentFixRequest::isCodeDiffReasonable($validated['old_code'], $validated['new_code'])) {
            return response()->json([
                'success' => false,
                'error' => 'Alteração muito grande. Máximo de 100 linhas.',
            ], 400);
        }

        // Buscar o agente para obter o tenant e config
        $agent = SdrAgent::find($validated['agent_id']);
        $tenant = $agent->tenant;

        // Verificar se tenant tem fix_agent habilitado
        $fixSettings = $tenant->fix_agent_settings ?? [];
        if (!($fixSettings['enabled'] ?? false)) {
            return response()->json([
                'success' => false,
                'error' => 'Correção automática não habilitada para este tenant',
            ], 403);
        }

        // Criar a solicitação
        $fixRequest = AgentFixRequest::create([
            'tenant_id' => $validated['tenant_id'],
            'ticket_id' => $validated['ticket_id'],
            'sdr_agent_id' => $validated['agent_id'],
            'problem_description' => $validated['problem_description'],
            'diagnosis_summary' => $validated['diagnosis_summary'],
            'diagnostic_data' => $validated['diagnostic_data'] ?? null,
            'file_path' => $validated['file_path'],
            'old_code' => $validated['old_code'],
            'new_code' => $validated['new_code'],
            'fix_explanation' => $validated['fix_explanation'],
            'commit_message' => $validated['commit_message'] ?? "fix: {$validated['fix_explanation']}",
            'status' => AgentFixRequest::STATUS_PENDING_APPROVAL,
        ]);

        // Disparar job para enviar WhatsApp para aprovador
        $approverPhones = $fixSettings['approver_phones'] ?? [];
        if (!empty($approverPhones)) {
            SendFixApprovalRequest::dispatch($fixRequest, $approverPhones);
        }

        Log::info('Fix request created', [
            'fix_request_id' => $fixRequest->id,
            'ticket_id' => $fixRequest->ticket_id,
            'file_path' => $fixRequest->file_path,
        ]);

        return response()->json([
            'success' => true,
            'id' => $fixRequest->id,
            'approval_token' => $fixRequest->approval_token,
            'status' => 'pending_approval',
            'message' => 'Solicitação de correção enviada para aprovação',
        ], 201);
    }

    /**
     * Listar solicitações de fix (para painel admin)
     */
    public function index(Request $request): JsonResponse
    {
        $query = AgentFixRequest::with(['ticket', 'agent'])
            ->orderBy('created_at', 'desc');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('ticket_id')) {
            $query->where('ticket_id', $request->ticket_id);
        }

        $perPage = $request->input('per_page', 20);
        $fixRequests = $query->paginate($perPage);

        return response()->json($fixRequests);
    }

    /**
     * Detalhes de uma solicitação específica
     */
    public function show(string $id): JsonResponse
    {
        $fixRequest = AgentFixRequest::with(['ticket', 'agent', 'tenant'])
            ->findOrFail($id);

        return response()->json($fixRequest);
    }

    /**
     * Aprovar uma solicitação (pode ser via API ou webhook WhatsApp)
     */
    public function approve(Request $request, string $id): JsonResponse
    {
        $fixRequest = AgentFixRequest::findOrFail($id);

        if (!$fixRequest->isPending()) {
            return response()->json([
                'success' => false,
                'error' => 'Esta solicitação não está mais pendente',
            ], 400);
        }

        $approverPhone = $request->input('approver_phone', 'api');
        $fixRequest->approve($approverPhone);

        // Disparar job para executar a correção
        ProcessApprovedFix::dispatch($fixRequest);

        Log::info('Fix request approved', [
            'fix_request_id' => $fixRequest->id,
            'approver' => $approverPhone,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Correção aprovada e em execução',
        ]);
    }

    /**
     * Rejeitar uma solicitação
     */
    public function reject(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'reason' => 'required|string|max:500',
            'approver_phone' => 'nullable|string',
        ]);

        $fixRequest = AgentFixRequest::findOrFail($id);

        if (!$fixRequest->isPending()) {
            return response()->json([
                'success' => false,
                'error' => 'Esta solicitação não está mais pendente',
            ], 400);
        }

        $fixRequest->reject(
            $validated['reason'],
            $validated['approver_phone'] ?? 'api'
        );

        Log::info('Fix request rejected', [
            'fix_request_id' => $fixRequest->id,
            'reason' => $validated['reason'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Correção rejeitada',
        ]);
    }

    /**
     * Registrar feedback do cliente
     */
    public function customerFeedback(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'fixed' => 'required|boolean',
            'feedback' => 'nullable|string|max:1000',
        ]);

        $fixRequest = AgentFixRequest::findOrFail($id);

        if (!$fixRequest->isDeployed()) {
            return response()->json([
                'success' => false,
                'error' => 'Esta correção ainda não foi deployed',
            ], 400);
        }

        $fixRequest->customerConfirmed($validated['fixed'], $validated['feedback'] ?? null);

        // Se não funcionou e pode tentar novamente
        if (!$validated['fixed'] && $fixRequest->canRetry()) {
            $fixRequest->incrementRetry();
            // Aqui poderia disparar novo diagnóstico automático
        }

        Log::info('Customer feedback received', [
            'fix_request_id' => $fixRequest->id,
            'fixed' => $validated['fixed'],
        ]);

        return response()->json([
            'success' => true,
            'message' => $validated['fixed'] ? 'Correção confirmada!' : 'Feedback registrado, tentaremos novamente',
        ]);
    }

    /**
     * Buscar solicitação pendente por token (para webhook WhatsApp)
     */
    public function findByToken(string $token): JsonResponse
    {
        $fixRequest = AgentFixRequest::where('approval_token', $token)
            ->pending()
            ->first();

        if (!$fixRequest) {
            return response()->json([
                'success' => false,
                'error' => 'Solicitação não encontrada ou já processada',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'fix_request' => $fixRequest,
        ]);
    }

    /**
     * Processar resposta do WhatsApp (APROVAR/REJEITAR)
     */
    public function processWhatsAppResponse(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'phone' => 'required|string',
            'message' => 'required|string',
        ]);

        $phone = $validated['phone'];
        $message = strtoupper(trim($validated['message']));

        // Buscar solicitação pendente para este telefone (aprovador)
        $fixRequest = AgentFixRequest::pending()
            ->whereHas('tenant', function ($q) use ($phone) {
                $q->whereJsonContains('fix_agent_settings->approver_phones', $phone);
            })
            ->orderBy('created_at', 'desc')
            ->first();

        if (!$fixRequest) {
            return response()->json([
                'success' => false,
                'error' => 'Nenhuma solicitação pendente encontrada',
            ], 404);
        }

        // Verificar se é APROVAR
        if (str_starts_with($message, 'APROVAR')) {
            $fixRequest->approve($phone);
            ProcessApprovedFix::dispatch($fixRequest);

            return response()->json([
                'success' => true,
                'action' => 'approved',
                'message' => 'Correção aprovada e em execução!',
            ]);
        }

        // Verificar se é REJEITAR
        if (str_starts_with($message, 'REJEITAR')) {
            $reason = trim(str_replace('REJEITAR', '', $message)) ?: 'Sem motivo especificado';
            $fixRequest->reject($reason, $phone);

            return response()->json([
                'success' => true,
                'action' => 'rejected',
                'message' => 'Correção rejeitada',
            ]);
        }

        return response()->json([
            'success' => false,
            'error' => 'Comando não reconhecido. Use APROVAR ou REJEITAR [motivo]',
        ], 400);
    }
}
