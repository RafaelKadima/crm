<?php

namespace App\Models;

use App\Traits\Auditable;
use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class StepReply extends Model
{
    use HasFactory, HasUuids, BelongsToTenant, SoftDeletes, Auditable;

    public const TRIGGER_KEYWORD = 'keyword';
    public const TRIGGER_MANUAL = 'manual';
    public const TRIGGER_AUTO_ON_OPEN = 'auto_on_open';

    protected $fillable = [
        'tenant_id',
        'channel_id',
        'queue_id',
        'name',
        'description',
        'trigger_type',
        'trigger_config',
        'is_active',
        'priority',
    ];

    protected function casts(): array
    {
        return [
            'trigger_config' => 'array',
            'is_active' => 'boolean',
            'priority' => 'integer',
        ];
    }

    public function steps(): HasMany
    {
        return $this->hasMany(StepReplyStep::class)->orderBy('order');
    }

    public function executions(): HasMany
    {
        return $this->hasMany(StepReplyExecution::class);
    }

    public function channel(): BelongsTo
    {
        return $this->belongsTo(Channel::class);
    }

    public function queue(): BelongsTo
    {
        return $this->belongsTo(Queue::class);
    }

    public function firstStep(): ?StepReplyStep
    {
        return $this->steps()->orderBy('order')->first();
    }
}
