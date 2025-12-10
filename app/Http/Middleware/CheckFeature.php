<?php

namespace App\Http\Middleware;

use App\Models\TenantFeature;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckFeature
{
    /**
     * Verifica se o tenant tem acesso à feature solicitada.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  $feature  A feature key a ser verificada
     */
    public function handle(Request $request, Closure $next, string $feature): Response
    {
        $user = $request->user();

        // Super admins têm acesso a tudo
        if ($user?->is_super_admin) {
            return $next($request);
        }

        $tenantId = $user?->tenant_id;

        if (!$tenantId) {
            return response()->json([
                'error' => 'Tenant não identificado',
                'message' => 'Você precisa estar vinculado a uma empresa para acessar este recurso.',
            ], 403);
        }

        // Verifica se a feature está habilitada para o tenant
        if (!TenantFeature::tenantHasFeature($tenantId, $feature)) {
            return response()->json([
                'error' => 'Recurso não disponível',
                'message' => "Sua empresa não tem acesso ao módulo '{$this->getFeatureName($feature)}'. Entre em contato com o suporte para ativar.",
                'feature' => $feature,
            ], 403);
        }

        return $next($request);
    }

    /**
     * Retorna o nome amigável da feature.
     */
    private function getFeatureName(string $feature): string
    {
        $features = TenantFeature::getAvailableFeatures();
        return $features[$feature]['name'] ?? $feature;
    }
}

