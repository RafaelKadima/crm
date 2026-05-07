<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StepReplyExecution extends Model
{
    use HasUuids, BelongsToTenant;

    public const STATUS_RUNNING = 'running';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_HANDED_OFF = 'handed_off';
    public const STATUS_TIMED_OUT = 'timed_out';
    public const STATUS_CANCELLED = 'cancelled';

    public const TERMINAL_STATUSES = [
        self::STATUS_COMPLETED,
        self::STATUS_HANDED_OFF,
        self::STATUS_TIMED_OUT,
        self::STATUS_CANCELLED,
    ];

    protected $fillable = [
        'tenant_id',
        'ticket_id',
        'step_reply_id',
        'current_step_id',
        'context',
        'status',
        'started_at',
        'last_advanced_at',
        'ended_at',
    ];

    protected function casts(): array
    {
        return [
            'context' => 'array',
            'started_at' => 'datetime',
            'last_advanced_at' => 'datetime',
            'ended_at' => 'datetime',
        ];
    }

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }

    public function stepReply(): BelongsTo
    {
        return $this->belongsTo(StepReply::class);
    }

    public function currentStep(): BelongsTo
    {
        return $this->belongsTo(StepReplyStep::class, 'current_step_id');
    }

    public function isRunning(): bool
    {
        return $this->status === self::STATUS_RUNNING;
    }
}
