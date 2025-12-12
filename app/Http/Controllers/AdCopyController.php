<?php

namespace App\Http\Controllers;

use App\Models\AdCopy;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdCopyController extends Controller
{
    /**
     * Lista copies do tenant.
     */
    public function index(Request $request): JsonResponse
    {
        $query = AdCopy::query();

        // Filtros
        if ($request->has('status')) {
            $query->status($request->status);
        }

        if ($request->has('hook_type')) {
            $query->hookType($request->hook_type);
        }

        if ($request->has('creative_id')) {
            $query->where('ad_creative_id', $request->creative_id);
        }

        if ($request->has('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'ilike', '%' . $request->search . '%')
                  ->orWhere('headline', 'ilike', '%' . $request->search . '%')
                  ->orWhere('primary_text', 'ilike', '%' . $request->search . '%');
            });
        }

        $copies = $query->with('creative')
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 20));

        return response()->json($copies);
    }

    /**
     * Retorna uma copy específica.
     */
    public function show(AdCopy $copy): JsonResponse
    {
        $copy->load('creative');

        return response()->json($copy);
    }

    /**
     * Cria nova copy.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ad_creative_id' => 'nullable|uuid|exists:ad_creatives,id',
            'name' => 'required|string|max:255',
            'primary_text' => 'required|string',
            'headline' => 'required|string|max:100',
            'description' => 'nullable|string|max:100',
            'call_to_action' => 'nullable|string',
            'link_url' => 'nullable|url',
            'hook_type' => 'nullable|in:benefit,curiosity,urgency,social_proof,question,authority',
            'estimated_effectiveness' => 'nullable|integer|min:0|max:100',
        ]);

        $copy = AdCopy::create([
            'tenant_id' => $request->user()->tenant_id,
            ...$validated,
            'status' => AdCopy::STATUS_DRAFT,
        ]);

        return response()->json([
            'message' => 'Copy criada com sucesso',
            'copy' => $copy,
        ], 201);
    }

    /**
     * Atualiza uma copy.
     */
    public function update(Request $request, AdCopy $copy): JsonResponse
    {
        $validated = $request->validate([
            'ad_creative_id' => 'nullable|uuid|exists:ad_creatives,id',
            'name' => 'nullable|string|max:255',
            'primary_text' => 'nullable|string',
            'headline' => 'nullable|string|max:100',
            'description' => 'nullable|string|max:100',
            'call_to_action' => 'nullable|string',
            'link_url' => 'nullable|url',
            'hook_type' => 'nullable|in:benefit,curiosity,urgency,social_proof,question,authority',
            'estimated_effectiveness' => 'nullable|integer|min:0|max:100',
        ]);

        $copy->update($validated);

        return response()->json([
            'message' => 'Copy atualizada com sucesso',
            'copy' => $copy,
        ]);
    }

    /**
     * Remove uma copy.
     */
    public function destroy(AdCopy $copy): JsonResponse
    {
        $copy->delete();

        return response()->json([
            'message' => 'Copy removida com sucesso',
        ]);
    }

    /**
     * Aprova uma copy.
     */
    public function approve(AdCopy $copy): JsonResponse
    {
        $copy->approve();

        return response()->json([
            'message' => 'Copy aprovada com sucesso',
            'copy' => $copy,
        ]);
    }

    /**
     * Lista CTAs disponíveis.
     */
    public function ctas(): JsonResponse
    {
        return response()->json(AdCopy::getAvailableCtas());
    }

    /**
     * Lista tipos de hooks disponíveis.
     */
    public function hookTypes(): JsonResponse
    {
        return response()->json(AdCopy::getAvailableHookTypes());
    }

    /**
     * Lista copies para AI Service (rota interna).
     */
    public function internalIndex(Request $request): JsonResponse
    {
        $tenantId = $request->header('X-Tenant-ID');
        
        if (!$tenantId) {
            return response()->json(['error' => 'Tenant ID required'], 400);
        }

        $query = AdCopy::where('tenant_id', $tenantId);

        if ($request->has('status')) {
            $query->status($request->status);
        }

        $copies = $query->orderBy('created_at', 'desc')
            ->limit($request->get('per_page', 10))
            ->get();

        return response()->json(['data' => $copies]);
    }

    /**
     * Retorna uma copy específica para AI Service (rota interna).
     */
    public function internalShow(Request $request, string $copyId): JsonResponse
    {
        $tenantId = $request->header('X-Tenant-ID');
        
        if (!$tenantId) {
            return response()->json(['error' => 'Tenant ID required'], 400);
        }

        $copy = AdCopy::where('tenant_id', $tenantId)
            ->where('id', $copyId)
            ->first();

        if (!$copy) {
            return response()->json(['error' => 'Copy not found'], 404);
        }

        return response()->json(['data' => $copy]);
    }
}

