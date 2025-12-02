<?php

namespace App\Http\Controllers;

use App\Models\Contact;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
            'address' => 'nullable|array',
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
            'address' => 'nullable|array',
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
}


