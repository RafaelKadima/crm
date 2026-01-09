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
    protected string $appId;
    protected string $appSecret;

    public function __construct()
    {
        $this->apiVersion = config('services.meta.api_version', 'v19.0');
        $this->appId = config('services.meta.app_id');
        $this->appSecret = config('services.meta.app_secret');
    }

    /**
     * Renova o token de uma integração específica.
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
            // Tenta obter um novo long-lived token
            $response = Http::get("https://graph.facebook.com/{$this->apiVersion}/oauth/access_token", [
                'grant_type' => 'fb_exchange_token',
                'client_id' => $this->appId,
                'client_secret' => $this->appSecret,
                'fb_exchange_token' => $integration->access_token,
            ]);

            if (!$response->successful()) {
                $error = $response->json()['error'] ?? [];
                $errorCode = $error['code'] ?? 'unknown';
                $errorMessage = $error['message'] ?? 'Unknown error';

                Log::error('Meta token refresh failed', [
                    'integration_id' => $integration->id,
                    'error_code' => $errorCode,
                    'error_message' => $errorMessage,
                ]);

                // Se o token é inválido ou expirado, marca como reauth_required
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
            // Verifica se a integração ainda está ativa
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

            // Pequena pausa para não sobrecarregar a API
            usleep(100000); // 100ms
        }

        Log::info('Meta tokens refresh batch completed', $stats);

        return $stats;
    }

    /**
     * Valida se um token está funcionando.
     */
    public function validateToken(MetaIntegration $integration): bool
    {
        if (!$integration->access_token) {
            return false;
        }

        try {
            $response = Http::withToken($integration->access_token)
                ->get("https://graph.facebook.com/{$this->apiVersion}/debug_token", [
                    'input_token' => $integration->access_token,
                    'access_token' => "{$this->appId}|{$this->appSecret}",
                ]);

            if (!$response->successful()) {
                return false;
            }

            $data = $response->json()['data'] ?? [];

            // Verifica se o token é válido
            if (!($data['is_valid'] ?? false)) {
                $integration->markAsReauthRequired('Token validation failed: token is invalid');
                return false;
            }

            // Verifica se o token expirou
            if (isset($data['expires_at']) && $data['expires_at'] > 0) {
                $expiresAt = Carbon::createFromTimestamp($data['expires_at']);

                if ($expiresAt->isPast()) {
                    $integration->markAsExpired();
                    return false;
                }

                // Atualiza a data de expiração se diferente
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
     * Obtém informações detalhadas sobre o token.
     */
    public function getTokenInfo(MetaIntegration $integration): ?array
    {
        if (!$integration->access_token) {
            return null;
        }

        try {
            $response = Http::get("https://graph.facebook.com/{$this->apiVersion}/debug_token", [
                'input_token' => $integration->access_token,
                'access_token' => "{$this->appId}|{$this->appSecret}",
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
     * Verifica se as credenciais do app estão configuradas.
     */
    public function isConfigured(): bool
    {
        return !empty($this->appId) && !empty($this->appSecret);
    }
}
