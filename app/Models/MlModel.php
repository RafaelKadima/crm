<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MlModel extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $table = 'ml_models';

    protected $fillable = [
        'tenant_id',
        'model_type',
        'version',
        'weights_path',
        'metrics',
        'hyperparameters',
        'training_samples',
        'status',
        'is_active',
        'is_global',
        'trained_at',
    ];

    protected $casts = [
        'metrics' => 'array',
        'hyperparameters' => 'array',
        'training_samples' => 'integer',
        'is_active' => 'boolean',
        'is_global' => 'boolean',
        'trained_at' => 'datetime',
    ];

    // Constantes para model_type
    public const TYPE_LEAD_SCORE = 'lead_score';
    public const TYPE_CAMPAIGN_PREDICTOR = 'campaign_predictor';

    // Constantes para status
    public const STATUS_TRAINING = 'training';
    public const STATUS_READY = 'ready';
    public const STATUS_DEPRECATED = 'deprecated';

    /**
     * Scope para modelos ativos
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope para modelos globais
     */
    public function scopeGlobal($query)
    {
        return $query->where('is_global', true)->whereNull('tenant_id');
    }

    /**
     * Scope para modelos por tipo
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('model_type', $type);
    }

    /**
     * Scope para modelos prontos para uso
     */
    public function scopeReady($query)
    {
        return $query->where('status', self::STATUS_READY);
    }

    /**
     * Retorna o modelo ativo para um tenant e tipo
     */
    public static function getActiveForTenant(string $tenantId, string $modelType): ?self
    {
        // Primeiro tenta modelo do tenant
        $model = static::where('tenant_id', $tenantId)
            ->ofType($modelType)
            ->active()
            ->ready()
            ->orderByDesc('version')
            ->first();

        // Fallback para modelo global
        if (!$model) {
            $model = static::global()
                ->ofType($modelType)
                ->active()
                ->ready()
                ->orderByDesc('version')
                ->first();
        }

        return $model;
    }

    /**
     * Cria nova versão do modelo
     */
    public static function createNewVersion(
        ?string $tenantId,
        string $modelType,
        string $weightsPath,
        array $metrics,
        array $hyperparameters,
        int $trainingSamples
    ): self {
        // Desativa versões anteriores
        static::where('tenant_id', $tenantId)
            ->ofType($modelType)
            ->update(['is_active' => false]);

        // Pega próxima versão
        $lastVersion = static::where('tenant_id', $tenantId)
            ->ofType($modelType)
            ->max('version') ?? 0;

        return static::create([
            'tenant_id' => $tenantId,
            'model_type' => $modelType,
            'version' => $lastVersion + 1,
            'weights_path' => $weightsPath,
            'metrics' => $metrics,
            'hyperparameters' => $hyperparameters,
            'training_samples' => $trainingSamples,
            'status' => self::STATUS_READY,
            'is_active' => true,
            'is_global' => $tenantId === null,
            'trained_at' => now(),
        ]);
    }
}

