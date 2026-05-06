<?php

namespace App\Http\Controllers;

use App\Models\AutoReply;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AutoReplyController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = AutoReply::query()->orderByDesc('priority')->orderBy('name');

        if ($request->filled('channel_id')) {
            $query->where('channel_id', $request->string('channel_id'));
        }
        if ($request->filled('queue_id')) {
            $query->where('queue_id', $request->string('queue_id'));
        }
        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        return response()->json(['data' => $query->get()]);
    }

    public function show(string $id): JsonResponse
    {
        return response()->json(['data' => AutoReply::findOrFail($id)]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validatePayload($request);

        $rule = AutoReply::create([
            'tenant_id' => $request->user()->tenant_id,
            ...$validated,
        ]);

        return response()->json(['data' => $rule], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $rule = AutoReply::findOrFail($id);
        $validated = $this->validatePayload($request, isUpdate: true);
        $rule->update($validated);

        return response()->json(['data' => $rule->fresh()]);
    }

    public function destroy(string $id): JsonResponse
    {
        AutoReply::findOrFail($id)->delete();
        return response()->json(['message' => 'AutoReply excluída.']);
    }

    protected function validatePayload(Request $request, bool $isUpdate = false): array
    {
        $rules = [
            'name' => ($isUpdate ? 'sometimes' : 'required') . '|string|max:100',
            'keywords' => ($isUpdate ? 'sometimes' : 'required') . '|array|min:1',
            'keywords.*' => 'string|max:200',
            'match_type' => 'sometimes|in:exact,contains,regex',
            'channel_id' => 'nullable|uuid|exists:channels,id',
            'queue_id' => 'nullable|uuid|exists:queues,id',
            'response_text' => 'nullable|string|max:4096',
            'response_media_url' => 'nullable|url|max:1024',
            'response_media_type' => 'nullable|in:image,video,audio,document',
            'priority' => 'sometimes|integer|between:-1000,1000',
            'is_active' => 'sometimes|boolean',
            'skip_ai_after_match' => 'sometimes|boolean',
        ];

        $validated = $request->validate($rules);

        // Pelo menos um de response_text ou response_media_url precisa estar
        // presente quando criando — update permite manter o que já tem.
        if (!$isUpdate
            && empty($validated['response_text'] ?? '')
            && empty($validated['response_media_url'] ?? '')
        ) {
            abort(422, 'Informe response_text ou response_media_url.');
        }

        return $validated;
    }
}
