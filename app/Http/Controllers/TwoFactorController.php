<?php

namespace App\Http\Controllers;

use App\Services\TwoFactorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Facades\Hash;

/**
 * Endpoints de gestão de 2FA (TOTP). Login com 2FA fica no AuthController
 * — aqui é só enable/confirm/disable + verify durante login.
 */
class TwoFactorController extends Controller
{
    public function __construct(protected TwoFactorService $twoFactor) {}

    /**
     * Inicia setup do 2FA. Gera secret novo (substitui qualquer secret
     * anterior não confirmado). NÃO ativa o 2FA — precisa confirm depois.
     */
    public function enable(Request $request): JsonResponse
    {
        $user = $request->user();

        // Se já confirmado, exige disable antes de re-habilitar
        if ($user->hasTwoFactorEnabled()) {
            return response()->json([
                'message' => '2FA já está habilitado. Desabilite primeiro pra gerar novo secret.',
            ], 409);
        }

        $secret = $this->twoFactor->generateSecret();
        $user->forceFill([
            'two_factor_secret' => $secret,
            'two_factor_confirmed_at' => null,
        ])->save();

        $uri = $this->twoFactor->provisioningUri($user, $secret);

        return response()->json([
            'secret' => $secret,
            'provisioning_uri' => $uri,
            'qr_code' => $this->twoFactor->qrCodeDataUri($uri),
        ]);
    }

    /**
     * Confirma o 2FA validando que o user consegue gerar códigos válidos.
     * Gera 8 recovery codes one-time-use.
     */
    public function confirm(Request $request): JsonResponse
    {
        $validated = $request->validate(['code' => 'required|string|max:10']);

        $user = $request->user();
        if (empty($user->two_factor_secret)) {
            return response()->json(['message' => 'Inicie o setup primeiro via /enable.'], 400);
        }

        if (!$this->twoFactor->verifyCode($user->two_factor_secret, $validated['code'])) {
            return response()->json(['message' => 'Código inválido.'], 422);
        }

        $recoveryCodes = $this->twoFactor->generateRecoveryCodes();
        $user->forceFill([
            'two_factor_recovery_codes' => $recoveryCodes,
            'two_factor_confirmed_at' => now(),
        ])->save();

        return response()->json([
            'message' => '2FA habilitado.',
            'recovery_codes' => $recoveryCodes, // mostrar UMA VEZ ao user (anote!)
        ]);
    }

    /**
     * Desabilita 2FA. Exige senha + código TOTP atual (ou recovery code).
     */
    public function disable(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'password' => 'required|string',
            'code' => 'required|string|max:10',
        ]);

        $user = $request->user();

        if (!Hash::check($validated['password'], $user->password)) {
            return response()->json(['message' => 'Senha incorreta.'], 422);
        }

        if (!$user->hasTwoFactorEnabled()) {
            return response()->json(['message' => '2FA não está habilitado.'], 400);
        }

        $codeIsValid = $this->twoFactor->verifyCode($user->two_factor_secret, $validated['code'])
            || $this->twoFactor->consumeRecoveryCode($user, $validated['code']);

        if (!$codeIsValid) {
            return response()->json(['message' => 'Código inválido.'], 422);
        }

        $user->forceFill([
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
        ])->save();

        return response()->json(['message' => '2FA desabilitado.']);
    }

    /**
     * Verifica código durante o fluxo de login (após senha correta).
     * Cliente envia pending_session_id + code e recebe access token.
     */
    public function verify(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'pending_session_id' => 'required|string|max:64',
            'code' => 'required|string|max:10',
        ]);

        $user = $this->twoFactor->resolvePendingSession($validated['pending_session_id']);
        if (!$user) {
            return response()->json(['message' => 'Sessão expirada. Faça login novamente.'], 401);
        }

        $valid = $this->twoFactor->verifyCode($user->two_factor_secret, $validated['code'])
            || $this->twoFactor->consumeRecoveryCode($user, $validated['code']);

        if (!$valid) {
            $attempts = $this->twoFactor->incrementPendingAttempts($validated['pending_session_id'], $user);
            return response()->json([
                'message' => 'Código inválido.',
                'attempts' => $attempts,
            ], 422);
        }

        $this->twoFactor->consumePendingSession($validated['pending_session_id']);

        // Emite token Passport
        $token = $user->createToken('CRM Access Token')->accessToken;

        $cookieMinutes = 60 * 24;
        $secure = app()->environment('production');
        Cookie::queue('crm_token', $token, $cookieMinutes, '/', null, $secure, true, false, 'Lax');

        return response()->json([
            'message' => 'Login realizado com sucesso.',
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'tenant_id' => $user->tenant_id,
            ],
            'tenant' => $user->tenant ? [
                'id' => $user->tenant->id,
                'name' => $user->tenant->name,
                'slug' => $user->tenant->slug,
                'plan' => $user->tenant->plan,
            ] : null,
        ]);
    }
}
