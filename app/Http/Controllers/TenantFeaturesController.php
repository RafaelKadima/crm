<?php

namespace App\Http\Controllers;

use App\Models\TenantFeature;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TenantFeaturesController extends Controller
{
    /**
     * Retorna as features disponíveis para o tenant do usuário logado.
     * Inclui sub-funções habilitadas para cada módulo.
     */
    public function myFeatures(Request $request): JsonResponse
    {
        $user = $request->user();

        // Super admins têm acesso a tudo
        if ($user->is_super_admin) {
            $allFeatures = TenantFeature::getAvailableFeatures();
            $moduleFunctions = TenantFeature::getModuleFunctions();

            $result = [];
            foreach ($allFeatures as $key => $feature) {
                $result[$key] = array_merge($feature, [
                    'is_enabled' => true,
                    'all_functions' => true,
                    'enabled_functions' => array_keys($moduleFunctions[$key] ?? []),
                    'available_functions' => $moduleFunctions[$key] ?? [],
                ]);
            }

            return response()->json([
                'features' => $result,
                'is_super_admin' => true,
                'plan' => 'super_admin',
            ]);
        }

        $tenant = $user->tenant;

        if (!$tenant) {
            return response()->json([
                'error' => 'Tenant não encontrado',
            ], 404);
        }

        // Busca features ativas do tenant (já inclui sub-funções)
        $features = TenantFeature::getTenantFeatures($tenant->id);

        // Features básicas que todo mundo tem acesso (não precisam ser ativadas)
        $basicFeatures = ['leads', 'contacts', 'tickets', 'tasks', 'pipelines', 'users', 'channels'];

        return response()->json([
            'features' => $features,
            'basic_features' => $basicFeatures,
            'plan' => $tenant->plan->value,
            'plan_label' => $tenant->plan->label(),
            'ia_enabled' => $tenant->ia_enabled,
            'tenant_id' => $tenant->id,
            'tenant_name' => $tenant->name,
        ]);
    }

    /**
     * Verifica se o tenant tem acesso a uma feature específica.
     */
    public function checkFeature(Request $request, string $featureKey): JsonResponse
    {
        $user = $request->user();

        // Super admins têm acesso a tudo
        if ($user->is_super_admin) {
            return response()->json([
                'has_access' => true,
                'feature' => $featureKey,
            ]);
        }

        $hasAccess = TenantFeature::tenantHasFeature($user->tenant_id, $featureKey);

        return response()->json([
            'has_access' => $hasAccess,
            'feature' => $featureKey,
        ]);
    }

    /**
     * Verifica se o tenant tem acesso a uma sub-função específica de um módulo.
     */
    public function checkFunction(Request $request, string $featureKey, string $functionKey): JsonResponse
    {
        $user = $request->user();

        // Super admins têm acesso a tudo
        if ($user->is_super_admin) {
            return response()->json([
                'has_access' => true,
                'feature' => $featureKey,
                'function' => $functionKey,
            ]);
        }

        // Primeiro verifica se o módulo está habilitado
        if (!TenantFeature::tenantHasFeature($user->tenant_id, $featureKey)) {
            return response()->json([
                'has_access' => false,
                'feature' => $featureKey,
                'function' => $functionKey,
                'reason' => 'module_disabled',
            ]);
        }

        // Depois verifica a sub-função
        $hasAccess = TenantFeature::tenantHasFunction($user->tenant_id, $featureKey, $functionKey);

        return response()->json([
            'has_access' => $hasAccess,
            'feature' => $featureKey,
            'function' => $functionKey,
        ]);
    }
}

