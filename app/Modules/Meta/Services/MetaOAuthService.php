<?php

namespace App\Modules\Meta\Services;

use App\Enums\MetaIntegrationStatusEnum;
use App\Models\MetaIntegration;
use App\Models\Tenant;
use Carbon\Carbon;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class MetaOAuthService
{
    protected string $apiVersion;
    protected string $appId;
    protected string $appSecret;
    protected string $redirectUri;
    protected array $scopes;

    public function __construct()
    {
        $this->apiVersion = config('services.meta.api_version', 'v19.0');
        $this->appId = config('services.meta.app_id');
        $this->appSecret = config('services.meta.app_secret');
        $this->redirectUri = config('services.meta.redirect_uri');
        $this->scopes = config('services.meta.scopes', [
            'whatsapp_business_management',
            'whatsapp_business_messaging',
        ]);
    }

    /**
     * Gera a URL de autorização OAuth da Meta.
     */
    public function getAuthorizationUrl(string $tenantId): string
    {
        $state = $this->generateState($tenantId);

        $params = [
            'client_id' => $this->appId,
            'redirect_uri' => $this->redirectUri,
            'scope' => implode(',', $this->scopes),
            'response_type' => 'code',
            'state' => $state,
        ];

        return "https://www.facebook.com/{$this->apiVersion}/dialog/oauth?" . http_build_query($params);
    }

    /**
     * Gera um state seguro contendo o tenant_id.
     */
    protected function generateState(string $tenantId): string
    {
        $payload = [
            'tenant_id' => $tenantId,
            'nonce' => Str::random(32),
            'timestamp' => time(),
        ];

        return Crypt::encryptString(json_encode($payload));
    }

    /**
     * Valida e extrai dados do state.
     */
    public function validateState(string $state): ?array
    {
        try {
            $payload = json_decode(Crypt::decryptString($state), true);

            // Verifica se o state não expirou (30 minutos)
            if (time() - ($payload['timestamp'] ?? 0) > 1800) {
                Log::warning('Meta OAuth state expired');
                return null;
            }

            return $payload;
        } catch (\Exception $e) {
            Log::error('Meta OAuth state validation failed', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Processa o callback do OAuth e cria a integração.
     */
    public function handleCallback(string $code, string $state): MetaIntegration
    {
        $stateData = $this->validateState($state);

        if (!$stateData) {
            throw new \Exception('Invalid or expired OAuth state');
        }

        $tenantId = $stateData['tenant_id'];

        // 1. Troca o code por access_token
        $tokenData = $this->exchangeCodeForToken($code);

        // 2. Obtém long-lived token se for short-lived
        if (!isset($tokenData['expires_in']) || $tokenData['expires_in'] < 5184000) {
            $tokenData = $this->exchangeForLongLivedToken($tokenData['access_token']);
        }

        $accessToken = $tokenData['access_token'];
        $expiresAt = isset($tokenData['expires_in'])
            ? Carbon::now()->addSeconds($tokenData['expires_in'])
            : null;

        // 3. Descobre os dados do WhatsApp Business
        $businessData = $this->discoverWhatsAppBusiness($accessToken);

        // 4. Cria ou atualiza a integração
        $integration = MetaIntegration::withoutGlobalScopes()->updateOrCreate(
            [
                'tenant_id' => $tenantId,
                'phone_number_id' => $businessData['phone_number_id'],
            ],
            [
                'business_id' => $businessData['business_id'],
                'waba_id' => $businessData['waba_id'],
                'display_phone_number' => $businessData['display_phone_number'],
                'verified_name' => $businessData['verified_name'],
                'access_token' => $accessToken,
                'expires_at' => $expiresAt,
                'status' => MetaIntegrationStatusEnum::ACTIVE,
                'scopes' => $this->scopes,
                'metadata' => [
                    'connected_at' => now()->toIso8601String(),
                    'app_id' => $this->appId,
                ],
            ]
        );

        Log::info('Meta integration created/updated', [
            'tenant_id' => $tenantId,
            'integration_id' => $integration->id,
            'phone_number_id' => $businessData['phone_number_id'],
        ]);

        return $integration;
    }

    /**
     * Troca o authorization code por access_token.
     */
    protected function exchangeCodeForToken(string $code): array
    {
        $response = Http::get("https://graph.facebook.com/{$this->apiVersion}/oauth/access_token", [
            'client_id' => $this->appId,
            'client_secret' => $this->appSecret,
            'redirect_uri' => $this->redirectUri,
            'code' => $code,
        ]);

        if (!$response->successful()) {
            Log::error('Meta OAuth token exchange failed', [
                'status' => $response->status(),
                'body' => $response->json(),
            ]);
            throw new \Exception('Failed to exchange code for token: ' . ($response->json()['error']['message'] ?? 'Unknown error'));
        }

        return $response->json();
    }

    /**
     * Troca um short-lived token por um long-lived token.
     */
    protected function exchangeForLongLivedToken(string $shortLivedToken): array
    {
        $response = Http::get("https://graph.facebook.com/{$this->apiVersion}/oauth/access_token", [
            'grant_type' => 'fb_exchange_token',
            'client_id' => $this->appId,
            'client_secret' => $this->appSecret,
            'fb_exchange_token' => $shortLivedToken,
        ]);

        if (!$response->successful()) {
            Log::warning('Meta long-lived token exchange failed, using short-lived', [
                'error' => $response->json(),
            ]);
            return ['access_token' => $shortLivedToken];
        }

        return $response->json();
    }

    /**
     * Descobre os dados do WhatsApp Business associado ao token.
     */
    protected function discoverWhatsAppBusiness(string $accessToken): array
    {
        // 1. Busca os businesses associados
        $businessesResponse = Http::withToken($accessToken)
            ->get("https://graph.facebook.com/{$this->apiVersion}/me/businesses");

        if (!$businessesResponse->successful()) {
            throw new \Exception('Failed to fetch businesses: ' . ($businessesResponse->json()['error']['message'] ?? 'Unknown error'));
        }

        $businesses = $businessesResponse->json()['data'] ?? [];

        if (empty($businesses)) {
            throw new \Exception('No businesses found for this account');
        }

        // Usa o primeiro business (ou pode implementar seleção)
        $businessId = $businesses[0]['id'];

        // 2. Busca as WABAs do business
        $wabasResponse = Http::withToken($accessToken)
            ->get("https://graph.facebook.com/{$this->apiVersion}/{$businessId}/owned_whatsapp_business_accounts");

        if (!$wabasResponse->successful()) {
            throw new \Exception('Failed to fetch WABAs: ' . ($wabasResponse->json()['error']['message'] ?? 'Unknown error'));
        }

        $wabas = $wabasResponse->json()['data'] ?? [];

        if (empty($wabas)) {
            throw new \Exception('No WhatsApp Business Accounts found');
        }

        // Usa a primeira WABA
        $wabaId = $wabas[0]['id'];

        // 3. Busca os phone numbers da WABA
        $phonesResponse = Http::withToken($accessToken)
            ->get("https://graph.facebook.com/{$this->apiVersion}/{$wabaId}/phone_numbers");

        if (!$phonesResponse->successful()) {
            throw new \Exception('Failed to fetch phone numbers: ' . ($phonesResponse->json()['error']['message'] ?? 'Unknown error'));
        }

        $phones = $phonesResponse->json()['data'] ?? [];

        if (empty($phones)) {
            throw new \Exception('No phone numbers found in WABA');
        }

        // Usa o primeiro phone number
        $phone = $phones[0];

        return [
            'business_id' => $businessId,
            'waba_id' => $wabaId,
            'phone_number_id' => $phone['id'],
            'display_phone_number' => $phone['display_phone_number'] ?? null,
            'verified_name' => $phone['verified_name'] ?? null,
        ];
    }

    /**
     * Busca todos os WABAs e phone numbers disponíveis.
     * Útil para permitir que o usuário escolha qual conectar.
     */
    public function discoverAllPhoneNumbers(string $accessToken): array
    {
        $result = [];

        // 1. Busca os businesses
        $businessesResponse = Http::withToken($accessToken)
            ->get("https://graph.facebook.com/{$this->apiVersion}/me/businesses");

        if (!$businessesResponse->successful()) {
            return $result;
        }

        $businesses = $businessesResponse->json()['data'] ?? [];

        foreach ($businesses as $business) {
            // 2. Busca WABAs do business
            $wabasResponse = Http::withToken($accessToken)
                ->get("https://graph.facebook.com/{$this->apiVersion}/{$business['id']}/owned_whatsapp_business_accounts");

            if (!$wabasResponse->successful()) {
                continue;
            }

            $wabas = $wabasResponse->json()['data'] ?? [];

            foreach ($wabas as $waba) {
                // 3. Busca phone numbers da WABA
                $phonesResponse = Http::withToken($accessToken)
                    ->get("https://graph.facebook.com/{$this->apiVersion}/{$waba['id']}/phone_numbers");

                if (!$phonesResponse->successful()) {
                    continue;
                }

                $phones = $phonesResponse->json()['data'] ?? [];

                foreach ($phones as $phone) {
                    $result[] = [
                        'business_id' => $business['id'],
                        'business_name' => $business['name'] ?? null,
                        'waba_id' => $waba['id'],
                        'waba_name' => $waba['name'] ?? null,
                        'phone_number_id' => $phone['id'],
                        'display_phone_number' => $phone['display_phone_number'] ?? null,
                        'verified_name' => $phone['verified_name'] ?? null,
                        'quality_rating' => $phone['quality_rating'] ?? null,
                    ];
                }
            }
        }

        return $result;
    }

    /**
     * Verifica se as credenciais estão configuradas.
     */
    public function isConfigured(): bool
    {
        return !empty($this->appId) && !empty($this->appSecret) && !empty($this->redirectUri);
    }

    /**
     * Verifica se o Embedded Signup está configurado.
     */
    public function isEmbeddedSignupConfigured(): bool
    {
        return $this->isConfigured() && !empty(config('services.meta.config_id'));
    }

    /**
     * Retorna o Configuration ID para Embedded Signup.
     */
    public function getConfigId(): ?string
    {
        return config('services.meta.config_id');
    }

    /**
     * Processa o callback do Embedded Signup.
     * Recebe os dados do frontend após o usuário completar o fluxo no popup.
     */
    public function processEmbeddedSignup(
        string $tenantId,
        string $code,
        ?string $wabaId = null,
        ?string $phoneNumberId = null
    ): MetaIntegration {
        Log::info('Processing Embedded Signup', [
            'tenant_id' => $tenantId,
            'waba_id' => $wabaId,
            'phone_number_id' => $phoneNumberId,
        ]);

        // 1. Troca o code por access_token (sem redirect_uri para Embedded Signup)
        $tokenData = $this->exchangeCodeForTokenEmbedded($code);

        // 2. Obtém long-lived token
        if (!isset($tokenData['expires_in']) || $tokenData['expires_in'] < 5184000) {
            $tokenData = $this->exchangeForLongLivedToken($tokenData['access_token']);
        }

        $accessToken = $tokenData['access_token'];
        $expiresAt = isset($tokenData['expires_in'])
            ? Carbon::now()->addSeconds($tokenData['expires_in'])
            : null;

        // 3. Se não recebemos waba_id ou phone_number_id, descobrimos automaticamente
        if (empty($wabaId) || empty($phoneNumberId)) {
            $businessData = $this->discoverWhatsAppBusiness($accessToken);
            $wabaId = $businessData['waba_id'];
            $phoneNumberId = $businessData['phone_number_id'];
            $displayPhoneNumber = $businessData['display_phone_number'];
            $verifiedName = $businessData['verified_name'];
            $businessId = $businessData['business_id'];
        } else {
            // 4. Busca detalhes do phone number específico
            $phoneDetails = $this->getPhoneNumberDetails($accessToken, $phoneNumberId);
            $displayPhoneNumber = $phoneDetails['display_phone_number'] ?? null;
            $verifiedName = $phoneDetails['verified_name'] ?? null;

            // Busca o business_id do WABA
            $wabaDetails = $this->getWabaDetails($accessToken, $wabaId);
            $businessId = $wabaDetails['owner_business_info']['id'] ?? null;
        }

        // 5. Cria ou atualiza a integração
        $integration = MetaIntegration::withoutGlobalScopes()->updateOrCreate(
            [
                'tenant_id' => $tenantId,
                'phone_number_id' => $phoneNumberId,
            ],
            [
                'business_id' => $businessId,
                'waba_id' => $wabaId,
                'display_phone_number' => $displayPhoneNumber,
                'verified_name' => $verifiedName,
                'access_token' => $accessToken,
                'expires_at' => $expiresAt,
                'status' => MetaIntegrationStatusEnum::ACTIVE,
                'scopes' => $this->scopes,
                'metadata' => [
                    'connected_at' => now()->toIso8601String(),
                    'app_id' => $this->appId,
                    'signup_method' => 'embedded',
                ],
            ]
        );

        Log::info('Meta Embedded Signup integration created/updated', [
            'tenant_id' => $tenantId,
            'integration_id' => $integration->id,
            'phone_number_id' => $phoneNumberId,
            'display_phone_number' => $displayPhoneNumber,
        ]);

        return $integration;
    }

    /**
     * Troca o code por token para Embedded Signup.
     * A Meta pode exigir redirect_uri em algumas configuracoes.
     */
    protected function exchangeCodeForTokenEmbedded(string $code): array
    {
        // Lista de redirect_uris para tentar (do mais provavel para menos)
        $redirectUris = [
            null, // Sem redirect_uri (padrao para Embedded Signup)
            $this->redirectUri, // redirect_uri configurado
            config('app.url'), // URL base do app
            config('app.url') . '/', // URL base com barra
        ];

        $lastError = null;

        foreach ($redirectUris as $index => $redirectUri) {
            $params = [
                'client_id' => $this->appId,
                'client_secret' => $this->appSecret,
                'code' => $code,
            ];

            if ($redirectUri !== null) {
                $params['redirect_uri'] = $redirectUri;
            }

            Log::info('Embedded Signup: Attempting token exchange', [
                'attempt' => $index + 1,
                'redirect_uri' => $redirectUri ?? '(none)',
            ]);

            $response = Http::get("https://graph.facebook.com/{$this->apiVersion}/oauth/access_token", $params);

            if ($response->successful()) {
                Log::info('Embedded Signup: Token exchange successful', [
                    'redirect_uri_used' => $redirectUri ?? '(none)',
                ]);
                return $response->json();
            }

            $lastError = $response->json()['error'] ?? [];

            // Se nao for erro de redirect_uri, para de tentar
            if (!str_contains($lastError['message'] ?? '', 'redirect_uri') &&
                !str_contains($lastError['message'] ?? '', 'verification code')) {
                break;
            }
        }

        Log::error('Meta Embedded Signup token exchange failed after all attempts', [
            'status' => $response->status() ?? 400,
            'body' => $lastError,
        ]);

        throw new \Exception('Failed to exchange code for token: ' . ($lastError['message'] ?? 'Unknown error'));
    }

    /**
     * Busca detalhes de um phone number específico.
     */
    protected function getPhoneNumberDetails(string $accessToken, string $phoneNumberId): array
    {
        $response = Http::withToken($accessToken)
            ->get("https://graph.facebook.com/{$this->apiVersion}/{$phoneNumberId}", [
                'fields' => 'id,display_phone_number,verified_name,quality_rating,status',
            ]);

        if (!$response->successful()) {
            Log::warning('Failed to fetch phone number details', [
                'phone_number_id' => $phoneNumberId,
                'error' => $response->json(),
            ]);
            return [];
        }

        return $response->json();
    }

    /**
     * Busca detalhes de uma WABA.
     */
    protected function getWabaDetails(string $accessToken, string $wabaId): array
    {
        $response = Http::withToken($accessToken)
            ->get("https://graph.facebook.com/{$this->apiVersion}/{$wabaId}", [
                'fields' => 'id,name,owner_business_info,account_review_status',
            ]);

        if (!$response->successful()) {
            Log::warning('Failed to fetch WABA details', [
                'waba_id' => $wabaId,
                'error' => $response->json(),
            ]);
            return [];
        }

        return $response->json();
    }
}
