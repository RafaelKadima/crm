<?php

namespace App\Modules\Meta\Services;

use App\Enums\MetaIntegrationStatusEnum;
use App\Models\MetaIntegration;
use Carbon\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MetaTokenService
{
    protected string $apiVersion;

    public function __construct()
    {
        $this->apiVersion = config('services.meta.api_version', 'v19.0');
    }

    /**
     * Renova o token de uma integração específica usando as credenciais do
     * Meta App que emitiu o token (lookup via meta_app_id da row).
     */
    public function refreshToken(MetaIntegration $integration): bool
    {
        if (!$integration->access_token) {
            Log::warning('Meta token refresh: no token to refresh', [
                'integration_id' => $integration->id,
            ]);
            return false;
        }

        try {
            $creds = $integration->metaAppCredentials();
        } catch (\RuntimeException $e) {
            Log::error('Meta token refresh: credenciais do app indisponíveis', [
                'integration_id' => $integration->id,
                'error' => $e->getMessage(),
            ]);
            return false;
        }

        try {
            $response = Http::get("https://graph.facebook.com/{$this->apiVersion}/oauth/access_token", [
                'grant_type' => 'fb_exchange_token',
                'client_id' => $creds['app_id'],
                'client_secret' => $creds['app_secret'],
                'fb_exchange_token' => $integration->access_token,
            ]);

            if (!$response->successful()) {
                $error = $response->json()['error'] ?? [];
                $errorCode = $error['code'] ?? 'unknown';
                $errorMessage = $error['message'] ?? 'Unknown error';

                Log::error('Meta token refresh failed', [
                    'integration_id' => $integration->id,
                    'meta_app_id' => $creds['app_id'],
                    'error_code' => $errorCode,
                    'error_message' => $errorMessage,
                ]);

                if (in_array($errorCode, [190, 102, 463])) {
                    $integration->markAsReauthRequired("Token refresh failed: {$errorMessage}");
                }

                return false;
            }

            $data = $response->json();
            $newToken = $data['access_token'];
            $expiresIn = $data['expires_in'] ?? null;

            $expiresAt = $expiresIn
                ? Carbon::now()->addSeconds($expiresIn)
                : null;

            $integration->updateToken($newToken, $expiresAt);

            Log::info('Meta token refreshed successfully', [
                'integration_id' => $integration->id,
                'meta_app_id' => $creds['app_id'],
                'expires_at' => $expiresAt?->toIso8601String(),
            ]);

            return true;

        } catch (\Exception $e) {
            Log::error('Meta token refresh exception', [
                'integration_id' => $integration->id,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Renova todos os tokens que estão próximos de expirar.
     */
    public function refreshExpiringTokens(int $daysThreshold = 7): array
    {
        $stats = [
            'total' => 0,
            'success' => 0,
            'failed' => 0,
            'skipped' => 0,
        ];

        $integrations = MetaIntegration::withoutGlobalScopes()
            ->needsRefresh($daysThreshold)
            ->get();

        $stats['total'] = $integrations->count();

        foreach ($integrations as $integration) {
            if ($integration->status !== MetaIntegrationStatusEnum::ACTIVE) {
                $stats['skipped']++;
                continue;
            }

            $success = $this->refreshToken($integration);

            if ($success) {
                $stats['success']++;
            } else {
                $stats['failed']++;
            }

            usleep(100000);
        }

        Log::info('Meta tokens refresh batch completed', $stats);

        return $stats;
    }

    /**
     * Valida se um token está funcionando via /debug_token, usando o app
     * access token do app que emitiu o token (caso contrário a Meta retorna
     * "App_id in the input_token did not match the Viewing App").
     */
    public function validateToken(MetaIntegration $integration): bool
    {
        if (!$integration->access_token) {
            return false;
        }

        try {
            $appAccessToken = $integration->metaAppAccessToken();
        } catch (\RuntimeException $e) {
            Log::error('Meta token validate: credenciais do app indisponíveis', [
                'integration_id' => $integration->id,
                'error' => $e->getMessage(),
            ]);
            return false;
        }

        try {
            $response = Http::get("https://graph.facebook.com/{$this->apiVersion}/debug_token", [
                'input_token' => $integration->access_token,
                'access_token' => $appAccessToken,
            ]);

            if (!$response->successful()) {
                return false;
            }

            $data = $response->json()['data'] ?? [];

            if (!($data['is_valid'] ?? false)) {
                $integration->markAsReauthRequired('Token validation failed: token is invalid');
                return false;
            }

            if (isset($data['expires_at']) && $data['expires_at'] > 0) {
                $expiresAt = Carbon::createFromTimestamp($data['expires_at']);

                if ($expiresAt->isPast()) {
                    $integration->markAsExpired();
                    return false;
                }

                if (!$integration->expires_at || !$integration->expires_at->eq($expiresAt)) {
                    $integration->update(['expires_at' => $expiresAt]);
                }
            }

            return true;

        } catch (\Exception $e) {
            Log::error('Meta token validation exception', [
                'integration_id' => $integration->id,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Obtém informações detalhadas sobre o token via /debug_token.
     */
    public function getTokenInfo(MetaIntegration $integration): ?array
    {
        if (!$integration->access_token) {
            return null;
        }

        try {
            $appAccessToken = $integration->metaAppAccessToken();
        } catch (\RuntimeException $e) {
            Log::error('Meta token info: credenciais do app indisponíveis', [
                'integration_id' => $integration->id,
                'error' => $e->getMessage(),
            ]);
            return null;
        }

        try {
            $response = Http::get("https://graph.facebook.com/{$this->apiVersion}/debug_token", [
                'input_token' => $integration->access_token,
                'access_token' => $appAccessToken,
            ]);

            if (!$response->successful()) {
                return null;
            }

            $data = $response->json()['data'] ?? [];

            return [
                'is_valid' => $data['is_valid'] ?? false,
                'app_id' => $data['app_id'] ?? null,
                'user_id' => $data['user_id'] ?? null,
                'scopes' => $data['scopes'] ?? [],
                'expires_at' => isset($data['expires_at']) && $data['expires_at'] > 0
                    ? Carbon::createFromTimestamp($data['expires_at'])->toIso8601String()
                    : null,
                'data_access_expires_at' => isset($data['data_access_expires_at']) && $data['data_access_expires_at'] > 0
                    ? Carbon::createFromTimestamp($data['data_access_expires_at'])->toIso8601String()
                    : null,
            ];

        } catch (\Exception $e) {
            Log::error('Meta token info exception', [
                'integration_id' => $integration->id,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Verifica se há ao menos um Meta App configurado no registry.
     */
    public function isConfigured(): bool
    {
        return !empty(config('services.meta.apps', []));
    }
}
