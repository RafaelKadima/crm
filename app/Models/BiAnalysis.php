<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BiAnalysis extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $table = 'bi_analyses';

    protected $fillable = [
        'tenant_id',
        'analysis_type',
        'focus_area',
        'metrics_snapshot',
        'predictions',
        'anomalies',
        'insights',
        'recommended_actions',
        'period_start',
        'period_end',
        'status',
        'error_message',
        'execution_time_ms',
    ];

    protected $casts = [
        'metrics_snapshot' => 'array',
        'predictions' => 'array',
        'anomalies' => 'array',
        'insights' => 'array',
        'recommended_actions' => 'array',
        'period_start' => 'datetime',
        'period_end' => 'datetime',
    ];

    // Constantes para analysis_type
    public const TYPE_DAILY = 'daily';
    public const TYPE_WEEKLY = 'weekly';
    public const TYPE_MONTHLY = 'monthly';
    public const TYPE_ON_DEMAND = 'on_demand';

    // Constantes para focus_area
    public const FOCUS_SALES = 'sales';
    public const FOCUS_SUPPORT = 'support';
    public const FOCUS_MARKETING = 'marketing';
    public const FOCUS_FINANCIAL = 'financial';
    public const FOCUS_GLOBAL = 'global';

    // Constantes para status
    public const STATUS_RUNNING = 'running';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_FAILED = 'failed';

    /**
     * Ações sugeridas desta análise
     */
    public function suggestedActions(): HasMany
    {
        return $this->hasMany(BiSuggestedAction::class, 'analysis_id');
    }

    /**
     * Conhecimentos gerados desta análise
     */
    public function generatedKnowledge(): HasMany
    {
        return $this->hasMany(BiGeneratedKnowledge::class, 'analysis_id');
    }

    /**
     * Scope para análises completadas
     */
    public function scopeCompleted($query)
    {
        return $query->where('status', self::STATUS_COMPLETED);
    }

    /**
     * Scope para análises de um tipo específico
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('analysis_type', $type);
    }

    /**
     * Scope para análises de uma área de foco
     */
    public function scopeForArea($query, string $area)
    {
        return $query->where('focus_area', $area);
    }

    /**
     * Scope para análises recentes
     */
    public function scopeRecent($query, int $days = 7)
    {
        return $query->where('created_at', '>=', now()->subDays($days));
    }

    /**
     * Obtém a última análise do tipo especificado
     */
    public static function getLatest(string $tenantId, string $type = self::TYPE_DAILY, ?string $focusArea = null): ?self
    {
        $query = static::where('tenant_id', $tenantId)
            ->where('analysis_type', $type)
            ->completed();

        if ($focusArea) {
            $query->where('focus_area', $focusArea);
        }

        return $query->latest()->first();
    }

    /**
     * Cria uma nova análise
     */
    public static function startAnalysis(
        string $tenantId,
        string $type,
        string $focusArea,
        \DateTime $periodStart,
        \DateTime $periodEnd
    ): self {
        return static::create([
            'tenant_id' => $tenantId,
            'analysis_type' => $type,
            'focus_area' => $focusArea,
            'period_start' => $periodStart,
            'period_end' => $periodEnd,
            'status' => self::STATUS_RUNNING,
        ]);
    }

    /**
     * Marca análise como completada
     */
    public function complete(array $data, int $executionTimeMs): void
    {
        $this->update([
            'metrics_snapshot' => $data['metrics_snapshot'] ?? null,
            'predictions' => $data['predictions'] ?? null,
            'anomalies' => $data['anomalies'] ?? null,
            'insights' => $data['insights'] ?? null,
            'recommended_actions' => $data['recommended_actions'] ?? null,
            'status' => self::STATUS_COMPLETED,
            'execution_time_ms' => $executionTimeMs,
        ]);
    }

    /**
     * Marca análise como falha
     */
    public function fail(string $errorMessage): void
    {
        $this->update([
            'status' => self::STATUS_FAILED,
            'error_message' => $errorMessage,
        ]);
    }

    /**
     * Retorna resumo da análise
     */
    public function getSummary(): array
    {
        return [
            'id' => $this->id,
            'type' => $this->analysis_type,
            'focus_area' => $this->focus_area,
            'period' => [
                'start' => $this->period_start->format('Y-m-d'),
                'end' => $this->period_end->format('Y-m-d'),
            ],
            'anomalies_count' => count($this->anomalies ?? []),
            'insights_count' => count($this->insights ?? []),
            'actions_count' => count($this->recommended_actions ?? []),
            'status' => $this->status,
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}

