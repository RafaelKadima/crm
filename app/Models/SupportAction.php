<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupportAction extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'session_id',
        'tool_name',
        'arguments',
        'result',
        'status',
        'requires_approval',
        'dangerous',
        'error_message',
        'execution_time_ms',
        'approved_at',
        'executed_at',
    ];

    protected function casts(): array
    {
        return [
            'arguments' => 'array',
            'result' => 'array',
            'requires_approval' => 'boolean',
            'dangerous' => 'boolean',
            'approved_at' => 'datetime',
            'executed_at' => 'datetime',
        ];
    }

    // Status constants
    const STATUS_PENDING = 'pending';
    const STATUS_APPROVED = 'approved';
    const STATUS_REJECTED = 'rejected';
    const STATUS_EXECUTED = 'executed';
    const STATUS_FAILED = 'failed';

    // Dangerous tools that always require approval
    const DANGEROUS_TOOLS = [
        'edit_file',
        'create_file',
        'ssh_execute',
        'git_commit',
        'git_push',
        'deploy_production',
    ];

    // Relationships

    public function session(): BelongsTo
    {
        return $this->belongsTo(SupportSession::class, 'session_id');
    }

    // Scopes

    public function scopePending($query)
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    public function scopeRequiringApproval($query)
    {
        return $query->where('requires_approval', true)
                     ->where('status', self::STATUS_PENDING);
    }

    // Methods

    public function approve(): void
    {
        $this->update([
            'status' => self::STATUS_APPROVED,
            'approved_at' => now(),
        ]);
    }

    public function reject(): void
    {
        $this->update([
            'status' => self::STATUS_REJECTED,
        ]);
    }

    public function markAsExecuted(array $result, int $executionTimeMs): void
    {
        $this->update([
            'status' => self::STATUS_EXECUTED,
            'result' => $result,
            'execution_time_ms' => $executionTimeMs,
            'executed_at' => now(),
        ]);
    }

    public function markAsFailed(string $errorMessage): void
    {
        $this->update([
            'status' => self::STATUS_FAILED,
            'error_message' => $errorMessage,
        ]);
    }

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    public function isApproved(): bool
    {
        return $this->status === self::STATUS_APPROVED;
    }

    public function needsApproval(): bool
    {
        return $this->requires_approval && $this->isPending();
    }

    public static function isDangerousTool(string $toolName): bool
    {
        return in_array($toolName, self::DANGEROUS_TOOLS);
    }
}
