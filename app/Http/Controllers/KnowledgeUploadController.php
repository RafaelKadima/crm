<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class KnowledgeUploadController extends Controller
{
    /**
     * Upload de documento para Knowledge Base via AI Service.
     */
    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|mimes:pdf,doc,docx,txt,md|max:10240', // 10MB
            'category' => 'required|string|in:rules,best_practices,brand_guidelines,documents,patterns',
            'title' => 'nullable|string|max:255',
            'tags' => 'nullable|string',
        ]);

        try {
            $file = $request->file('file');
            $tenantId = auth()->user()->tenant_id;
            
            $aiServiceUrl = config('services.ai_service.url');
            $internalApiKey = config('services.ai_service.internal_key');

            if (!$aiServiceUrl) {
                return response()->json(['error' => 'AI Service not configured'], 500);
            }

            // Envia arquivo para AI Service
            $response = Http::timeout(120)
                ->withHeaders([
                    'X-Internal-Key' => $internalApiKey,
                ])
                ->attach(
                    'file',
                    file_get_contents($file->getRealPath()),
                    $file->getClientOriginalName()
                )
                ->post("{$aiServiceUrl}/knowledge/upload", [
                    'tenant_id' => $tenantId,
                    'category' => $request->input('category'),
                    'title' => $request->input('title'),
                    'tags' => $request->input('tags'),
                ]);

            if ($response->successful()) {
                Log::info("Knowledge document uploaded", [
                    'tenant_id' => $tenantId,
                    'filename' => $file->getClientOriginalName(),
                    'response' => $response->json(),
                ]);
                
                return response()->json($response->json());
            } else {
                Log::error("AI Service knowledge upload failed", [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                
                return response()->json([
                    'error' => 'Failed to process document',
                    'details' => $response->json('detail') ?? $response->body(),
                ], $response->status());
            }

        } catch (\Exception $e) {
            Log::error("Knowledge upload error: " . $e->getMessage(), ['exception' => $e]);
            
            return response()->json([
                'error' => 'Internal server error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Retorna tipos de arquivo suportados.
     */
    public function supportedTypes(): JsonResponse
    {
        return response()->json([
            'supported_extensions' => ['.pdf', '.docx', '.doc', '.txt', '.md'],
            'max_file_size_mb' => 10,
            'valid_categories' => ['rules', 'best_practices', 'brand_guidelines', 'documents', 'patterns'],
        ]);
    }
}

