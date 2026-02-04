<?php

namespace App\Modules\Meta\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Channel;
use App\Models\MetaIntegration;
use App\Modules\Meta\Services\MetaOAuthService;
use App\Modules\Meta\Services\MetaProfileService;
use App\Modules\Meta\Services\MetaTemplateService;
use App\Modules\Meta\Services\MetaTokenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class MetaAuthController extends Controller
{
    public function __construct(
        protected MetaOAuthService $oauthService,
        protected MetaTokenService $tokenService,
        protected MetaTemplateService $templateService,
        protected MetaProfileService $profileService
    ) {}

    /**
     * Inicia o fluxo OAuth redirecionando para a Meta.
     * GET /api/meta/connect
     */
    public function connect(Request $request): RedirectResponse|JsonResponse
    {
        if (!$this->oauthService->isConfigured()) {
            return response()->json([
                'success' => false,
                'message' => 'Meta OAuth is not configured. Please set META_APP_ID and META_APP_SECRET.',
            ], 500);
        }

        $tenantId = auth()->user()->tenant_id;
        $authUrl = $this->oauthService->getAuthorizationUrl($tenantId);

        // Se for chamada AJAX, retorna URL para o frontend redirecionar
        if ($request->expectsJson() || $request->ajax()) {
            return response()->json([
                'success' => true,
                'redirect_url' => $authUrl,
            ]);
        }

        return redirect()->away($authUrl);
    }

    /**
     * Callback do OAuth após autorização na Meta.
     * GET /api/meta/callback
     */
    public function callback(Request $request): JsonResponse|RedirectResponse
    {
        // Verifica se houve erro no OAuth
        if ($request->has('error')) {
            Log::error('Meta OAuth error', [
                'error' => $request->get('error'),
                'error_reason' => $request->get('error_reason'),
                'error_description' => $request->get('error_description'),
            ]);

            $frontendUrl = config('app.frontend_url', config('app.url'));
            return redirect()->to("{$frontendUrl}/settings/integrations?error=oauth_denied");
        }

        $code = $request->get('code');
        $state = $request->get('state');

        if (!$code || !$state) {
            return response()->json([
                'success' => false,
                'message' => 'Missing code or state parameter',
            ], 400);
        }

        try {
            $integration = $this->oauthService->handleCallback($code, $state);

            // Redireciona para o frontend com sucesso
            $frontendUrl = config('app.frontend_url', config('app.url'));
            return redirect()->to("{$frontendUrl}/settings/integrations?success=meta_connected&integration_id={$integration->id}");

        } catch (\Exception $e) {
            Log::error('Meta OAuth callback failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            $frontendUrl = config('app.frontend_url', config('app.url'));
            return redirect()->to("{$frontendUrl}/settings/integrations?error=" . urlencode($e->getMessage()));
        }
    }

    /**
     * Lista todas as integrações do tenant.
     * GET /api/meta/integrations
     */
    public function index(): JsonResponse
    {
        $integrations = MetaIntegration::query()
            ->select([
                'id',
                'business_id',
                'waba_id',
                'phone_number_id',
                'display_phone_number',
                'verified_name',
                'expires_at',
                'status',
                'is_coexistence',
                'created_at',
                'updated_at',
            ])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($integration) {
                return [
                    'id' => $integration->id,
                    'business_id' => $integration->business_id,
                    'waba_id' => $integration->waba_id,
                    'phone_number_id' => $integration->phone_number_id,
                    'display_phone_number' => $integration->display_phone_number,
                    'verified_name' => $integration->verified_name,
                    'status' => $integration->status->value,
                    'status_label' => $integration->status->label(),
                    'status_color' => $integration->status->color(),
                    'is_coexistence' => $integration->is_coexistence ?? false,
                    'expires_at' => $integration->expires_at?->toIso8601String(),
                    'days_until_expiration' => $integration->daysUntilExpiration(),
                    'is_expiring_soon' => $integration->isExpiringSoon(),
                    'needs_reauth' => $integration->needsReauth(),
                    'created_at' => $integration->created_at->toIso8601String(),
                    'updated_at' => $integration->updated_at->toIso8601String(),
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $integrations,
        ]);
    }

    /**
     * Obtém detalhes de uma integração específica.
     * GET /api/meta/integrations/{id}
     */
    public function show(string $id): JsonResponse
    {
        $integration = MetaIntegration::findOrFail($id);

        // Obtém informações do token
        $tokenInfo = $this->tokenService->getTokenInfo($integration);

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $integration->id,
                'business_id' => $integration->business_id,
                'waba_id' => $integration->waba_id,
                'phone_number_id' => $integration->phone_number_id,
                'display_phone_number' => $integration->display_phone_number,
                'verified_name' => $integration->verified_name,
                'status' => $integration->status->value,
                'status_label' => $integration->status->label(),
                'status_color' => $integration->status->color(),
                'expires_at' => $integration->expires_at?->toIso8601String(),
                'days_until_expiration' => $integration->daysUntilExpiration(),
                'is_expiring_soon' => $integration->isExpiringSoon(),
                'needs_reauth' => $integration->needsReauth(),
                'is_coexistence' => $integration->is_coexistence ?? false,
                'scopes' => $integration->scopes,
                'metadata' => $integration->metadata,
                'token_info' => $tokenInfo,
                'created_at' => $integration->created_at->toIso8601String(),
                'updated_at' => $integration->updated_at->toIso8601String(),
            ],
        ]);
    }

    /**
     * Desconecta/remove uma integração.
     * DELETE /api/meta/integrations/{id}
     */
    public function destroy(string $id): JsonResponse
    {
        $integration = MetaIntegration::findOrFail($id);

        Log::info('Meta integration disconnected', [
            'integration_id' => $integration->id,
            'tenant_id' => $integration->tenant_id,
            'phone_number_id' => $integration->phone_number_id,
        ]);

        $integration->delete();

        return response()->json([
            'success' => true,
            'message' => 'Integration disconnected successfully',
        ]);
    }

    /**
     * Força renovação do token de uma integração.
     * POST /api/meta/integrations/{id}/refresh-token
     */
    public function refreshToken(string $id): JsonResponse
    {
        $integration = MetaIntegration::findOrFail($id);

        $success = $this->tokenService->refreshToken($integration);

        if (!$success) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to refresh token. You may need to reconnect the integration.',
            ], 400);
        }

        // Recarrega para pegar os novos valores
        $integration->refresh();

        return response()->json([
            'success' => true,
            'message' => 'Token refreshed successfully',
            'data' => [
                'expires_at' => $integration->expires_at?->toIso8601String(),
                'days_until_expiration' => $integration->daysUntilExpiration(),
                'status' => $integration->status->value,
            ],
        ]);
    }

    /**
     * Lista templates de uma integração.
     * GET /api/meta/integrations/{id}/templates
     */
    public function templates(string $id, Request $request): JsonResponse
    {
        $integration = MetaIntegration::findOrFail($id);

        if (!$integration->isActive()) {
            return response()->json([
                'success' => false,
                'message' => 'Integration is not active',
            ], 400);
        }

        try {
            $status = $request->get('status'); // APPROVED, PENDING, REJECTED
            $templates = $status
                ? $this->templateService->list($integration, $status)
                : $this->templateService->listApproved($integration);

            return response()->json([
                'success' => true,
                'data' => $templates,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Sincroniza templates da Meta.
     * POST /api/meta/integrations/{id}/templates/sync
     */
    public function syncTemplates(string $id): JsonResponse
    {
        $integration = MetaIntegration::findOrFail($id);

        if (!$integration->isActive()) {
            return response()->json([
                'success' => false,
                'message' => 'Integration is not active',
            ], 400);
        }

        try {
            $count = $this->templateService->sync($integration);

            return response()->json([
                'success' => true,
                'message' => "Synchronized {$count} templates",
                'count' => $count,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Verifica status da configuração OAuth.
     * GET /api/meta/status
     */
    public function status(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => [
                'oauth_configured' => $this->oauthService->isConfigured(),
                'embedded_signup_configured' => $this->oauthService->isEmbeddedSignupConfigured(),
                'config_id' => $this->oauthService->getConfigId(),
                'app_id' => config('services.meta.app_id'),
                'token_service_configured' => $this->tokenService->isConfigured(),
            ],
        ]);
    }

    /**
     * Callback do Embedded Signup.
     * Recebe os dados do frontend após o usuário completar o fluxo no popup.
     * POST /api/meta/embedded-signup
     */
    public function embeddedSignupCallback(Request $request): JsonResponse
    {
        $request->validate([
            'code' => 'nullable|string',
            'access_token' => 'nullable|string',
            'waba_id' => 'nullable|string',
            'phone_number_id' => 'nullable|string',
            'is_coexistence' => 'nullable|boolean',
        ]);

        if (!$request->get('code') && !$request->get('access_token')) {
            return response()->json([
                'success' => false,
                'message' => 'Either code or access_token is required.',
            ], 422);
        }

        if (!$this->oauthService->isEmbeddedSignupConfigured()) {
            return response()->json([
                'success' => false,
                'message' => 'Embedded Signup is not configured. Please set META_CONFIG_ID.',
            ], 500);
        }

        try {
            $tenantId = auth()->user()->tenant_id;

            $isCoexistence = $request->boolean('is_coexistence', false);

            if ($request->get('access_token')) {
                // Access token recebido diretamente do Facebook SDK
                $integration = $this->oauthService->processEmbeddedSignupWithToken(
                    tenantId: $tenantId,
                    accessToken: $request->get('access_token'),
                    wabaId: $request->get('waba_id'),
                    phoneNumberId: $request->get('phone_number_id'),
                    isCoexistence: $isCoexistence
                );
            } else {
                $integration = $this->oauthService->processEmbeddedSignup(
                    tenantId: $tenantId,
                    code: $request->get('code'),
                    wabaId: $request->get('waba_id'),
                    phoneNumberId: $request->get('phone_number_id'),
                    isCoexistence: $isCoexistence
                );
            }

            // Auto-criar Channel se temos phone_number_id
            $channel = null;
            if ($integration->phone_number_id) {
                $channel = Channel::withoutGlobalScopes()
                    ->where('tenant_id', $tenantId)
                    ->where('type', 'whatsapp')
                    ->where('provider_type', 'meta')
                    ->whereJsonContains('config->phone_number_id', $integration->phone_number_id)
                    ->first();

                if (!$channel) {
                    $channelName = $integration->verified_name
                        ? "WhatsApp - {$integration->verified_name}"
                        : "WhatsApp - {$integration->display_phone_number}";

                    $channel = Channel::create([
                        'tenant_id' => $tenantId,
                        'name' => $channelName,
                        'type' => 'whatsapp',
                        'provider_type' => 'meta',
                        'identifier' => $integration->display_phone_number ?? $integration->phone_number_id,
                        'config' => [
                            'phone_number_id' => $integration->phone_number_id,
                            'waba_id' => $integration->waba_id,
                            'access_token' => $integration->access_token,
                            'business_account_id' => $integration->business_id,
                        ],
                        'is_active' => true,
                        'ia_mode' => 'none',
                    ]);

                    Log::info('Channel auto-created from Embedded Signup', [
                        'channel_id' => $channel->id,
                        'integration_id' => $integration->id,
                        'tenant_id' => $tenantId,
                    ]);
                }
            } else {
                Log::warning('No phone_number_id available, channel not auto-created', [
                    'integration_id' => $integration->id,
                    'waba_id' => $integration->waba_id,
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'WhatsApp conectado com sucesso via Cadastro Incorporado',
                'data' => [
                    'id' => $integration->id,
                    'phone_number_id' => $integration->phone_number_id,
                    'display_phone_number' => $integration->display_phone_number,
                    'verified_name' => $integration->verified_name,
                    'status' => $integration->status->value,
                    'is_coexistence' => $integration->is_coexistence ?? false,
                    'expires_at' => $integration->expires_at?->toIso8601String(),
                    'channel' => $channel ? [
                        'id' => $channel->id,
                        'name' => $channel->name,
                        'identifier' => $channel->identifier,
                        'is_active' => $channel->is_active,
                    ] : null,
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Meta Embedded Signup callback failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Obtém o perfil do WhatsApp Business.
     * GET /api/meta/integrations/{id}/profile
     */
    public function getProfile(string $id): JsonResponse
    {
        $integration = MetaIntegration::findOrFail($id);

        if (!$integration->isActive()) {
            return response()->json([
                'success' => false,
                'message' => 'Integration is not active',
            ], 400);
        }

        try {
            $profile = $this->profileService->getProfile($integration);

            return response()->json([
                'success' => true,
                'data' => $profile,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Atualiza o perfil do WhatsApp Business.
     * PUT /api/meta/integrations/{id}/profile
     */
    public function updateProfile(string $id, Request $request): JsonResponse
    {
        $integration = MetaIntegration::findOrFail($id);

        if (!$integration->isActive()) {
            return response()->json([
                'success' => false,
                'message' => 'Integration is not active',
            ], 400);
        }

        $request->validate([
            'about' => 'nullable|string|max:139',
            'address' => 'nullable|string|max:256',
            'description' => 'nullable|string|max:512',
            'email' => 'nullable|email|max:128',
            'websites' => 'nullable|array|max:2',
            'websites.*' => 'url|max:256',
            'vertical' => 'nullable|string',
        ]);

        try {
            $data = $request->only([
                'about',
                'address',
                'description',
                'email',
                'websites',
                'vertical',
            ]);

            // Remove valores nulos/vazios
            $data = array_filter($data, fn($value) => $value !== null && $value !== '');

            if (empty($data)) {
                return response()->json([
                    'success' => false,
                    'message' => 'No data provided for update',
                ], 400);
            }

            $this->profileService->updateProfile($integration, $data);

            // Retorna o perfil atualizado
            $profile = $this->profileService->getProfile($integration);

            return response()->json([
                'success' => true,
                'message' => 'Profile updated successfully',
                'data' => $profile,
            ]);

        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Meta profile update failed', [
                'integration_id' => $integration->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Faz upload da foto de perfil do WhatsApp Business.
     * POST /api/meta/integrations/{id}/profile/photo
     */
    public function uploadProfilePhoto(string $id, Request $request): JsonResponse
    {
        $integration = MetaIntegration::findOrFail($id);

        if (!$integration->isActive()) {
            return response()->json([
                'success' => false,
                'message' => 'Integration is not active',
            ], 400);
        }

        // Aceita arquivo ou base64
        $request->validate([
            'photo' => 'required_without:photo_base64|file|image|mimes:jpeg,png|max:5120',
            'photo_base64' => 'required_without:photo|string',
        ]);

        try {
            $handle = null;

            if ($request->hasFile('photo')) {
                $file = $request->file('photo');
                $handle = $this->profileService->uploadProfilePhoto($integration, $file->getPathname());
            } elseif ($request->has('photo_base64')) {
                $mimeType = $request->input('mime_type', 'image/jpeg');
                $handle = $this->profileService->uploadProfilePhotoFromBase64(
                    $integration,
                    $request->input('photo_base64'),
                    $mimeType
                );
            }

            if (!$handle) {
                throw new \Exception('No photo provided');
            }

            // Atualiza o perfil com o handle
            $this->profileService->updateProfile($integration, [
                'profile_picture_handle' => $handle,
            ]);

            // Retorna o perfil atualizado
            $profile = $this->profileService->getProfile($integration);

            return response()->json([
                'success' => true,
                'message' => 'Profile photo updated successfully',
                'data' => $profile,
            ]);

        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Meta profile photo upload failed', [
                'integration_id' => $integration->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Obtém as categorias de negócio disponíveis.
     * GET /api/meta/profile/categories
     */
    public function getProfileCategories(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->profileService->getAvailableCategories(),
        ]);
    }
}
