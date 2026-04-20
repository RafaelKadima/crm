<?php

namespace App\Http\Controllers;

use App\Models\LostReason;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LostReasonController extends Controller
{
    public function index(): JsonResponse
    {
        $reasons = LostReason::ordered()->get();

        return response()->json(['lost_reasons' => $reasons]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:120',
            'color' => 'nullable|string|max:20',
            'is_active' => 'nullable|boolean',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        $reason = LostReason::create([
            ...$validated,
            'tenant_id' => auth()->user()->tenant_id,
            'is_active' => $validated['is_active'] ?? true,
            'sort_order' => $validated['sort_order'] ?? 0,
        ]);

        return response()->json(['lost_reason' => $reason], 201);
    }

    public function update(Request $request, LostReason $lostReason): JsonResponse
    {
        $this->authorizeTenant($lostReason);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:120',
            'color' => 'nullable|string|max:20',
            'is_active' => 'sometimes|boolean',
            'sort_order' => 'sometimes|integer|min:0',
        ]);

        $lostReason->update($validated);

        return response()->json(['lost_reason' => $lostReason->fresh()]);
    }

    public function destroy(LostReason $lostReason): JsonResponse
    {
        $this->authorizeTenant($lostReason);

        $lostReason->update(['is_active' => false]);

        return response()->json(['message' => 'Motivo desativado.']);
    }

    private function authorizeTenant(LostReason $reason): void
    {
        abort_unless($reason->tenant_id === auth()->user()->tenant_id, 403);
    }
}
