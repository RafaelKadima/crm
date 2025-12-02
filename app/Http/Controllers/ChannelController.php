<?php

namespace App\Http\Controllers;

use App\Models\Channel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChannelController extends Controller
{
    /**
     * Lista canais.
     */
    public function index(): JsonResponse
    {
        $channels = Channel::orderBy('name')->get();

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
        ]);

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
        ]);

        $channel->update($validated);

        return response()->json([
            'message' => 'Canal atualizado com sucesso.',
            'channel' => $channel,
        ]);
    }

    /**
     * Remove um canal.
     */
    public function destroy(Channel $channel): JsonResponse
    {
        $channel->delete();

        return response()->json([
            'message' => 'Canal removido com sucesso.',
        ]);
    }
}


