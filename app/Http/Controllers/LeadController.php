<?php

namespace App\Http\Controllers;

use App\Enums\ActivitySourceEnum;
use App\Models\Contact;
use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\PipelineStage;
use App\Models\User;
use App\Services\LeadAssignmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeadController extends Controller
{
    public function __construct(
        protected LeadAssignmentService $assignmentService
    ) {}

    /**
     * Lista leads com filtros.
     * 
     * Permissões por role:
     * - Administrador: vê todos os leads
     * - Gestor: vê leads das filas onde está cadastrado
     * - Vendedor/Marketing: vê apenas leads onde é o dono (owner)
     */
    public function index(Request $request): JsonResponse
    {
        $user = auth()->user();
        $query = Lead::with([
            'contact', 
            'pipeline', 
            'stage', 
            'channel', 
            'owner',
            'tickets' => function ($q) {
                $q->select('id', 'lead_id', 'status', 'created_at')
                    ->withCount('messages')
                    ->orderByRaw("CASE WHEN status = 'open' THEN 0 ELSE 1 END")
                    ->orderByDesc('created_at')
                    ->limit(1); // Apenas o ticket mais recente
            }
        ]);

        // Aplica filtro baseado no role do usuário
        if ($user->isAdmin()) {
            // Admin vê tudo - sem filtro
        } elseif ($user->isGestor()) {
            // Gestor vê leads das filas onde está cadastrado
            $userQueueIds = $user->queues()->pluck('queues.id')->toArray();
            
            if (!empty($userQueueIds)) {
                $query->where(function ($q) use ($user, $userQueueIds) {
                    // Leads nas filas do gestor
                    $q->whereIn('queue_id', $userQueueIds)
                    // OU leads onde é o dono direto
                    ->orWhere('owner_id', $user->id);
                });
            } else {
                // Gestor sem filas vê apenas os seus
                $query->where('owner_id', $user->id);
            }
        } else {
            // Vendedor/Marketing vê apenas os seus
            $query->where('owner_id', $user->id);
        }

        // Filtros adicionais
        if ($request->has('stage_id')) {
            $query->where('stage_id', $request->stage_id);
        }

        if ($request->has('owner_id')) {
            $query->where('owner_id', $request->owner_id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('channel_id')) {
            $query->where('channel_id', $request->channel_id);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->whereHas('contact', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($request->has('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        // Ordenação
        $query->orderByDesc('created_at');

        $leads = $query->paginate($request->get('per_page', 15));

        return response()->json($leads);
    }

    /**
     * Cria um novo lead.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'contact_id' => 'nullable|uuid|exists:contacts,id',
            'contact' => 'nullable|array',
            'contact.name' => 'required_with:contact|string|max:255',
            'contact.phone' => 'required_with:contact|string|max:20',
            'contact.email' => 'nullable|email|max:255',
            'pipeline_id' => 'required|uuid|exists:pipelines,id',
            'stage_id' => 'required|uuid|exists:pipeline_stages,id',
            'channel_id' => 'required|uuid|exists:channels,id',
            'value' => 'nullable|numeric|min:0',
            'expected_close_date' => 'nullable|date',
        ]);

        // Cria ou busca o contato
        if (!empty($validated['contact'])) {
            $contact = Contact::create([
                'name' => $validated['contact']['name'],
                'phone' => $validated['contact']['phone'],
                'email' => $validated['contact']['email'] ?? null,
            ]);
            $validated['contact_id'] = $contact->id;
        }

        $lead = Lead::create([
            'contact_id' => $validated['contact_id'],
            'pipeline_id' => $validated['pipeline_id'],
            'stage_id' => $validated['stage_id'],
            'channel_id' => $validated['channel_id'],
            'value' => $validated['value'] ?? null,
            'expected_close_date' => $validated['expected_close_date'] ?? null,
        ]);

        $lead->load(['contact', 'pipeline', 'stage', 'channel', 'owner']);

        return response()->json([
            'message' => 'Lead criado com sucesso.',
            'lead' => $lead,
        ], 201);
    }

    /**
     * Exibe um lead específico.
     * NÃO carrega todas as mensagens - use GET /tickets/{id}/messages para lazy load
     */
    public function show(Lead $lead): JsonResponse
    {
        $lead->load([
            'contact',
            'pipeline',
            'stage',
            'channel',
            'owner',
            'tickets' => function ($query) {
                $query->select('id', 'lead_id', 'contact_id', 'channel_id', 'status', 'created_at', 'updated_at')
                    ->withCount('messages')
                    ->orderByRaw("CASE WHEN status = 'open' THEN 0 ELSE 1 END")
                    ->orderBy('created_at', 'desc');
            },
            'tasks',
            'activities.user',
        ]);

        // Adiciona última mensagem de cada ticket (preview)
        foreach ($lead->tickets as $ticket) {
            $ticket->last_message_preview = $ticket->messages()
                ->select('id', 'ticket_id', 'message', 'sender_type', 'sent_at')
                ->latest('sent_at')
                ->first();
        }

        return response()->json($lead);
    }

    /**
     * Atualiza um lead.
     */
    public function update(Request $request, Lead $lead): JsonResponse
    {
        $validated = $request->validate([
            'stage_id' => 'nullable|uuid|exists:pipeline_stages,id',
            'owner_id' => 'nullable|uuid|exists:users,id',
            'status' => 'nullable|string|in:open,won,lost,disqualified',
            'value' => 'nullable|numeric|min:0',
            'expected_close_date' => 'nullable|date',
            'product_id' => 'nullable|uuid|exists:products,id',
        ]);

        // Se foi selecionado um produto, atualiza o relacionamento
        if (isset($validated['product_id'])) {
            $productId = $validated['product_id'];
            unset($validated['product_id']);
            
            if ($productId) {
                $product = \App\Models\Product::find($productId);
                
                // Remove produtos anteriores
                \App\Models\LeadProduct::where('lead_id', $lead->id)->delete();
                
                // Adiciona o novo produto usando o modelo (para gerar UUID)
                \App\Models\LeadProduct::create([
                    'lead_id' => $lead->id,
                    'product_id' => $productId,
                    'quantity' => 1,
                    'unit_price' => $product->current_price,
                ]);
                
                // Atualiza o valor do lead com o preço do produto
                $validated['value'] = $product->current_price;
            } else {
                // Remove todos os produtos
                \App\Models\LeadProduct::where('lead_id', $lead->id)->delete();
                $validated['value'] = 0;
            }
        }

        $lead->update($validated);
        $lead->load(['contact', 'pipeline', 'stage', 'channel', 'owner', 'products']);

        // Broadcast para atualização em tempo real
        event(new \App\Events\LeadUpdated($lead, 'updated'));

        return response()->json([
            'message' => 'Lead atualizado com sucesso.',
            'lead' => $lead,
        ]);
    }

    /**
     * Remove um lead.
     */
    public function destroy(Lead $lead): JsonResponse
    {
        $tenantId = $lead->tenant_id;
        $leadId = $lead->id;
        
        $lead->delete();

        // Broadcast para remoção em tempo real
        broadcast(new \App\Events\LeadUpdated($lead, 'deleted'))->toOthers();

        return response()->json([
            'message' => 'Lead removido com sucesso.',
            'lead_id' => $leadId,
        ]);
    }

    /**
     * Atualiza o estágio do lead.
     */
    public function updateStage(Request $request, Lead $lead): JsonResponse
    {
        $validated = $request->validate([
            'stage_id' => 'required|uuid|exists:pipeline_stages,id',
        ]);

        $oldStage = $lead->stage;
        $newStage = PipelineStage::find($validated['stage_id']);

        $lead->moveToStage($newStage);

        // Registra atividade
        LeadActivity::stageChanged($lead, $oldStage, $newStage, auth()->user(), ActivitySourceEnum::USER);

        $lead->load(['contact', 'pipeline', 'stage', 'channel', 'owner']);

        return response()->json([
            'message' => 'Estágio atualizado com sucesso.',
            'lead' => $lead,
        ]);
    }

    /**
     * Atribui o lead a um vendedor.
     */
    public function assign(Request $request, Lead $lead): JsonResponse
    {
        $validated = $request->validate([
            'owner_id' => 'nullable|uuid|exists:users,id',
        ]);

        $oldOwner = $lead->owner;

        if (!empty($validated['owner_id'])) {
            $newOwner = User::find($validated['owner_id']);
            $lead->assignTo($newOwner);
        } else {
            // Usa Round-Robin para atribuir automaticamente
            $newOwner = $this->assignmentService->assignLeadOwner($lead);
        }

        // Registra atividade
        LeadActivity::ownerAssigned($lead, $oldOwner, $newOwner, auth()->user(), ActivitySourceEnum::USER);

        $lead->load(['contact', 'pipeline', 'stage', 'channel', 'owner']);

        return response()->json([
            'message' => 'Lead atribuído com sucesso.',
            'lead' => $lead,
        ]);
    }
}


