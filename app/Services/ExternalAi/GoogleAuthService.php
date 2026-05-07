<?php

namespace App\Services\ExternalAi;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Helper pra obter access_tokens do Google APIs (Dialogflow CX) a
 * partir de um Service Account JSON. Resolve o problema do token
 * raw expirar em 1h sem refresh automático.
 *
 * Implementa OAuth 2.0 Service Account JWT flow:
 *   https://developers.google.com/identity/protocols/oauth2/service-account
 *
 * 1. Constrói JWT assinado com a private_key do service account
 * 2. Troca JWT por access_token via token_uri (POST oauth2 standard)
 * 3. Cacheia o access_token no Redis até 5min antes de expirar
 *
 * Não depende de google/auth library — usa openssl_sign nativo.
 *
 * Service Account JSON esperado:
 *   {
 *     "type": "service_account",
 *     "client_email": "...@project.iam.gserviceaccount.com",
 *     "private_key": "-----BEGIN PRIVATE KEY-----\n...",
 *     "token_uri": "https://oauth2.googleapis.com/token",
 *     ...
 *   }
 */
class GoogleAuthService
{
    private const DIALOGFLOW_SCOPE = 'https://www.googleapis.com/auth/dialogflow';
    private const TOKEN_LIFETIME_SECONDS = 3600;
    private const CACHE_TTL_BUFFER = 300; // 5min antes de expirar, refaz

    /**
     * Retorna access_token válido pra Dialogflow API.
     *
     * Aceita 2 formas no $config:
     *   - `service_account_json` (preferred) — JSON inteiro do service
     *     account → faz JWT exchange e cacheia
     *   - `service_account_token` (legacy) — token raw já trocado →
     *     usa direto (responsabilidade do caller manter atualizado)
     */
    public function getDialogflowAccessToken(array $config): ?string
    {
        // Legacy: token raw passado direto (sem refresh automático)
        if (!empty($config['service_account_token']) && empty($config['service_account_json'])) {
            return $config['service_account_token'];
        }

        $rawJson = $config['service_account_json'] ?? null;
        if (empty($rawJson)) {
            Log::warning('GoogleAuth: nem service_account_json nem service_account_token informados');
            return null;
        }

        $sa = is_array($rawJson) ? $rawJson : (json_decode($rawJson, true) ?? null);
        if (!$sa || empty($sa['client_email']) || empty($sa['private_key'])) {
            Log::error('GoogleAuth: service_account_json inválido (faltando client_email ou private_key)');
            return null;
        }

        $cacheKey = 'google_sa_token:' . hash('sha256', $sa['client_email'] . self::DIALOGFLOW_SCOPE);

        return Cache::remember(
            $cacheKey,
            self::TOKEN_LIFETIME_SECONDS - self::CACHE_TTL_BUFFER,
            fn () => $this->exchange($sa),
        );
    }

    /**
     * Constrói JWT assinado e troca por access_token.
     */
    protected function exchange(array $sa): ?string
    {
        try {
            $jwt = $this->buildJwt($sa);
        } catch (\Throwable $e) {
            Log::error('GoogleAuth: JWT build failed', ['error' => $e->getMessage()]);
            return null;
        }

        try {
            $tokenUri = $sa['token_uri'] ?? 'https://oauth2.googleapis.com/token';
            $response = Http::asForm()->timeout(15)->post($tokenUri, [
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion' => $jwt,
            ]);

            if (!$response->successful()) {
                Log::error('GoogleAuth: token exchange failed', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                return null;
            }

            $data = $response->json();
            $token = $data['access_token'] ?? null;
            if (!$token) {
                Log::error('GoogleAuth: response without access_token', ['data' => $data]);
            }
            return $token;
        } catch (\Throwable $e) {
            Log::error('GoogleAuth: exchange exception', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Constrói e assina o JWT com RS256.
     */
    protected function buildJwt(array $sa): string
    {
        $header = ['alg' => 'RS256', 'typ' => 'JWT'];
        $now = time();
        $claim = [
            'iss' => $sa['client_email'],
            'scope' => self::DIALOGFLOW_SCOPE,
            'aud' => $sa['token_uri'] ?? 'https://oauth2.googleapis.com/token',
            'exp' => $now + self::TOKEN_LIFETIME_SECONDS,
            'iat' => $now,
        ];

        $headerB64 = $this->base64UrlEncode(json_encode($header));
        $claimB64 = $this->base64UrlEncode(json_encode($claim));
        $message = "{$headerB64}.{$claimB64}";

        $privateKey = openssl_pkey_get_private($sa['private_key']);
        if (!$privateKey) {
            throw new \RuntimeException('Failed to parse private_key from service account JSON');
        }

        $signature = '';
        $ok = openssl_sign($message, $signature, $privateKey, OPENSSL_ALGO_SHA256);
        if (!$ok) {
            throw new \RuntimeException('Failed to sign JWT with RS256');
        }

        return "{$message}." . $this->base64UrlEncode($signature);
    }

    protected function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
}
