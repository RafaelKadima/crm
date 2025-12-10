<?php

namespace App\Http\Middleware;

use App\Enums\RoleEnum;
use App\Models\TenantFeature;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckPermission
{
    /**
     * Verifica se o usuário tem permissão para acessar a funcionalidade.
     * 
     * Uso nas rotas:
     *   ->middleware('permission:leads.view')
     *   ->middleware('permission:leads.edit,leads.view')  // Qualquer uma
     *   ->middleware('permission:leads.edit|leads.view')  // Qualquer uma
     *
     * A verificação considera:
     * 1. Se usuário é Admin → acesso total
     * 2. Se a feature está habilitada para o tenant
     * 3. Se o usuário tem a permissão específica
     */
    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Não autenticado.'], 401);
        }

        // Admin tem acesso total
        if ($user->role === RoleEnum::ADMIN || $user->isSuperAdmin()) {
            return $next($request);
        }

        // Se não passou nenhuma permissão, apenas verifica autenticação
        if (empty($permissions)) {
            return $next($request);
        }

        // Normaliza permissões (suporta vírgula e pipe)
        $permissionList = [];
        foreach ($permissions as $perm) {
            $permissionList = array_merge(
                $permissionList, 
                preg_split('/[,|]/', $perm)
            );
        }
        $permissionList = array_map('trim', $permissionList);
        $permissionList = array_filter($permissionList);

        // Verifica se o usuário tem QUALQUER uma das permissões
        foreach ($permissionList as $permission) {
            // Extrai o módulo da permissão (ex: "leads.view" -> "leads")
            $module = explode('.', $permission)[0];
            
            // Mapeia módulos para features (se aplicável)
            $featureMap = [
                'sdr' => 'sdr_ia',
                'landing_pages' => 'landing_pages',
                'appointments' => 'appointments',
                'products' => 'products',
                'reports_advanced' => 'reports_advanced',
                'automation' => 'automation',
                'api' => 'api_access',
                'groups' => 'groups',
            ];

            // Se o módulo requer uma feature específica
            if (isset($featureMap[$module])) {
                $featureKey = $featureMap[$module];
                
                // Verifica se o tenant tem a feature habilitada
                if (!TenantFeature::tenantHasFeature($user->tenant_id, $featureKey)) {
                    continue; // Tenta próxima permissão
                }
            }

            // Verifica se o usuário tem a permissão
            if ($user->hasPermission($permission)) {
        return $next($request);
            }
        }

        return response()->json([
            'message' => 'Você não tem permissão para acessar esta funcionalidade.',
            'required_permissions' => $permissionList,
        ], 403);
    }
}
