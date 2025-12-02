<?php

namespace App\Models;

use App\Enums\IntegrationStatusEnum;
use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExternalIntegrationLog extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'tenant_id',
        'integration_id',
        'model_type',
        'model_id',
        'status',
        'request_payload',
        'response_payload',
        'executed_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => IntegrationStatusEnum::class,
            'request_payload' => 'array',
            'response_payload' => 'array',
            'executed_at' => 'datetime',
        ];
    }

    /**
     * Integração do log.
     */
    public function integration(): BelongsTo
    {
        return $this->belongsTo(ExternalIntegration::class, 'integration_id');
    }

    /**
     * Verifica se foi sucesso.
     */
    public function isSuccess(): bool
    {
        return $this->status === IntegrationStatusEnum::SUCCESS;
    }

    /**
     * Verifica se foi erro.
     */
    public function isError(): bool
    {
        return $this->status === IntegrationStatusEnum::ERROR;
    }
}


