<?php

namespace App\Http\Controllers;

use App\Models\Channel;
use App\Services\WhatsAppService;
use App\Services\InstagramService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChannelController extends Controller
{
    /**
     * Lista canais.
     */
    public function index(): JsonResponse
    {
        $channels = Channel::withCount(['leads', 'tickets'])
            ->orderBy('name')
            ->get();

        return response()->json($channels);
    }

    /**
     * Cria um novo canal.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|string|in:whatsapp,instagram,webchat,other',
            'identifier' => 'required|string|max:255',
            'ia_mode' => 'nullable|string|in:none,ia_sdr,enterprise',
            'ia_workflow_id' => 'nullable|string|max:255',
            'is_active' => 'nullable|boolean',
            'config' => 'nullable|array',
            'config.phone_number_id' => 'nullable|string',
            'config.access_token' => 'nullable|string',
            'config.business_account_id' => 'nullable|string',
            'config.page_id' => 'nullable|string',
            'config.instagram_account_id' => 'nullable|string',
        ]);

        // Set default values
        $validated['is_active'] = $validated['is_active'] ?? true;
        $validated['ia_mode'] = $validated['ia_mode'] ?? 'none';

        $channel = Channel::create($validated);

        return response()->json([
            'message' => 'Canal criado com sucesso.',
            'channel' => $channel,
        ], 201);
    }

    /**
     * Exibe um canal específico.
     */
    public function show(Channel $channel): JsonResponse
    {
        $channel->loadCount(['leads', 'tickets']);
        return response()->json($channel);
    }

    /**
     * Atualiza um canal.
     */
    public function update(Request $request, Channel $channel): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'type' => 'nullable|string|in:whatsapp,instagram,webchat,other',
            'identifier' => 'nullable|string|max:255',
            'ia_mode' => 'nullable|string|in:none,ia_sdr,enterprise',
            'ia_workflow_id' => 'nullable|string|max:255',
            'is_active' => 'nullable|boolean',
            'config' => 'nullable|array',
            'config.phone_number_id' => 'nullable|string',
            'config.access_token' => 'nullable|string',
            'config.business_account_id' => 'nullable|string',
            'config.page_id' => 'nullable|string',
            'config.instagram_account_id' => 'nullable|string',
        ]);

        // Merge config if exists
        if (isset($validated['config']) && $channel->config) {
            $validated['config'] = array_merge($channel->config, $validated['config']);
        }

        $channel->update($validated);

        return response()->json([
            'message' => 'Canal atualizado com sucesso.',
            'channel' => $channel->fresh(),
        ]);
    }

    /**
     * Remove um canal.
     */
    public function destroy(Channel $channel): JsonResponse
    {
        // Check if channel has leads or tickets
        if ($channel->leads()->count() > 0 || $channel->tickets()->count() > 0) {
            return response()->json([
                'message' => 'Não é possível remover um canal com leads ou tickets vinculados.',
            ], 422);
        }

        $channel->delete();

        return response()->json([
            'message' => 'Canal removido com sucesso.',
        ]);
    }

    /**
     * Testa a conexão de um canal.
     */
    public function testConnection(Channel $channel): JsonResponse
    {
        if (!$channel->config) {
            return response()->json([
                'success' => false,
                'message' => 'Canal não possui configuração de API.',
            ]);
        }

        try {
            if ($channel->type->value === 'whatsapp') {
                $service = new WhatsAppService($channel);
                $result = $service->testConnection();
                
                return response()->json([
                    'success' => $result['success'],
                    'message' => $result['success'] 
                        ? "Conexão OK! Número: {$result['phone_number']} - {$result['verified_name']}"
                        : $result['error'],
                    'data' => $result,
                ]);
            }

            if ($channel->type->value === 'instagram') {
                $service = new InstagramService($channel);
                $result = $service->testConnection();
                
                return response()->json([
                    'success' => $result['success'],
                    'message' => $result['success'] 
                        ? "Conexão OK! @{$result['instagram_username']} - {$result['followers_count']} seguidores"
                        : $result['error'],
                    'data' => $result,
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Tipo de canal não suporta teste de conexão.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao testar conexão: ' . $e->getMessage(),
            ]);
        }
    }

    /**
     * Atualiza configuração de IA do canal.
     */
    public function updateIaMode(Request $request, Channel $channel): JsonResponse
    {
        $validated = $request->validate([
            'ia_mode' => 'required|string|in:none,ia_sdr,enterprise',
            'ia_workflow_id' => 'nullable|string|max:255',
            'sdr_agent_id' => 'nullable|uuid|exists:sdr_agents,id',
        ]);

        // Se sdr_agent_id for string vazia, define como null
        if (empty($validated['sdr_agent_id'])) {
            $validated['sdr_agent_id'] = null;
        }

        $channel->update($validated);

        return response()->json([
            'message' => 'Modo de IA atualizado com sucesso.',
            'channel' => $channel->fresh()->load('sdrAgent'),
        ]);
    }

    /**
     * Toggle ativo/inativo.
     */
    public function toggleActive(Channel $channel): JsonResponse
    {
        $channel->update(['is_active' => !$channel->is_active]);

        return response()->json([
            'message' => $channel->is_active ? 'Canal ativado.' : 'Canal desativado.',
            'channel' => $channel->fresh(),
        ]);
    }

    /**
     * Configura o menu de filas do canal.
     */
    public function updateQueueMenu(Request $request, Channel $channel): JsonResponse
    {
        $validated = $request->validate([
            'queue_menu_enabled' => 'required|boolean',
            'queue_menu_header' => 'nullable|string|max:500',
            'queue_menu_footer' => 'nullable|string|max:500',
            'queue_menu_invalid_response' => 'nullable|string|max:500',
            'return_timeout_hours' => 'nullable|integer|min:1|max:720', // 1h a 30 dias
        ]);

        $channel->update($validated);

        // Retorna preview do menu se estiver habilitado
        $menuPreview = $channel->hasQueueMenu() ? $channel->getQueueMenuText() : null;

        return response()->json([
            'message' => $validated['queue_menu_enabled'] 
                ? 'Menu de filas ativado.' 
                : 'Menu de filas desativado.',
            'channel' => $channel->fresh()->load('queues'),
            'menu_preview' => $menuPreview,
        ]);
    }

    /**
     * Retorna preview do menu de filas.
     */
    public function previewQueueMenu(Channel $channel): JsonResponse
    {
        return response()->json([
            'enabled' => $channel->hasQueueMenu(),
            'menu_text' => $channel->getQueueMenuText(),
            'invalid_response' => $channel->getQueueMenuInvalidResponse(),
            'queues_count' => $channel->activeQueues()->count(),
        ]);
    }
}


