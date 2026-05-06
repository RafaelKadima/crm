<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    /**
     * Lista audit logs do tenant atual com filtros opcionais.
     * Acesso restrito a admin e super_admin.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user || (!$user->isAdmin() && !$user->isSuperAdmin())) {
            abort(403, 'Apenas administradores podem acessar audit logs.');
        }

        $validated = $request->validate([
            'model_type' => 'sometimes|string|max:120',
            'model_id' => 'sometimes|string|max:64',
            'actor_id' => 'sometimes|string|max:64',
            'action' => 'sometimes|string|max:32',
            'from' => 'sometimes|date',
            'to' => 'sometimes|date|after_or_equal:from',
            'per_page' => 'sometimes|integer|min:1|max:200',
        ]);

        $query = AuditLog::query()
            ->orderBy('created_at', 'desc');

        // Super admin pode ver tudo; admin tenant fica limitado ao tenant
        if (!$user->isSuperAdmin()) {
            $query->where('tenant_id', $user->tenant_id);
        }

        if (!empty($validated['model_type'])) {
            $query->where('model_type', $validated['model_type']);
        }
        if (!empty($validated['model_id'])) {
            $query->where('model_id', $validated['model_id']);
        }
        if (!empty($validated['actor_id'])) {
            $query->where('actor_id', $validated['actor_id']);
        }
        if (!empty($validated['action'])) {
            $query->where('action', $validated['action']);
        }
        if (!empty($validated['from'])) {
            $query->where('created_at', '>=', $validated['from']);
        }
        if (!empty($validated['to'])) {
            $query->where('created_at', '<=', $validated['to']);
        }

        $perPage = $validated['per_page'] ?? 50;
        $logs = $query->paginate($perPage);

        return response()->json($logs);
    }

    /**
     * Detalhe de um audit log específico.
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        if (!$user || (!$user->isAdmin() && !$user->isSuperAdmin())) {
            abort(403, 'Apenas administradores podem acessar audit logs.');
        }

        $query = AuditLog::query()->where('id', $id);

        if (!$user->isSuperAdmin()) {
            $query->where('tenant_id', $user->tenant_id);
        }

        $log = $query->firstOrFail();

        return response()->json(['data' => $log]);
    }
}
