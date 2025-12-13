<?php

namespace App\Http\Controllers;

use App\Jobs\Ads\SyncAdMetricsJob;
use App\Models\AdAccount;
use App\Services\Ads\MetaAdsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AdAccountController extends Controller
{
    protected MetaAdsService $metaAdsService;

    public function __construct(MetaAdsService $metaAdsService)
    {
        $this->metaAdsService = $metaAdsService;
    }

    /**
     * Lista todas as contas de anúncio do tenant.
     */
    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $accounts = AdAccount::where('tenant_id', $tenantId)
            ->withCount('campaigns')
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => $accounts,
        ]);
    }

    /**
     * Exibe uma conta específica.
     */
    public function show(Request $request, AdAccount $account): JsonResponse
    {
        $this->authorize('view', $account);

        $account->load(['campaigns' => function ($query) {
            $query->orderBy('name');
        }]);

        return response()->json([
            'data' => $account,
        ]);
    }

    /**
     * Conecta uma nova conta de anúncios.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'platform' => 'required|in:meta,google',
            'access_token' => 'required|string',
        ]);

        $tenantId = $request->user()->tenant_id;
        $platform = $request->input('platform');
        $accessToken = $request->input('access_token');

        if ($platform === 'meta') {
            $result = $this->metaAdsService->connectAccount($tenantId, $accessToken);
        } else {
            return response()->json([
                'error' => 'Google Ads não implementado ainda',
            ], 400);
        }

        if (!$result['success']) {
            return response()->json([
                'error' => $result['error'],
            ], 400);
        }

        return response()->json([
            'message' => 'Conta(s) conectada(s) com sucesso',
            'accounts' => $result['accounts'],
            'count' => $result['count'],
        ], 201);
    }

    /**
     * Atualiza uma conta.
     */
    public function update(Request $request, AdAccount $account): JsonResponse
    {
        $this->authorize('update', $account);

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'status' => 'sometimes|in:active,paused,disconnected',
        ]);

        $account->update($request->only(['name', 'status']));

        return response()->json([
            'message' => 'Conta atualizada com sucesso',
            'data' => $account,
        ]);
    }

    /**
     * Remove/desconecta uma conta.
     */
    public function destroy(Request $request, AdAccount $account): JsonResponse
    {
        $this->authorize('delete', $account);

        $account->update([
            'status' => AdAccount::STATUS_DISCONNECTED,
            'access_token' => null,
            'refresh_token' => null,
        ]);

        return response()->json([
            'message' => 'Conta desconectada com sucesso',
        ]);
    }

    /**
     * Sincroniza dados de uma conta.
     */
    public function sync(Request $request, AdAccount $account): JsonResponse
    {
        $this->authorize('update', $account);

        if (!$account->hasValidToken()) {
            return response()->json([
                'error' => 'Token de acesso inválido ou expirado',
            ], 400);
        }

        // Dispatch job para sincronizar em background
        SyncAdMetricsJob::dispatch($account->id);

        return response()->json([
            'message' => 'Sincronização iniciada em segundo plano',
        ]);
    }

    /**
     * Testa conexão com uma conta.
     */
    public function test(Request $request, AdAccount $account): JsonResponse
    {
        $this->authorize('view', $account);

        $isValid = $this->metaAdsService->testConnection($account);

        if ($isValid) {
            $account->markAsSynced();
        } else {
            $account->markAsError('Falha no teste de conexão');
        }

        return response()->json([
            'success' => $isValid,
            'message' => $isValid 
                ? 'Conexão válida' 
                : 'Falha na conexão. Verifique o token de acesso.',
        ]);
    }

    /**
     * Lista plataformas disponíveis.
     */
    public function platforms(): JsonResponse
    {
        return response()->json([
            'data' => [
                [
                    'id' => 'meta',
                    'name' => 'Meta Ads',
                    'description' => 'Facebook e Instagram Ads',
                    'icon' => 'facebook',
                    'available' => true,
                ],
                [
                    'id' => 'google',
                    'name' => 'Google Ads',
                    'description' => 'Google Search, Display e YouTube',
                    'icon' => 'google',
                    'available' => false, // Ainda não implementado
                ],
            ],
        ]);
    }

    /**
     * Lista contas de anúncio para AI Service (rota interna).
     */
    public function internalIndex(Request $request): JsonResponse
    {
        $tenantId = $request->header('X-Tenant-ID');
        
        if (!$tenantId) {
            return response()->json(['error' => 'Tenant ID required'], 400);
        }

        $accounts = \App\Models\AdAccount::where('tenant_id', $tenantId)
            ->active()
            ->get();

        return response()->json(['data' => $accounts]);
    }

    /**
     * Busca insights/métricas de uma conta diretamente da API do Meta.
     */
    public function getInsights(Request $request, AdAccount $account): JsonResponse
    {
        $this->authorize('view', $account);

        if (!$account->hasValidToken()) {
            return response()->json([
                'error' => 'Token de acesso inválido ou expirado. Por favor, reconecte a conta.',
                'needs_reconnect' => true,
            ], 401);
        }

        $datePreset = $request->input('date_preset', 'last_7d');

        try {
            $insights = $this->metaAdsService->fetchAccountInsights($account, $datePreset);
            
            return response()->json([
                'data' => $insights,
                'account_name' => $account->name,
                'period' => $datePreset,
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching account insights', [
                'account_id' => $account->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Busca insights de todas as campanhas de uma conta.
     */
    public function getCampaignsInsights(Request $request, AdAccount $account): JsonResponse
    {
        $this->authorize('view', $account);

        if (!$account->hasValidToken()) {
            return response()->json([
                'error' => 'Token de acesso inválido ou expirado. Por favor, reconecte a conta.',
                'needs_reconnect' => true,
            ], 401);
        }

        $datePreset = $request->input('date_preset', 'last_7d');

        try {
            $campaigns = $this->metaAdsService->fetchCampaignsWithInsights($account, $datePreset);
            
            return response()->json([
                'data' => $campaigns,
                'account_name' => $account->name,
                'period' => $datePreset,
                'total' => count($campaigns),
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching campaigns insights', [
                'account_id' => $account->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => $e->getMessage(),
            ], 400);
        }
    }

    // =========================================================================
    // MÉTODOS INTERNOS (para AI Service)
    // =========================================================================

    /**
     * Busca insights de uma conta - Rota interna para AI Service.
     * Autenticação via X-Internal-Key header.
     */
    public function internalGetInsights(Request $request, string $accountId): JsonResponse
    {
        $tenantId = $request->header('X-Tenant-ID');
        
        if (!$tenantId) {
            return response()->json(['error' => 'X-Tenant-ID header required'], 400);
        }

        $account = AdAccount::where('tenant_id', $tenantId)
            ->where('id', $accountId)
            ->first();

        if (!$account) {
            return response()->json([
                'error' => 'Conta de anúncios não encontrada',
                'account_id' => $accountId,
                'tenant_id' => $tenantId,
            ], 404);
        }

        if (!$account->hasValidToken()) {
            return response()->json([
                'error' => 'Token de acesso inválido ou expirado. A conta precisa ser reconectada.',
                'needs_reconnect' => true,
                'account_id' => $accountId,
                'account_name' => $account->name,
            ], 401);
        }

        $datePreset = $request->input('date_preset', 'last_7d');

        try {
            $insights = $this->metaAdsService->fetchAccountInsights($account, $datePreset);
            
            return response()->json([
                'success' => true,
                'data' => $insights,
                'account_id' => $accountId,
                'account_name' => $account->name,
                'platform' => $account->platform,
                'period' => $datePreset,
            ]);
        } catch (\Exception $e) {
            Log::error('Internal API: Error fetching account insights', [
                'account_id' => $accountId,
                'tenant_id' => $tenantId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
                'account_id' => $accountId,
            ], 400);
        }
    }

    /**
     * Busca insights de campanhas - Rota interna para AI Service.
     * Autenticação via X-Internal-Key header.
     */
    public function internalGetCampaignsInsights(Request $request, string $accountId): JsonResponse
    {
        $tenantId = $request->header('X-Tenant-ID');
        
        if (!$tenantId) {
            return response()->json(['error' => 'X-Tenant-ID header required'], 400);
        }

        $account = AdAccount::where('tenant_id', $tenantId)
            ->where('id', $accountId)
            ->first();

        if (!$account) {
            return response()->json([
                'error' => 'Conta de anúncios não encontrada',
                'account_id' => $accountId,
                'tenant_id' => $tenantId,
            ], 404);
        }

        if (!$account->hasValidToken()) {
            return response()->json([
                'error' => 'Token de acesso inválido ou expirado. A conta precisa ser reconectada.',
                'needs_reconnect' => true,
                'account_id' => $accountId,
                'account_name' => $account->name,
            ], 401);
        }

        $datePreset = $request->input('date_preset', 'last_7d');

        try {
            $campaigns = $this->metaAdsService->fetchCampaignsWithInsights($account, $datePreset);
            
            return response()->json([
                'success' => true,
                'data' => $campaigns,
                'account_id' => $accountId,
                'account_name' => $account->name,
                'platform' => $account->platform,
                'period' => $datePreset,
                'total' => count($campaigns),
            ]);
        } catch (\Exception $e) {
            Log::error('Internal API: Error fetching campaigns insights', [
                'account_id' => $accountId,
                'tenant_id' => $tenantId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
                'account_id' => $accountId,
            ], 400);
        }
    }

    /**
     * Busca conta por platform_account_id - Rota interna para AI Service.
     * Útil quando o agente sabe o ID da conta no Meta (ex: 1325063905938909)
     * mas não sabe o ID interno do CRM.
     */
    public function internalFindByPlatformId(Request $request): JsonResponse
    {
        $tenantId = $request->header('X-Tenant-ID');
        $platformAccountId = $request->input('platform_account_id');
        
        if (!$tenantId) {
            return response()->json(['error' => 'X-Tenant-ID header required'], 400);
        }

        if (!$platformAccountId) {
            return response()->json(['error' => 'platform_account_id parameter required'], 400);
        }

        $account = AdAccount::where('tenant_id', $tenantId)
            ->where('platform_account_id', $platformAccountId)
            ->first();

        if (!$account) {
            // Tenta buscar sem o prefixo "act_" caso tenha sido passado
            $cleanId = str_replace('act_', '', $platformAccountId);
            $account = AdAccount::where('tenant_id', $tenantId)
                ->where('platform_account_id', $cleanId)
                ->first();
        }

        if (!$account) {
            return response()->json([
                'success' => false,
                'error' => 'Conta de anúncios não encontrada com este ID da plataforma',
                'platform_account_id' => $platformAccountId,
                'tenant_id' => $tenantId,
                'hint' => 'Verifique se a conta está conectada ao CRM e se o tenant_id está correto',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $account->id,
                'name' => $account->name,
                'platform' => $account->platform,
                'platform_account_id' => $account->platform_account_id,
                'status' => $account->status,
                'has_valid_token' => $account->hasValidToken(),
                'last_sync_at' => $account->last_sync_at,
                'currency' => $account->currency,
                'timezone' => $account->timezone,
            ],
        ]);
    }
}

