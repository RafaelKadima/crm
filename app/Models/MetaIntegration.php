<?php

namespace App\Models;

use App\Enums\MetaIntegrationStatusEnum;
use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

class MetaIntegration extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

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
        'expires_at',
        'status',
        'scopes',
        'metadata',
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
            'scopes' => 'array',
            'metadata' => 'array',
        ];
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
}
