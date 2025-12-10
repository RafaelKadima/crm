<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AdAccount extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'name',
        'platform',
        'platform_account_id',
        'platform_account_name',
        'access_token',
        'refresh_token',
        'token_expires_at',
        'status',
        'currency',
        'timezone',
        'metadata',
        'last_sync_at',
        'last_error',
    ];

    protected $casts = [
        'metadata' => 'array',
        'token_expires_at' => 'datetime',
        'last_sync_at' => 'datetime',
    ];

    protected $hidden = [
        'access_token',
        'refresh_token',
    ];

    /**
     * Plataformas suportadas.
     */
    public const PLATFORM_META = 'meta';
    public const PLATFORM_GOOGLE = 'google';

    /**
     * Status possíveis.
     */
    public const STATUS_ACTIVE = 'active';
    public const STATUS_PAUSED = 'paused';
    public const STATUS_DISCONNECTED = 'disconnected';
    public const STATUS_ERROR = 'error';

    /**
     * Campanhas desta conta.
     */
    public function campaigns(): HasMany
    {
        return $this->hasMany(AdCampaign::class);
    }

    /**
     * Regras de automação desta conta.
     */
    public function automationRules(): HasMany
    {
        return $this->hasMany(AdAutomationRule::class);
    }

    /**
     * Verifica se a conta está ativa.
     */
    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    /**
     * Verifica se o token está válido.
     */
    public function hasValidToken(): bool
    {
        if (!$this->access_token) {
            return false;
        }

        if ($this->token_expires_at && $this->token_expires_at->isPast()) {
            return false;
        }

        return true;
    }

    /**
     * Verifica se é conta Meta.
     */
    public function isMeta(): bool
    {
        return $this->platform === self::PLATFORM_META;
    }

    /**
     * Verifica se é conta Google.
     */
    public function isGoogle(): bool
    {
        return $this->platform === self::PLATFORM_GOOGLE;
    }

    /**
     * Marca como sincronizado.
     */
    public function markAsSynced(): void
    {
        $this->update([
            'last_sync_at' => now(),
            'last_error' => null,
            'status' => self::STATUS_ACTIVE,
        ]);
    }

    /**
     * Marca com erro.
     */
    public function markAsError(string $error): void
    {
        $this->update([
            'last_error' => $error,
            'status' => self::STATUS_ERROR,
        ]);
    }

    /**
     * Scope para contas ativas.
     */
    public function scopeActive($query)
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }

    /**
     * Scope para contas Meta.
     */
    public function scopeMeta($query)
    {
        return $query->where('platform', self::PLATFORM_META);
    }

    /**
     * Scope para contas Google.
     */
    public function scopeGoogle($query)
    {
        return $query->where('platform', self::PLATFORM_GOOGLE);
    }
}

