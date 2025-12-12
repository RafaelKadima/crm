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
}

