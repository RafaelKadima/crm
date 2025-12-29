<?php

namespace App\Http\Controllers;

use App\Models\Contact;
use App\Models\Lead;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ContactController extends Controller
{
    /**
     * Lista contatos com filtros.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Contact::with('owner');

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($request->has('owner_id')) {
            $query->where('owner_id', $request->owner_id);
        }

        $query->orderByDesc('created_at');

        $contacts = $query->paginate($request->get('per_page', 15));

        return response()->json($contacts);
    }

    /**
     * Cria um novo contato.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'required|string|max:20',
            'email' => 'nullable|email|max:255',
            'cpf' => 'nullable|string|max:14',
            'address' => 'nullable|string|max:500',
            'source' => 'nullable|string|max:50',
            'extra_data' => 'nullable|array',
            'owner_id' => 'nullable|uuid|exists:users,id',
        ]);

        $contact = Contact::create($validated);
        $contact->load('owner');

        return response()->json([
            'message' => 'Contato criado com sucesso.',
            'contact' => $contact,
        ], 201);
    }

    /**
     * Exibe um contato específico.
     */
    public function show(Contact $contact): JsonResponse
    {
        $contact->load(['owner', 'leads.stage', 'tickets']);

        return response()->json($contact);
    }

    /**
     * Atualiza um contato.
     */
    public function update(Request $request, Contact $contact): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'cpf' => 'nullable|string|max:14',
            'address' => 'nullable|string|max:500',
            'source' => 'nullable|string|max:50',
            'extra_data' => 'nullable|array',
            'owner_id' => 'nullable|uuid|exists:users,id',
        ]);

        $contact->update($validated);
        $contact->load('owner');

        return response()->json([
            'message' => 'Contato atualizado com sucesso.',
            'contact' => $contact,
        ]);
    }

    /**
     * Remove um contato.
     */
    public function destroy(Contact $contact): JsonResponse
    {
        $contact->delete();

        return response()->json([
            'message' => 'Contato removido com sucesso.',
        ]);
    }

    /**
     * Upload/atualiza foto de perfil do contato.
     */
    public function uploadProfilePicture(Request $request, Contact $contact): JsonResponse
    {
        $request->validate([
            'profile_picture' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:5120', // 5MB max
        ]);

        // Deleta foto anterior se existir
        if ($contact->profile_picture_url) {
            $oldPath = str_replace('/storage/', '', parse_url($contact->profile_picture_url, PHP_URL_PATH));
            Storage::disk('public')->delete($oldPath);
        }

        // Salva nova foto
        $path = $request->file('profile_picture')->store('contacts/profile-pictures', 'public');
        $url = Storage::disk('public')->url($path);

        $contact->update(['profile_picture_url' => $url]);

        return response()->json([
            'message' => 'Foto de perfil atualizada com sucesso.',
            'profile_picture_url' => $url,
        ]);
    }

    /**
     * Define foto de perfil via URL externa.
     */
    public function setProfilePictureUrl(Request $request, Contact $contact): JsonResponse
    {
        $request->validate([
            'profile_picture_url' => 'required|url|max:2048',
        ]);

        $contact->update(['profile_picture_url' => $request->profile_picture_url]);

        return response()->json([
            'message' => 'Foto de perfil atualizada com sucesso.',
            'profile_picture_url' => $contact->profile_picture_url,
        ]);
    }

    /**
     * Remove foto de perfil do contato.
     */
    public function removeProfilePicture(Contact $contact): JsonResponse
    {
        if ($contact->profile_picture_url) {
            // Tenta deletar do storage se for local
            $path = str_replace('/storage/', '', parse_url($contact->profile_picture_url, PHP_URL_PATH));
            Storage::disk('public')->delete($path);
        }

        $contact->update(['profile_picture_url' => null]);

        return response()->json([
            'message' => 'Foto de perfil removida com sucesso.',
        ]);
    }

    /**
     * Atualiza contato a partir de um lead (via extração de dados do chat).
     */
    public function updateByLead(Request $request, string $leadId): JsonResponse
    {
        $user = $request->user();

        // Busca o lead
        $lead = Lead::where('tenant_id', $user->tenant_id)
            ->with('contact')
            ->find($leadId);

        if (!$lead) {
            return response()->json([
                'message' => 'Lead não encontrado.',
            ], 404);
        }

        if (!$lead->contact) {
            return response()->json([
                'message' => 'Lead não possui contato associado.',
            ], 422);
        }

        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'cpf' => 'nullable|string|max:14',
            'address' => 'nullable|string|max:500',
        ]);

        // Só atualiza campos que foram enviados
        $validated = array_filter($validated, fn($value) => $value !== null);

        $lead->contact->update($validated);
        $lead->load('contact');

        return response()->json([
            'message' => 'Contato atualizado com sucesso.',
            'contact' => $lead->contact,
        ]);
    }
}


