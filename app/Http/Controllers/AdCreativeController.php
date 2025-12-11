<?php

namespace App\Http\Controllers;

use App\Models\AdCreative;
use App\Models\AdCopy;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AdCreativeController extends Controller
{
    /**
     * Lista criativos do tenant.
     */
    public function index(Request $request): JsonResponse
    {
        $query = AdCreative::query();

        // Filtros
        if ($request->has('type')) {
            $query->ofType($request->type);
        }

        if ($request->has('status')) {
            $query->status($request->status);
        }

        if ($request->boolean('active_only', false)) {
            $query->active();
        }

        if ($request->has('search')) {
            $query->where('name', 'ilike', '%' . $request->search . '%');
        }

        $creatives = $query->with('account')
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 20));

        return response()->json($creatives);
    }

    /**
     * Retorna um criativo específico.
     */
    public function show(AdCreative $creative): JsonResponse
    {
        $creative->load(['account', 'copies']);

        return response()->json($creative);
    }

    /**
     * Upload de novo criativo.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'file' => 'required|file|mimes:jpg,jpeg,png,gif,mp4,mov,avi,webm|max:104857600', // 100MB max
            'name' => 'nullable|string|max:255',
            'ad_account_id' => 'nullable|uuid|exists:ad_accounts,id',
            'type' => 'nullable|in:image,video',
        ]);

        try {
            $file = $request->file('file');
            $mimeType = $file->getMimeType();
            $isVideo = Str::startsWith($mimeType, 'video/');
            
            // Determina o tipo
            $type = $validated['type'] ?? ($isVideo ? 'video' : 'image');
            
            // Gera nome único
            $fileName = Str::uuid() . '.' . $file->getClientOriginalExtension();
            $path = "creatives/{$request->user()->tenant_id}/{$fileName}";
            
            // Armazena o arquivo
            Storage::disk('public')->put($path, file_get_contents($file));
            $fileUrl = Storage::disk('public')->url($path);
            
            // Obtém dimensões para imagens
            $width = null;
            $height = null;
            $duration = null;
            
            if (!$isVideo) {
                $imageInfo = getimagesize($file->getPathname());
                if ($imageInfo) {
                    $width = $imageInfo[0];
                    $height = $imageInfo[1];
                }
            }

            // Cria o registro
            $creative = AdCreative::create([
                'tenant_id' => $request->user()->tenant_id,
                'ad_account_id' => $validated['ad_account_id'] ?? null,
                'name' => $validated['name'] ?? $file->getClientOriginalName(),
                'type' => $type,
                'file_path' => $path,
                'file_url' => $fileUrl,
                'file_size' => $file->getSize(),
                'mime_type' => $mimeType,
                'width' => $width,
                'height' => $height,
                'duration_seconds' => $duration,
                'status' => AdCreative::STATUS_READY,
                'is_active' => true,
            ]);

            Log::info('Creative uploaded', [
                'creative_id' => $creative->id,
                'tenant_id' => $creative->tenant_id,
                'type' => $type,
                'file_size' => $file->getSize(),
            ]);

            return response()->json([
                'message' => 'Criativo enviado com sucesso',
                'creative' => $creative,
            ], 201);

        } catch (\Exception $e) {
            Log::error('Failed to upload creative', [
                'error' => $e->getMessage(),
                'tenant_id' => $request->user()->tenant_id,
            ]);

            return response()->json([
                'error' => 'Erro ao enviar criativo: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Upload via URL externa.
     */
    public function storeFromUrl(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'url' => 'required|url',
            'name' => 'required|string|max:255',
            'type' => 'required|in:image,video',
            'ad_account_id' => 'nullable|uuid|exists:ad_accounts,id',
            'thumbnail_url' => 'nullable|url',
        ]);

        try {
            $creative = AdCreative::create([
                'tenant_id' => $request->user()->tenant_id,
                'ad_account_id' => $validated['ad_account_id'] ?? null,
                'name' => $validated['name'],
                'type' => $validated['type'],
                'external_url' => $validated['url'],
                'thumbnail_url' => $validated['thumbnail_url'] ?? null,
                'status' => AdCreative::STATUS_READY,
                'is_active' => true,
            ]);

            return response()->json([
                'message' => 'Criativo adicionado com sucesso',
                'creative' => $creative,
            ], 201);

        } catch (\Exception $e) {
            Log::error('Failed to create creative from URL', [
                'error' => $e->getMessage(),
                'tenant_id' => $request->user()->tenant_id,
            ]);

            return response()->json([
                'error' => 'Erro ao adicionar criativo: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Atualiza um criativo.
     */
    public function update(Request $request, AdCreative $creative): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'headline' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'primary_text' => 'nullable|string',
            'call_to_action' => 'nullable|string',
            'destination_url' => 'nullable|url',
            'is_active' => 'nullable|boolean',
        ]);

        $creative->update($validated);

        return response()->json([
            'message' => 'Criativo atualizado com sucesso',
            'creative' => $creative,
        ]);
    }

    /**
     * Remove um criativo.
     */
    public function destroy(AdCreative $creative): JsonResponse
    {
        // Remove arquivo se existir
        if ($creative->file_path && Storage::disk('public')->exists($creative->file_path)) {
            Storage::disk('public')->delete($creative->file_path);
        }

        $creative->delete();

        return response()->json([
            'message' => 'Criativo removido com sucesso',
        ]);
    }

    /**
     * Lista copies de um criativo.
     */
    public function copies(AdCreative $creative): JsonResponse
    {
        return response()->json($creative->copies);
    }

    /**
     * Adiciona copy a um criativo.
     */
    public function addCopy(Request $request, AdCreative $creative): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'primary_text' => 'required|string',
            'headline' => 'required|string|max:100',
            'description' => 'nullable|string|max:100',
            'call_to_action' => 'nullable|string',
            'link_url' => 'nullable|url',
            'hook_type' => 'nullable|in:benefit,curiosity,urgency,social_proof,question,authority',
            'estimated_effectiveness' => 'nullable|integer|min:0|max:100',
        ]);

        $copy = $creative->copies()->create([
            'tenant_id' => $request->user()->tenant_id,
            ...$validated,
            'status' => AdCopy::STATUS_DRAFT,
        ]);

        return response()->json([
            'message' => 'Copy adicionada com sucesso',
            'copy' => $copy,
        ], 201);
    }
}

