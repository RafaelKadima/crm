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
     */
    public function index(Request $request): JsonResponse
    {
        $query = Lead::with(['contact', 'pipeline', 'stage', 'channel', 'owner']);

        // Filtros
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
     */
    public function show(Lead $lead): JsonResponse
    {
        $lead->load([
            'contact',
            'pipeline',
            'stage',
            'channel',
            'owner',
            'tickets.messages',
            'tasks',
            'activities.user',
        ]);

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
        ]);

        $lead->update($validated);
        $lead->load(['contact', 'pipeline', 'stage', 'channel', 'owner']);

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
        $lead->delete();

        return response()->json([
            'message' => 'Lead removido com sucesso.',
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


