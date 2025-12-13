<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BiAgentConfig extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $table = 'bi_agent_configs';

    protected $fillable = [
        'tenant_id',
        'auto_analysis_enabled',
        'analysis_frequency',
        'preferred_analysis_time',
        'auto_add_to_rag',
        'auto_prepare_training',
        'notification_settings',
        'focus_areas',
        'thresholds',
        'monitored_accounts',
    ];

    protected $casts = [
        'auto_analysis_enabled' => 'boolean',
        'auto_add_to_rag' => 'boolean',
        'auto_prepare_training' => 'boolean',
        'notification_settings' => 'array',
        'focus_areas' => 'array',
        'thresholds' => 'array',
        'monitored_accounts' => 'array',
    ];

    // Constantes para analysis_frequency
    public const FREQ_DAILY = 'daily';
    public const FREQ_WEEKLY = 'weekly';
    public const FREQ_MONTHLY = 'monthly';

    /**
     * Tenant associado
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Obtém ou cria configuração para tenant
     */
    public static function getOrCreate(string $tenantId): self
    {
        return static::firstOrCreate(
            ['tenant_id' => $tenantId],
            [
                'auto_analysis_enabled' => true,
                'analysis_frequency' => self::FREQ_DAILY,
                'preferred_analysis_time' => '06:00:00',
                'auto_add_to_rag' => false,
                'auto_prepare_training' => true,
                'notification_settings' => [
                    'email_on_critical' => true,
                    'email_on_high' => false,
                    'push_notifications' => true,
                ],
                'focus_areas' => ['sales', 'support', 'marketing'],
                'thresholds' => [
                    'conversion_rate_drop' => 0.15, // 15% de queda dispara alerta
                    'response_time_increase' => 0.30, // 30% de aumento
                    'roas_minimum' => 1.0, // ROAS mínimo
                    'anomaly_zscore' => 2.5, // Z-score para anomalias
                ],
            ]
        );
    }

    /**
     * Atualiza configurações de notificação
     */
    public function updateNotificationSettings(array $settings): void
    {
        $current = $this->notification_settings ?? [];
        $this->update([
            'notification_settings' => array_merge($current, $settings),
        ]);
    }

    /**
     * Atualiza thresholds
     */
    public function updateThresholds(array $thresholds): void
    {
        $current = $this->thresholds ?? [];
        $this->update([
            'thresholds' => array_merge($current, $thresholds),
        ]);
    }

    /**
     * Verifica se deve executar análise
     */
    public function shouldRunAnalysis(): bool
    {
        if (!$this->auto_analysis_enabled) {
            return false;
        }

        $lastAnalysis = BiAnalysis::where('tenant_id', $this->tenant_id)
            ->completed()
            ->latest()
            ->first();

        if (!$lastAnalysis) {
            return true;
        }

        return match ($this->analysis_frequency) {
            self::FREQ_DAILY => $lastAnalysis->created_at->diffInHours(now()) >= 24,
            self::FREQ_WEEKLY => $lastAnalysis->created_at->diffInDays(now()) >= 7,
            self::FREQ_MONTHLY => $lastAnalysis->created_at->diffInDays(now()) >= 30,
            default => false,
        };
    }

    /**
     * Obtém threshold específico
     */
    public function getThreshold(string $key, $default = null)
    {
        return $this->thresholds[$key] ?? $default;
    }
}

