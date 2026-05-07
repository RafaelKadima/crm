<?php

namespace App\Models;

use App\Enums\SecurityIncidentSeverityEnum;
use App\Enums\SecurityIncidentTypeEnum;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SecurityIncident extends Model
{
    use HasUuids;

    public const UPDATED_AT = null;

    protected $fillable = [
        'tenant_id',
        'actor_id',
        'actor_email',
        'type',
        'severity',
        'ip',
        'user_agent',
        'path',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'type' => SecurityIncidentTypeEnum::class,
            'severity' => SecurityIncidentSeverityEnum::class,
            'metadata' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
