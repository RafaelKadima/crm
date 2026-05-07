<?php

namespace App\Models;

use App\Enums\MetaIntegrationStatusEnum;
use App\Traits\Auditable;
use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

class MetaIntegration extends Model
{
    use HasFactory, HasUuids, BelongsToTenant, Auditable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'tenant_id',
        'business_id',
        'waba_id',
        'phone_number_id',
        'display_phone_number',
        'verified_name',
        'access_token',
        'meta_app_id',
        'expires_at',
        'status',
        'is_coexistence',
        'scopes',
        'metadata',
        'webhook_origin',
        'oauth_proxy_enabled',
        'oauth_redirect_uri',
        'webhook_needs_revalidation',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'access_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'access_token' => 'encrypted',
            'expires_at' => 'datetime',
            'status' => MetaIntegrationStatusEnum::class,
            'is_coexistence' => 'boolean',
            'scopes' => 'array',
            'metadata' => 'array',
            'oauth_proxy_enabled' => 'boolean',
            'webhook_needs_revalidation' => 'boolean',
        ];
    }

    /**
     * Modos de operação OAuth disponíveis. Mantenha alinhado com a
     * coluna webhook_origin (default 'own_app').
     */
    public const ORIGIN_OWN_APP = 'own_app';
    public const ORIGIN_OMNIFY_OAUTH = 'omnify_oauth';

    public function usesOmnifyOauth(): bool
    {
        return $this->webhook_origin === self::ORIGIN_OMNIFY_OAUTH;
    }

    public function needsRevalidation(): bool
    {
        return (bool) $this->webhook_needs_revalidation;
    }

    /**
     * Marca a integração como precisando de re-OAuth — usado quando
     * admin troca o webhook_origin (own_app ↔ omnify_oauth) e o
     * próximo callback precisa renovar credenciais.
     */
    public function flagForRevalidation(): void
    {
        $this->forceFill(['webhook_needs_revalidation' => true])->save();
    }

    /**
     * Tenant da integração.
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Verifica se o token está próximo de expirar (menos de X dias).
     */
    public function isExpiringSoon(int $days = 7): bool
    {
        if (!$this->expires_at) {
            return false;
        }

        return $this->expires_at->lte(Carbon::now()->addDays($days));
    }

    /**
     * Verifica se o token já expirou.
     */
    public function isExpired(): bool
    {
        if (!$this->expires_at) {
            return false;
        }

        return $this->expires_at->isPast();
    }

    /**
     * Verifica se precisa de reautenticação.
     */
    public function needsReauth(): bool
    {
        return $this->status === MetaIntegrationStatusEnum::REAUTH_REQUIRED
            || $this->isExpired();
    }

    /**
     * Verifica se a integração está ativa e funcional.
     */
    public function isActive(): bool
    {
        return $this->status === MetaIntegrationStatusEnum::ACTIVE
            && !$this->isExpired();
    }

    /**
     * Marca a integração como expirada.
     */
    public function markAsExpired(): void
    {
        $this->update([
            'status' => MetaIntegrationStatusEnum::EXPIRED,
        ]);
    }

    /**
     * Marca a integração como requerendo reautenticação.
     */
    public function markAsReauthRequired(string $reason = null): void
    {
        $metadata = $this->metadata ?? [];
        $metadata['reauth_reason'] = $reason;
        $metadata['reauth_required_at'] = now()->toIso8601String();

        $this->update([
            'status' => MetaIntegrationStatusEnum::REAUTH_REQUIRED,
            'metadata' => $metadata,
        ]);
    }

    /**
     * Atualiza o token de acesso.
     */
    public function updateToken(string $accessToken, ?Carbon $expiresAt = null): void
    {
        $this->update([
            'access_token' => $accessToken,
            'expires_at' => $expiresAt,
            'status' => MetaIntegrationStatusEnum::ACTIVE,
        ]);
    }

    /**
     * Retorna os dias até a expiração do token.
     */
    public function daysUntilExpiration(): ?int
    {
        if (!$this->expires_at) {
            return null;
        }

        return (int) Carbon::now()->diffInDays($this->expires_at, false);
    }

    /**
     * Scope para integracoes ativas.
     */
    public function scopeActive($query)
    {
        return $query->where('status', MetaIntegrationStatusEnum::ACTIVE);
    }

    /**
     * Scope para integrações que precisam de refresh.
     */
    public function scopeNeedsRefresh($query, int $daysThreshold = 7)
    {
        return $query->where('status', MetaIntegrationStatusEnum::ACTIVE)
            ->where('expires_at', '<=', Carbon::now()->addDays($daysThreshold));
    }

    /**
     * Scope para integrações em modo coexistence.
     */
    public function scopeCoexistence($query)
    {
        return $query->where('is_coexistence', true);
    }

    /**
     * Scope para buscar por phone_number_id.
     */
    public function scopeByPhoneNumberId($query, string $phoneNumberId)
    {
        return $query->where('phone_number_id', $phoneNumberId);
    }

    /**
     * Busca integração ativa por phone_number_id (sem tenant scope).
     */
    public static function findActiveByPhoneNumberId(string $phoneNumberId): ?self
    {
        return static::withoutGlobalScopes()
            ->where('phone_number_id', $phoneNumberId)
            ->where('status', MetaIntegrationStatusEnum::ACTIVE)
            ->first();
    }

    /**
     * Retorna o par {app_id, app_secret} do Meta App que emitiu o token desta
     * integração. Resolve via registry config('services.meta.apps') usando
     * meta_app_id como chave.
     *
     * Falha alto e cedo quando o app não está configurado — operações
     * server-to-server (debug_token, message_templates, refresh) precisam
     * absolutamente das credenciais corretas, não há fallback útil.
     *
     * @return array{app_id: string, app_secret: string}
     */
    public function metaAppCredentials(): array
    {
        $appId = $this->meta_app_id;

        if (empty($appId)) {
            throw new \RuntimeException(
                "MetaIntegration {$this->id} sem meta_app_id — rode a migration de backfill."
            );
        }

        $apps = config('services.meta.apps', []);

        if (!isset($apps[$appId])) {
            $configured = empty($apps) ? '(nenhum)' : implode(', ', array_keys($apps));
            throw new \RuntimeException(
                "Meta App {$appId} não está configurado em services.meta.apps. " .
                "Apps configurados: {$configured}. Verifique META_APP_ID / " .
                "META_EMBEDDED_APP_ID / META_COEXISTENCE_APP_ID no .env."
            );
        }

        return [
            'app_id' => $appId,
            'app_secret' => $apps[$appId]['app_secret'],
        ];
    }

    /**
     * Conveniência: retorna a string `{app_id}|{app_secret}` no formato que a
     * Graph API aceita como app access token (input pra debug_token, etc).
     */
    public function metaAppAccessToken(): string
    {
        $creds = $this->metaAppCredentials();
        return "{$creds['app_id']}|{$creds['app_secret']}";
    }
}
