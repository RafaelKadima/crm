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
    protected string $embeddedAppId;
    protected string $embeddedAppSecret;
    protected ?string $coexistenceAppId;
    protected ?string $coexistenceAppSecret;
    protected string $redirectUri;
    protected array $scopes;

    public function __construct()
    {
        $this->apiVersion = config('services.meta.api_version', 'v19.0');
        $this->appId = config('services.meta.app_id');
        $this->appSecret = config('services.meta.app_secret');
        $this->embeddedAppId = config('services.meta.embedded_app_id', $this->appId);
        $this->embeddedAppSecret = config('services.meta.embedded_app_secret', $this->appSecret);
        $this->coexistenceAppId = config('services.meta.coexistence_app_id');
        $this->coexistenceAppSecret = config('services.meta.coexistence_app_secret');
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
                'meta_app_id' => $this->appId,
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

        // Inscreve o app nos webhooks da WABA (obrigatório para receber mensagens)
        $this->subscribeAppToWaba($businessData['waba_id'], $accessToken);

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
     * Resolve as credenciais (app_id + app_secret) do app que deve operar pra
     * uma integração nova baseado no fluxo:
     *   - coexistence    → coexistence_app_id (obrigatório, sem fallback)
     *   - embedded       → embedded_app_id    (com fallback pro regular)
     *   - omnify_oauth   → embedded_app_id    (Sprint 5 — white-label;
     *                                          tenant não tem Meta App próprio,
     *                                          usa o app credenciado pelo Omnify.
     *                                          Por enquanto reusa `embedded` que
     *                                          já cumpre esse papel; pode virar
     *                                          env vars dedicadas no futuro)
     *   - regular        → app_id
     *
     * @param  'regular'|'embedded'|'coexistence'|'omnify_oauth'  $flow
     * @return array{app_id: string, app_secret: string}
     */
    protected function appCredentialsForFlow(string $flow): array
    {
        if ($flow === 'coexistence') {
            if (empty($this->coexistenceAppId) || empty($this->coexistenceAppSecret)) {
                throw new \RuntimeException(
                    'Fluxo coexistence solicitado mas META_COEXISTENCE_APP_ID / META_COEXISTENCE_APP_SECRET não estão configurados.'
                );
            }
            return ['app_id' => $this->coexistenceAppId, 'app_secret' => $this->coexistenceAppSecret];
        }

        if ($flow === 'embedded' || $flow === 'omnify_oauth') {
            return ['app_id' => $this->embeddedAppId, 'app_secret' => $this->embeddedAppSecret];
        }

        return ['app_id' => $this->appId, 'app_secret' => $this->appSecret];
    }

    /**
     * Resolve credenciais a partir de uma MetaIntegration existente,
     * respeitando o `webhook_origin` setado no schema (Sprint 5).
     *
     * Regra:
     *   - webhook_origin='omnify_oauth' → app credenciado do Omnify
     *     (white-label — tenant usa app único do produto, não Meta App próprio)
     *   - default ('own_app') → tenta resolver via metaAppCredentials() do
     *     model (que olha meta_app_id stored e mapeia pra config('services.meta.apps'))
     *
     * Use este método em vez de appCredentialsForFlow() pra operações
     * sobre integrações já existentes (refresh token, validar webhook, etc).
     *
     * @return array{app_id: string, app_secret: string}
     */
    public function appCredentialsForIntegration(MetaIntegration $integration): array
    {
        $origin = $integration->webhook_origin ?? MetaIntegration::ORIGIN_OWN_APP;

        if ($origin === MetaIntegration::ORIGIN_OMNIFY_OAUTH) {
            return $this->appCredentialsForFlow('omnify_oauth');
        }

        // own_app — usa credentials registradas no momento do OAuth
        // (meta_app_id no model resolve via metaAppCredentials helper)
        try {
            return $integration->metaAppCredentials();
        } catch (\Throwable $e) {
            Log::warning('Meta integration: falling back pra app_id default', [
                'integration_id' => $integration->id,
                'webhook_origin' => $origin,
                'error' => $e->getMessage(),
            ]);
            return ['app_id' => $this->appId, 'app_secret' => $this->appSecret];
        }
    }

    /**
     * Resolve o redirect_uri pra uma integração — respeita
     * `oauth_redirect_uri` custom quando setado em modo white-label,
     * cai no default do app caso contrário.
     */
    public function redirectUriForIntegration(MetaIntegration $integration): string
    {
        if ($integration->usesOmnifyOauth() && !empty($integration->oauth_redirect_uri)) {
            return $integration->oauth_redirect_uri;
        }
        return $this->redirectUri;
    }

    /**
     * Troca um short-lived token por um long-lived token usando as credenciais
     * do fluxo informado.
     */
    protected function exchangeForLongLivedToken(string $shortLivedToken, string $flow = 'regular'): array
    {
        $creds = $this->appCredentialsForFlow($flow);

        $response = Http::get("https://graph.facebook.com/{$this->apiVersion}/oauth/access_token", [
            'grant_type' => 'fb_exchange_token',
            'client_id' => $creds['app_id'],
            'client_secret' => $creds['app_secret'],
            'fb_exchange_token' => $shortLivedToken,
        ]);

        if (!$response->successful()) {
            Log::warning('Meta long-lived token exchange failed, using short-lived', [
                'flow' => $flow,
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
            Log::error('Failed to fetch businesses', [
                'response' => $businessesResponse->json(),
            ]);
            throw new \Exception('Failed to fetch businesses: ' . ($businessesResponse->json()['error']['message'] ?? 'Unknown error'));
        }

        $businesses = $businessesResponse->json()['data'] ?? [];

        Log::info('Discovered businesses', [
            'count' => count($businesses),
            'businesses' => collect($businesses)->pluck('id', 'name')->toArray(),
        ]);

        if (empty($businesses)) {
            throw new \Exception('No businesses found for this account');
        }

        // Coleta TODOS os WABAs de TODOS os businesses
        $allWabas = [];

        foreach ($businesses as $business) {
            $bId = $business['id'];

            // Tenta owned_whatsapp_business_accounts
            $wabasResponse = Http::withToken($accessToken)
                ->get("https://graph.facebook.com/{$this->apiVersion}/{$bId}/owned_whatsapp_business_accounts");

            $ownedWabas = $wabasResponse->successful() ? ($wabasResponse->json()['data'] ?? []) : [];

            Log::info("Business {$bId} owned WABAs", ['count' => count($ownedWabas)]);

            foreach ($ownedWabas as $waba) {
                $allWabas[] = ['waba' => $waba, 'business_id' => $bId];
            }

            // Também tenta client_whatsapp_business_accounts (para Embedded Signup)
            $clientWabasResponse = Http::withToken($accessToken)
                ->get("https://graph.facebook.com/{$this->apiVersion}/{$bId}/client_whatsapp_business_accounts");

            $clientWabas = $clientWabasResponse->successful() ? ($clientWabasResponse->json()['data'] ?? []) : [];

            Log::info("Business {$bId} client WABAs", ['count' => count($clientWabas)]);

            foreach ($clientWabas as $waba) {
                $allWabas[] = ['waba' => $waba, 'business_id' => $bId];
            }
        }

        // Último fallback: tenta via /me/whatsapp_business_accounts (permissão direta)
        if (empty($allWabas)) {
            Log::info('Trying /me/whatsapp_business_accounts as last resort');

            $directWabasResponse = Http::withToken($accessToken)
                ->get("https://graph.facebook.com/{$this->apiVersion}/me/whatsapp_business_accounts");

            if ($directWabasResponse->successful()) {
                $directWabas = $directWabasResponse->json()['data'] ?? [];
                $fallbackBusinessId = $businesses[0]['id'] ?? null;

                Log::info('Direct WABAs found', ['count' => count($directWabas)]);

                foreach ($directWabas as $waba) {
                    $allWabas[] = ['waba' => $waba, 'business_id' => $fallbackBusinessId];
                }
            }
        }

        if (empty($allWabas)) {
            throw new \Exception('No WhatsApp Business Accounts found');
        }

        Log::info('Total WABAs collected', ['count' => count($allWabas)]);

        // Itera cada WABA buscando phone numbers até encontrar um com phones
        $firstWabaEntry = $allWabas[0];

        foreach ($allWabas as $entry) {
            $wabaId = $entry['waba']['id'];
            $businessId = $entry['business_id'];

            $phonesResponse = Http::withToken($accessToken)
                ->get("https://graph.facebook.com/{$this->apiVersion}/{$wabaId}/phone_numbers");

            $phones = $phonesResponse->successful() ? ($phonesResponse->json()['data'] ?? []) : [];

            Log::info("WABA {$wabaId} phone_numbers", ['count' => count($phones)]);

            if (!empty($phones)) {
                $phone = $phones[0];

                return [
                    'business_id' => $businessId,
                    'waba_id' => $wabaId,
                    'phone_number_id' => $phone['id'],
                    'display_phone_number' => $phone['display_phone_number'] ?? null,
                    'verified_name' => $phone['verified_name'] ?? null,
                ];
            }
        }

        // Nenhum WABA tem phone numbers — retorna primeiro WABA sem phone
        $wabaId = $firstWabaEntry['waba']['id'];
        $businessId = $firstWabaEntry['business_id'];

        $wabaInfoResponse = Http::withToken($accessToken)
            ->get("https://graph.facebook.com/{$this->apiVersion}/{$wabaId}", [
                'fields' => 'id,name,on_behalf_of_business_info,owner_business_info',
            ]);

        Log::warning('No phone numbers found in any WABA', [
            'waba_id' => $wabaId,
            'business_id' => $businessId,
            'total_wabas_checked' => count($allWabas),
        ]);

        return [
            'business_id' => $businessId,
            'waba_id' => $wabaId,
            'phone_number_id' => null,
            'display_phone_number' => null,
            'verified_name' => $wabaInfoResponse->json()['name'] ?? null,
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
        ?string $phoneNumberId = null,
        bool $isCoexistence = false,
        ?string $pageUrl = null
    ): MetaIntegration {
        $flow = $isCoexistence ? 'coexistence' : 'embedded';

        Log::info('Processing Embedded Signup', [
            'tenant_id' => $tenantId,
            'waba_id' => $wabaId,
            'phone_number_id' => $phoneNumberId,
            'flow' => $flow,
        ]);

        // 1. Troca o code por access_token usando as credenciais do fluxo correto
        $tokenData = $this->exchangeCodeForTokenEmbedded($code, $pageUrl, $flow);

        // 2. Obtém long-lived token usando as mesmas credenciais
        if (!isset($tokenData['expires_in']) || $tokenData['expires_in'] < 5184000) {
            $tokenData = $this->exchangeForLongLivedToken($tokenData['access_token'], $flow);
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
        $flowCreds = $this->appCredentialsForFlow($flow);

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
                'meta_app_id' => $flowCreds['app_id'],
                'expires_at' => $expiresAt,
                'status' => MetaIntegrationStatusEnum::ACTIVE,
                'is_coexistence' => $isCoexistence,
                'scopes' => $this->scopes,
                'metadata' => [
                    'connected_at' => now()->toIso8601String(),
                    'app_id' => $flowCreds['app_id'],
                    'signup_method' => $isCoexistence ? 'embedded_coexistence' : 'embedded',
                    'is_coexistence' => $isCoexistence,
                ],
            ]
        );

        Log::info('Meta Embedded Signup integration created/updated', [
            'tenant_id' => $tenantId,
            'integration_id' => $integration->id,
            'phone_number_id' => $phoneNumberId,
            'display_phone_number' => $displayPhoneNumber,
            'is_coexistence' => $isCoexistence,
        ]);

        // Inscreve o app nos webhooks da WABA (obrigatório para receber mensagens)
        $this->subscribeAppToWaba($wabaId, $accessToken);

        return $integration;
    }

    /**
     * Processa Embedded Signup com access_token já obtido diretamente do SDK.
     */
    public function processEmbeddedSignupWithToken(
        string $tenantId,
        string $accessToken,
        ?string $wabaId = null,
        ?string $phoneNumberId = null,
        bool $isCoexistence = false
    ): MetaIntegration {
        $flow = $isCoexistence ? 'coexistence' : 'embedded';

        Log::info('Processing Embedded Signup with direct access_token', [
            'tenant_id' => $tenantId,
            'waba_id' => $wabaId,
            'phone_number_id' => $phoneNumberId,
            'flow' => $flow,
        ]);

        // Tenta obter long-lived token usando credenciais do fluxo correto
        try {
            $tokenData = $this->exchangeForLongLivedToken($accessToken, $flow);
            $accessToken = $tokenData['access_token'];
            $expiresAt = isset($tokenData['expires_in'])
                ? Carbon::now()->addSeconds($tokenData['expires_in'])
                : null;
        } catch (\Exception $e) {
            Log::warning('Failed to exchange for long-lived token, using short-lived', [
                'error' => $e->getMessage(),
            ]);
            $expiresAt = Carbon::now()->addHours(1);
        }

        // Se não recebemos waba_id ou phone_number_id, descobrimos automaticamente
        if (empty($wabaId) || empty($phoneNumberId)) {
            $businessData = $this->discoverWhatsAppBusiness($accessToken);
            $wabaId = $businessData['waba_id'];
            $phoneNumberId = $businessData['phone_number_id'];
            $displayPhoneNumber = $businessData['display_phone_number'];
            $verifiedName = $businessData['verified_name'];
            $businessId = $businessData['business_id'];
        } else {
            $phoneDetails = $this->getPhoneNumberDetails($accessToken, $phoneNumberId);
            $displayPhoneNumber = $phoneDetails['display_phone_number'] ?? null;
            $verifiedName = $phoneDetails['verified_name'] ?? null;

            $wabaDetails = $this->getWabaDetails($accessToken, $wabaId);
            $businessId = $wabaDetails['owner_business_info']['id'] ?? null;
        }

        // Cria ou atualiza a integração (usa waba_id para evitar duplicatas)
        $matchCriteria = ['tenant_id' => $tenantId, 'waba_id' => $wabaId];
        $flowCreds = $this->appCredentialsForFlow($flow);

        $integration = MetaIntegration::withoutGlobalScopes()->updateOrCreate(
            $matchCriteria,
            [
                'business_id' => $businessId,
                'waba_id' => $wabaId,
                'phone_number_id' => $phoneNumberId,
                'display_phone_number' => $displayPhoneNumber,
                'verified_name' => $verifiedName,
                'access_token' => $accessToken,
                'meta_app_id' => $flowCreds['app_id'],
                'expires_at' => $expiresAt,
                'status' => MetaIntegrationStatusEnum::ACTIVE,
                'is_coexistence' => $isCoexistence,
                'scopes' => $this->scopes,
                'metadata' => [
                    'connected_at' => now()->toIso8601String(),
                    'app_id' => $flowCreds['app_id'],
                    'signup_method' => $isCoexistence ? 'embedded_coexistence' : 'embedded_direct_token',
                    'is_coexistence' => $isCoexistence,
                ],
            ]
        );

        Log::info('Meta Embedded Signup (direct token) integration created/updated', [
            'tenant_id' => $tenantId,
            'integration_id' => $integration->id,
            'waba_id' => $wabaId,
            'phone_number_id' => $phoneNumberId,
            'display_phone_number' => $displayPhoneNumber,
            'is_coexistence' => $isCoexistence,
        ]);

        // Inscreve o app nos webhooks da WABA (obrigatório para receber mensagens)
        $this->subscribeAppToWaba($wabaId, $accessToken);

        return $integration;
    }

    /**
     * Inscreve o app nos webhooks da WABA. Sem isso, a Meta NÃO envia
     * eventos (mensagens, status) para nosso endpoint.
     *
     * Endpoint: POST /{WABA_ID}/subscribed_apps
     * Doc: https://developers.facebook.com/docs/whatsapp/embedded-signup/steps#step-3
     *
     * IMPORTANTE — Webhook fields necessários (configurados no Meta App Dashboard
     * em Webhooks → WhatsApp Business Account):
     *
     *   Base (todos os tenants):
     *     - messages                          (recebimento)
     *     - message_template_status_update    (aprovação/rejeição de templates)
     *     - phone_number_quality_update       (qualidade do número)
     *
     *   Coexistência (MotoChefe e tenants com is_coexistence=true):
     *     - smb_message_echoes     (mensagens enviadas pelo app do celular)
     *     - smb_app_state_sync     (sync de contatos/estado do app)
     *     - history                (backfill one-shot após onboarding)
     *
     * Ref: https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users/
     *
     * Não lança exceção: se falhar, loga warning para não derrubar o signup.
     * O usuário pode forçar manualmente depois via refresh-token.
     */
    public function subscribeAppToWaba(string $wabaId, string $accessToken): bool
    {
        try {
            $response = Http::withToken($accessToken)
                ->asJson()
                ->post("https://graph.facebook.com/{$this->apiVersion}/{$wabaId}/subscribed_apps", new \stdClass());

            if ($response->successful() && ($response->json()['success'] ?? false)) {
                Log::info('WABA subscribed to webhooks successfully', ['waba_id' => $wabaId]);
                return true;
            }

            Log::warning('Failed to subscribe app to WABA webhooks', [
                'waba_id' => $wabaId,
                'status' => $response->status(),
                'body' => $response->json(),
            ]);
            return false;
        } catch (\Exception $e) {
            Log::warning('Exception subscribing app to WABA webhooks', [
                'waba_id' => $wabaId,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Troca o code por token para Embedded Signup.
     * Usa redirect_uri configurado pois Meta exige que seja idêntico ao usado no dialog.
     *
     * @param  'embedded'|'coexistence'  $flow  Determina qual par de credenciais usar.
     */
    protected function exchangeCodeForTokenEmbedded(string $code, ?string $pageUrl = null, string $flow = 'embedded'): array
    {
        $creds = $this->appCredentialsForFlow($flow);

        $params = [
            'client_id' => $creds['app_id'],
            'client_secret' => $creds['app_secret'],
            'code' => $code,
        ];

        // For FB.login popup flow, try with page URL first, then without redirect_uri
        $attempts = [];
        if ($pageUrl) {
            // Strip query/fragment from page URL for clean redirect_uri
            $cleanUrl = strtok($pageUrl, '?#');
            $attempts[] = ['redirect_uri' => $cleanUrl, 'label' => "page URL: {$cleanUrl}"];
        }
        $attempts[] = ['redirect_uri' => $this->redirectUri, 'label' => "configured: {$this->redirectUri}"];
        $attempts[] = ['redirect_uri' => null, 'label' => 'no redirect_uri'];

        foreach ($attempts as $attempt) {
            $requestParams = $params;
            if ($attempt['redirect_uri'] !== null) {
                $requestParams['redirect_uri'] = $attempt['redirect_uri'];
            }

            Log::info('Embedded Signup: Attempting token exchange', ['attempt' => $attempt['label']]);

            $response = Http::get("https://graph.facebook.com/{$this->apiVersion}/oauth/access_token", $requestParams);

            if ($response->successful()) {
                Log::info('Embedded Signup: Token exchange successful', ['attempt' => $attempt['label']]);
                return $response->json();
            }

            $error = $response->json()['error'] ?? [];
            Log::warning('Embedded Signup: Token exchange attempt failed', [
                'attempt' => $attempt['label'],
                'error_message' => $error['message'] ?? null,
            ]);
        }

        // All attempts failed, throw with last error
        $error = $response->json()['error'] ?? [];

        Log::error('Meta Embedded Signup token exchange failed (all attempts)', [
            'status' => $response->status(),
            'error_code' => $error['code'] ?? null,
            'error_type' => $error['type'] ?? null,
            'error_message' => $error['message'] ?? null,
        ]);

        throw new \Exception('Failed to exchange code for token: ' . ($error['message'] ?? 'Unknown error'));
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
