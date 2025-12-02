<?php

namespace App\Models;

use App\Enums\HttpMethodEnum;
use App\Enums\IntegrationTypeEnum;
use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ExternalIntegration extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'tenant_id',
        'name',
        'type',
        'endpoint_url',
        'http_method',
        'headers',
        'is_active',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => IntegrationTypeEnum::class,
            'http_method' => HttpMethodEnum::class,
            'headers' => 'array',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Mapeamentos desta integração.
     */
    public function mappings(): HasMany
    {
        return $this->hasMany(ExternalIntegrationMapping::class, 'integration_id');
    }

    /**
     * Logs desta integração.
     */
    public function logs(): HasMany
    {
        return $this->hasMany(ExternalIntegrationLog::class, 'integration_id');
    }

    /**
     * Retorna o mapeamento para um model específico.
     */
    public function getMappingFor(string $modelType): ?ExternalIntegrationMapping
    {
        return $this->mappings()->where('model_type', $modelType)->first();
    }
}


