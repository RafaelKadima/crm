<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class LinxSmartApiService
{
    private const TOKEN_ENDPOINT = 'https://auto-gwsmartapi.linx.com.br/api-seguranca/token';
    private const REFRESH_ENDPOINT = 'https://auto-gwsmartapi.linx.com.br/api-seguranca/RefreshToken';

    // Token expira em 900s (15 min), renovamos com 60s de margem
    private const TOKEN_CACHE_TTL = 840; // 14 minutos

    /**
     * Gera um novo token na Linx Smart API
     */
    public function generateToken(array $config): array
    {
        $this->validateConfig($config);

        try {
            $response = Http::timeout(30)
                ->withHeaders([
                    'Cache-Control' => 'no-cache',
                    'Ocp-Apim-Subscription-Key' => $config['subscription_key'],
                    'AMBIENTE' => $config['ambiente'],
                ])
                ->asForm()
                ->post(self::TOKEN_ENDPOINT, [
                    'username' => $config['username'],
                    'password' => $config['password'],
                    'cnpjEmpresa' => $config['cnpj_empresa'] ?? '',
                ]);

            if ($response->successful()) {
                $data = $response->json();

                return [
                    'success' => true,
                    'access_token' => $data['access_token'],
                    'token_type' => $data['token_type'] ?? 'bearer',
                    'expires_in' => $data['expires_in'] ?? 900,
                ];
            }

            $error = $response->json() ?? $response->body();
            Log::error('Linx Smart API - Erro ao gerar token', [
                'status' => $response->status(),
                'error' => $error,
            ]);

            return [
                'success' => false,
                'error' => is_array($error) ? json_encode($error) : $error,
                'status' => $response->status(),
            ];

        } catch (Exception $e) {
            Log::error('Linx Smart API - Excecao ao gerar token', [
                'message' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Renova um token existente
     */
    public function refreshToken(string $currentToken, array $config): array
    {
        try {
            $response = Http::timeout(30)
                ->withHeaders([
                    'Cache-Control' => 'no-cache',
                    'Ocp-Apim-Subscription-Key' => $config['subscription_key'],
                    'AMBIENTE' => $config['ambiente'],
                ])
                ->post(self::REFRESH_ENDPOINT, [], ['token' => $currentToken]);

            if ($response->successful()) {
                $data = $response->json();

                return [
                    'success' => true,
                    'access_token' => $data['access_token'],
                    'token_type' => $data['token_type'] ?? 'bearer',
                    'expires_in' => $data['expires_in'] ?? 900,
                ];
            }

            // Se falhar o refresh, gera um novo token
            return $this->generateToken($config);

        } catch (Exception $e) {
            Log::warning('Linx Smart API - Falha no refresh, gerando novo token', [
                'message' => $e->getMessage(),
            ]);

            return $this->generateToken($config);
        }
    }

    /**
     * Obtem um token valido (do cache ou gera novo)
     */
    public function getValidToken(string $integrationId, array $config): ?string
    {
        $cacheKey = $this->getCacheKey($integrationId);

        // Verifica se tem token no cache
        $cachedToken = Cache::get($cacheKey);

        if ($cachedToken) {
            return $cachedToken;
        }

        // Gera novo token
        $result = $this->generateToken($config);

        if ($result['success']) {
            // Armazena no cache
            Cache::put($cacheKey, $result['access_token'], self::TOKEN_CACHE_TTL);

            return $result['access_token'];
        }

        Log::error('Linx Smart API - Nao foi possivel obter token valido', [
            'integration_id' => $integrationId,
            'error' => $result['error'] ?? 'Unknown error',
        ]);

        return null;
    }

    /**
     * Invalida o token no cache (forcar nova geracao)
     */
    public function invalidateToken(string $integrationId): void
    {
        Cache::forget($this->getCacheKey($integrationId));
    }

    /**
     * Testa a conexao com a Linx Smart API
     */
    public function testConnection(array $config): array
    {
        $result = $this->generateToken($config);

        if ($result['success']) {
            return [
                'success' => true,
                'message' => 'Conexao com Linx Smart API estabelecida com sucesso!',
                'token_expires_in' => $result['expires_in'],
            ];
        }

        return [
            'success' => false,
            'message' => 'Falha ao conectar: ' . ($result['error'] ?? 'Erro desconhecido'),
        ];
    }

    /**
     * Retorna os headers necessarios para chamadas de API
     */
    public function getApiHeaders(string $token, array $config): array
    {
        return [
            'Cache-Control' => 'no-cache',
            'Content-Type' => 'application/json',
            'Ocp-Apim-Subscription-Key' => $config['subscription_key'],
            'AMBIENTE' => $config['ambiente'],
            'Authorization' => 'Bearer ' . $token,
        ];
    }

    /**
     * Faz uma requisicao autenticada para a Linx Smart API
     */
    public function makeAuthenticatedRequest(
        string $method,
        string $url,
        string $integrationId,
        array $config,
        array $data = []
    ): array {
        $token = $this->getValidToken($integrationId, $config);

        if (!$token) {
            return [
                'success' => false,
                'error' => 'Nao foi possivel obter token de autenticacao',
            ];
        }

        try {
            $headers = $this->getApiHeaders($token, $config);

            $response = Http::timeout(30)
                ->withHeaders($headers)
                ->send($method, $url, ['json' => $data]);

            // Se receber 401, invalida token e tenta novamente
            if ($response->status() === 401) {
                $this->invalidateToken($integrationId);
                $newToken = $this->getValidToken($integrationId, $config);

                if ($newToken) {
                    $headers['Authorization'] = 'Bearer ' . $newToken;
                    $response = Http::timeout(30)
                        ->withHeaders($headers)
                        ->send($method, $url, ['json' => $data]);
                }
            }

            return [
                'success' => $response->successful(),
                'status' => $response->status(),
                'data' => $response->json() ?? $response->body(),
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Valida a configuracao necessaria
     */
    private function validateConfig(array $config): void
    {
        $required = ['subscription_key', 'ambiente', 'username', 'password'];

        foreach ($required as $field) {
            if (empty($config[$field])) {
                throw new Exception("Campo obrigatorio ausente: {$field}");
            }
        }
    }

    /**
     * Gera a chave de cache para o token
     */
    private function getCacheKey(string $integrationId): string
    {
        return "linx_smart_token:{$integrationId}";
    }
}
