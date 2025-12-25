<?php

namespace App\Http\Controllers;

use App\Models\Lead;
use App\Models\QuickReply;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class QuickReplyController extends Controller
{
    /**
     * Lista respostas rápidas do usuário
     */
    public function index(Request $request): JsonResponse
    {
        $query = QuickReply::where('user_id', auth()->id())
            ->where('tenant_id', auth()->user()->tenant_id);

        if ($request->boolean('active_only', true)) {
            $query->active();
        }

        if ($request->has('search')) {
            $query->search($request->search);
        }

        $replies = $query->orderBy('order')->orderBy('title')->get();

        return response()->json(['quick_replies' => $replies]);
    }

    /**
     * Cria nova resposta rápida
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:100',
            'shortcut' => 'nullable|string|max:50',
            'content' => 'required|string|max:4096',
            'is_active' => 'boolean',
        ]);

        // Gera shortcut se não fornecido
        if (empty($validated['shortcut'])) {
            $validated['shortcut'] = '/' . Str::slug($validated['title'], '_');
        }

        // Garante que começa com /
        if (!str_starts_with($validated['shortcut'], '/')) {
            $validated['shortcut'] = '/' . $validated['shortcut'];
        }

        // Verifica unicidade do shortcut para o usuário
        $exists = QuickReply::where('user_id', auth()->id())
            ->where('shortcut', $validated['shortcut'])
            ->exists();

        if ($exists) {
            return response()->json([
                'error' => 'Este atalho já está em uso. Escolha outro nome.',
            ], 422);
        }

        $validated['tenant_id'] = auth()->user()->tenant_id;
        $validated['user_id'] = auth()->id();
        $validated['order'] = QuickReply::where('user_id', auth()->id())->max('order') + 1;

        $reply = QuickReply::create($validated);

        return response()->json([
            'message' => 'Resposta rápida criada com sucesso.',
            'quick_reply' => $reply,
        ], 201);
    }

    /**
     * Mostra detalhes de uma resposta rápida
     */
    public function show(QuickReply $quickReply): JsonResponse
    {
        // Verifica se pertence ao usuário
        if ($quickReply->user_id !== auth()->id()) {
            return response()->json(['error' => 'Não autorizado.'], 403);
        }

        return response()->json($quickReply);
    }

    /**
     * Atualiza resposta rápida
     */
    public function update(Request $request, QuickReply $quickReply): JsonResponse
    {
        // Verifica se pertence ao usuário
        if ($quickReply->user_id !== auth()->id()) {
            return response()->json(['error' => 'Não autorizado.'], 403);
        }

        $validated = $request->validate([
            'title' => 'sometimes|string|max:100',
            'shortcut' => 'nullable|string|max:50',
            'content' => 'sometimes|string|max:4096',
            'is_active' => 'boolean',
            'order' => 'integer|min:0',
        ]);

        // Verifica unicidade do shortcut se mudou
        if (!empty($validated['shortcut']) && $validated['shortcut'] !== $quickReply->shortcut) {
            // Garante que começa com /
            if (!str_starts_with($validated['shortcut'], '/')) {
                $validated['shortcut'] = '/' . $validated['shortcut'];
            }

            $exists = QuickReply::where('user_id', auth()->id())
                ->where('shortcut', $validated['shortcut'])
                ->where('id', '!=', $quickReply->id)
                ->exists();

            if ($exists) {
                return response()->json([
                    'error' => 'Este atalho já está em uso. Escolha outro nome.',
                ], 422);
            }
        }

        $quickReply->update($validated);

        return response()->json([
            'message' => 'Resposta rápida atualizada com sucesso.',
            'quick_reply' => $quickReply->fresh(),
        ]);
    }

    /**
     * Remove resposta rápida
     */
    public function destroy(QuickReply $quickReply): JsonResponse
    {
        // Verifica se pertence ao usuário
        if ($quickReply->user_id !== auth()->id()) {
            return response()->json(['error' => 'Não autorizado.'], 403);
        }

        $quickReply->delete();

        return response()->json([
            'message' => 'Resposta rápida removida com sucesso.',
        ]);
    }

    /**
     * Lista variáveis disponíveis
     */
    public function variables(): JsonResponse
    {
        return response()->json([
            'variables' => QuickReply::AVAILABLE_VARIABLES,
        ]);
    }

    /**
     * Renderiza resposta rápida com contexto do lead
     */
    public function render(Request $request, QuickReply $quickReply): JsonResponse
    {
        // Verifica se pertence ao usuário
        if ($quickReply->user_id !== auth()->id()) {
            return response()->json(['error' => 'Não autorizado.'], 403);
        }

        $validated = $request->validate([
            'lead_id' => 'nullable|uuid|exists:leads,id',
        ]);

        // Contexto padrão
        $context = [
            'nome_atendente' => auth()->user()->name,
            'nome_empresa' => auth()->user()->tenant->name ?? '',
            'data_hoje' => now()->format('d/m/Y'),
            'hora_atual' => now()->format('H:i'),
        ];

        // Adiciona dados do lead se fornecido
        if (!empty($validated['lead_id'])) {
            $lead = Lead::with('contact')->find($validated['lead_id']);
            if ($lead && $lead->contact) {
                $fullName = $lead->contact->name ?? '';
                $context['nome_cliente'] = $fullName;
                $context['primeiro_nome'] = explode(' ', $fullName)[0] ?? '';
                $context['telefone'] = $lead->contact->phone ?? '';
                $context['email'] = $lead->contact->email ?? '';
            }
        }

        // Incrementa contador de uso
        $quickReply->incrementUseCount();

        return response()->json([
            'rendered_content' => $quickReply->render($context),
            'original_content' => $quickReply->content,
            'variables_used' => $quickReply->variables,
        ]);
    }

    /**
     * Reordena respostas rápidas
     */
    public function reorder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'items' => 'required|array',
            'items.*.id' => 'required|uuid|exists:quick_replies,id',
            'items.*.order' => 'required|integer|min:0',
        ]);

        foreach ($validated['items'] as $item) {
            QuickReply::where('id', $item['id'])
                ->where('user_id', auth()->id())
                ->update(['order' => $item['order']]);
        }

        return response()->json([
            'message' => 'Ordem atualizada com sucesso.',
        ]);
    }
}
