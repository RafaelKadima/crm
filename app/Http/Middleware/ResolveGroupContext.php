<?php

namespace App\Http\Middleware;

use App\Models\Group;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

class ResolveGroupContext
{
    /**
     * Handle an incoming request.
     *
     * Permite alternar entre contexto de grupo ou tenant individual.
     * Header: X-Group-Context: {group_id} para visão de grupo
     * Header: X-Tenant-Context: {tenant_id} para visão de loja específica
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return $next($request);
        }

        // Verifica se há contexto de grupo
        $groupId = $request->header('X-Group-Context');
        if ($groupId) {
            $group = Group::find($groupId);

            if ($group && $group->hasUser($user)) {
                App::instance('group_context', $group);
                App::instance('tenant_ids_context', $group->getTenantIds());
            }
        }

        // Verifica se há contexto de tenant específico (dentro do grupo)
        $tenantId = $request->header('X-Tenant-Context');
        if ($tenantId && $user->hasAccessToTenant($tenantId)) {
            App::instance('tenant_context_override', $tenantId);
        }

        return $next($request);
    }
}

