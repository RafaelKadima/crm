<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StepReplyStep extends Model
{
    use HasFactory, HasUuids;

    public const TYPE_SEND_MESSAGE = 'send_message';
    public const TYPE_WAIT_INPUT = 'wait_input';
    public const TYPE_CONDITION = 'condition';
    public const TYPE_BRANCH = 'branch';
    public const TYPE_HANDOFF_HUMAN = 'handoff_human';
    public const TYPE_END = 'end';

    public const TYPES = [
        self::TYPE_SEND_MESSAGE,
        self::TYPE_WAIT_INPUT,
        self::TYPE_CONDITION,
        self::TYPE_BRANCH,
        self::TYPE_HANDOFF_HUMAN,
        self::TYPE_END,
    ];

    protected $fillable = [
        'step_reply_id',
        'order',
        'type',
        'config',
    ];

    protected function casts(): array
    {
        return [
            'config' => 'array',
            'order' => 'integer',
        ];
    }

    public function stepReply(): BelongsTo
    {
        return $this->belongsTo(StepReply::class);
    }

    /**
     * Step types que pausam o engine aguardando input do cliente.
     */
    public function isWaitingType(): bool
    {
        return in_array($this->type, [self::TYPE_WAIT_INPUT, self::TYPE_BRANCH], true);
    }

    /**
     * Step types terminais — execução vira completed/handed_off.
     */
    public function isTerminalType(): bool
    {
        return in_array($this->type, [self::TYPE_END, self::TYPE_HANDOFF_HUMAN], true);
    }
}
