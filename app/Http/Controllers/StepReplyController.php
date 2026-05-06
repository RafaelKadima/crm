<?php

namespace App\Http\Controllers;

use App\Models\StepReply;
use App\Models\StepReplyStep;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StepReplyController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = StepReply::query()
            ->withCount('steps')
            ->orderByDesc('priority')
            ->orderBy('name');

        if ($request->filled('channel_id')) {
            $query->where('channel_id', $request->string('channel_id'));
        }
        if ($request->filled('queue_id')) {
            $query->where('queue_id', $request->string('queue_id'));
        }

        return response()->json(['data' => $query->get()]);
    }

    public function show(string $id): JsonResponse
    {
        $flow = StepReply::with('steps')->findOrFail($id);
        return response()->json(['data' => $flow]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'description' => 'nullable|string|max:500',
            'channel_id' => 'nullable|uuid|exists:channels,id',
            'queue_id' => 'nullable|uuid|exists:queues,id',
            'trigger_type' => 'required|in:keyword,manual,auto_on_open',
            'trigger_config' => 'nullable|array',
            'is_active' => 'sometimes|boolean',
            'priority' => 'sometimes|integer|between:-1000,1000',
            'steps' => 'sometimes|array',
            'steps.*.order' => 'required_with:steps|integer|min:1',
            'steps.*.type' => 'required_with:steps|in:send_message,wait_input,condition,branch,handoff_human,end',
            'steps.*.config' => 'required_with:steps|array',
        ]);

        return DB::transaction(function () use ($request, $validated) {
            $flow = StepReply::create([
                'tenant_id' => $request->user()->tenant_id,
                ...collect($validated)->except('steps')->all(),
            ]);

            foreach ($validated['steps'] ?? [] as $stepData) {
                StepReplyStep::create([
                    'step_reply_id' => $flow->id,
                    ...$stepData,
                ]);
            }

            return response()->json(['data' => $flow->fresh('steps')], 201);
        });
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $flow = StepReply::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:100',
            'description' => 'nullable|string|max:500',
            'channel_id' => 'nullable|uuid|exists:channels,id',
            'queue_id' => 'nullable|uuid|exists:queues,id',
            'trigger_type' => 'sometimes|in:keyword,manual,auto_on_open',
            'trigger_config' => 'nullable|array',
            'is_active' => 'sometimes|boolean',
            'priority' => 'sometimes|integer|between:-1000,1000',
            'steps' => 'sometimes|array',
            'steps.*.order' => 'required_with:steps|integer|min:1',
            'steps.*.type' => 'required_with:steps|in:send_message,wait_input,condition,branch,handoff_human,end',
            'steps.*.config' => 'required_with:steps|array',
        ]);

        return DB::transaction(function () use ($flow, $validated) {
            $flow->update(collect($validated)->except('steps')->all());

            // Sync steps: replace strategy (mais simples que diff por order)
            if (array_key_exists('steps', $validated)) {
                $flow->steps()->delete();
                foreach ($validated['steps'] as $stepData) {
                    StepReplyStep::create([
                        'step_reply_id' => $flow->id,
                        ...$stepData,
                    ]);
                }
            }

            return response()->json(['data' => $flow->fresh('steps')]);
        });
    }

    public function destroy(string $id): JsonResponse
    {
        StepReply::findOrFail($id)->delete();
        return response()->json(['message' => 'Step Reply excluído.']);
    }
}
