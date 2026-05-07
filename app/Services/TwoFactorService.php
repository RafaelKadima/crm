<?php

namespace App\Services;

use App\Enums\SecurityIncidentTypeEnum;
use App\Models\User;
use BaconQrCode\Renderer\GDLibRenderer;
use BaconQrCode\Writer;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use PragmaRX\Google2FA\Google2FA;

/**
 * Encapsula geração de secret TOTP, QR code, validação de código e
 * recovery codes (one-time-use).
 *
 * Recovery codes: 8 strings alfanuméricas no formato XXXX-XXXX. Quando
 * consumidos, são removidos do array. Quando todos forem usados, o
 * usuário precisa gerar novos via /auth/2fa/regenerate-recovery-codes
 * (em sprint futura).
 */
class TwoFactorService
{
    public function __construct(protected Google2FA $google2fa) {}

    /**
     * Gera novo secret TOTP. NÃO confirma o 2FA — só prepara.
     */
    public function generateSecret(): string
    {
        return $this->google2fa->generateSecretKey(32);
    }

    /**
     * Provisioning URI no formato otpauth:// (escaneável por Google
     * Authenticator, Authy, 1Password, etc).
     */
    public function provisioningUri(User $user, string $secret): string
    {
        $issuer = config('app.name', 'CRM Omnify');
        return $this->google2fa->getQRCodeUrl(
            $issuer,
            $user->email,
            $secret,
        );
    }

    /**
     * QR code PNG como data URI base64 (pra colocar direto em <img>).
     */
    public function qrCodeDataUri(string $provisioningUri): string
    {
        $renderer = new GDLibRenderer(size: 300, margin: 2);
        $writer = new Writer($renderer);
        $png = $writer->writeString($provisioningUri);

        return 'data:image/png;base64,' . base64_encode($png);
    }

    /**
     * Valida código TOTP (6 dígitos). Window=2 permite ±60s de drift
     * de relógio entre servidor e dispositivo do user.
     */
    public function verifyCode(string $secret, string $code): bool
    {
        $code = preg_replace('/\s+/', '', $code);
        if (!preg_match('/^\d{6}$/', $code)) {
            return false;
        }

        return $this->google2fa->verifyKey($secret, $code, window: 2);
    }

    /**
     * Gera 8 recovery codes one-time-use.
     */
    public function generateRecoveryCodes(): array
    {
        $codes = [];
        for ($i = 0; $i < 8; $i++) {
            $codes[] = Str::upper(Str::random(4)) . '-' . Str::upper(Str::random(4));
        }
        return $codes;
    }

    /**
     * Consome um recovery code (remove do array). Retorna true se válido.
     */
    public function consumeRecoveryCode(User $user, string $code): bool
    {
        $code = strtoupper(trim($code));
        $codes = $user->two_factor_recovery_codes ?? [];

        $index = array_search($code, $codes, strict: true);
        if ($index === false) {
            return false;
        }

        unset($codes[$index]);
        $user->two_factor_recovery_codes = array_values($codes);
        $user->save();

        return true;
    }

    /**
     * Cria um pending session pra fluxo de login com 2FA.
     * Devolve uma string opaca (UUID) pra cliente trocar pelo token
     * depois de validar o código.
     */
    public function createPendingSession(User $user): string
    {
        $sessionId = (string) Str::uuid();
        Cache::put(
            "2fa:pending:{$sessionId}",
            ['user_id' => $user->id, 'attempts' => 0],
            now()->addMinutes(5),
        );
        return $sessionId;
    }

    /**
     * Resolve o user a partir de um pending session, contando tentativas
     * inválidas. Após 3 tentativas, registra SecurityIncident.
     */
    public function resolvePendingSession(string $sessionId): ?User
    {
        $data = Cache::get("2fa:pending:{$sessionId}");
        if (!$data) {
            return null;
        }
        return User::find($data['user_id']);
    }

    public function incrementPendingAttempts(string $sessionId, ?User $user): int
    {
        $key = "2fa:pending:{$sessionId}";
        $data = Cache::get($key);
        if (!$data) {
            return 0;
        }

        $data['attempts'] = ($data['attempts'] ?? 0) + 1;
        Cache::put($key, $data, now()->addMinutes(5));

        if ($data['attempts'] >= 3) {
            app(SecurityIncidentService::class)->record(
                type: SecurityIncidentTypeEnum::INVALID_2FA_ATTEMPT,
                metadata: ['session_id' => $sessionId, 'attempts' => $data['attempts']],
                tenantId: $user?->tenant_id,
                actorId: $user?->id,
                actorEmail: $user?->email,
            );
            Cache::forget($key);
        }

        return $data['attempts'];
    }

    public function consumePendingSession(string $sessionId): void
    {
        Cache::forget("2fa:pending:{$sessionId}");
    }
}
