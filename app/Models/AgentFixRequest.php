<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class AgentFixRequest extends Model
{
    use HasUuids;

    // Status constants
    const STATUS_PENDING_APPROVAL = 'pending_approval';
    const STATUS_APPROVED = 'approved';
    const STATUS_REJECTED = 'rejected';
    const STATUS_EXECUTING = 'executing';
    const STATUS_DEPLOYED = 'deployed';
    const STATUS_CONFIRMED_FIXED = 'confirmed_fixed';
    const STATUS_CONFIRMED_BROKEN = 'confirmed_broken';
    const STATUS_ESCALATED = 'escalated';

    // Allowed paths for fixes (security)
    const ALLOWED_PATHS = [
        'app/',
        'resources/',
        'frontend/src/',
        'routes/',
    ];

    // Forbidden paths (security)
    const FORBIDDEN_PATHS = [
        '.env',
        'config/database.php',
        'config/auth.php',
        'storage/',
        'bootstrap/',
        'vendor/',
        'node_modules/',
    ];

    protected $fillable = [
        'tenant_id',
        'ticket_id',
        'sdr_agent_id',
        'problem_description',
        'diagnosis_summary',
        'diagnostic_data',
        'file_path',
        'old_code',
        'new_code',
        'fix_explanation',
        'commit_message',
        'status',
        'approver_phone',
        'approval_token',
        'approved_at',
        'rejection_reason',
        'deployed_at',
        'execution_result',
        'customer_confirmed_fixed',
        'customer_feedback',
        'retry_count',
    ];

    protected $casts = [
        'diagnostic_data' => 'array',
        'execution_result' => 'array',
        'customer_confirmed_fixed' => 'boolean',
        'approved_at' => 'datetime',
        'deployed_at' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->approval_token)) {
                $model->approval_token = Str::random(64);
            }
        });
    }

    // Relationships

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }

    public function agent(): BelongsTo
    {
        return $this->belongsTo(SdrAgent::class, 'sdr_agent_id');
    }

    // Status checks

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING_APPROVAL;
    }

    public function isApproved(): bool
    {
        return $this->status === self::STATUS_APPROVED;
    }

    public function isDeployed(): bool
    {
        return $this->status === self::STATUS_DEPLOYED;
    }

    public function canRetry(): bool
    {
        return $this->status === self::STATUS_CONFIRMED_BROKEN && $this->retry_count < 3;
    }

    // Actions

    public function approve(string $approverPhone): bool
    {
        if (!$this->isPending()) {
            return false;
        }

        $this->update([
            'status' => self::STATUS_APPROVED,
            'approver_phone' => $approverPhone,
            'approved_at' => now(),
        ]);

        return true;
    }

    public function reject(string $reason, string $approverPhone): bool
    {
        if (!$this->isPending()) {
            return false;
        }

        $this->update([
            'status' => self::STATUS_REJECTED,
            'rejection_reason' => $reason,
            'approver_phone' => $approverPhone,
        ]);

        return true;
    }

    public function markExecuting(): void
    {
        $this->update(['status' => self::STATUS_EXECUTING]);
    }

    public function markDeployed(array $executionResult): void
    {
        $this->update([
            'status' => self::STATUS_DEPLOYED,
            'deployed_at' => now(),
            'execution_result' => $executionResult,
        ]);
    }

    public function customerConfirmed(bool $fixed, ?string $feedback = null): void
    {
        $this->update([
            'status' => $fixed ? self::STATUS_CONFIRMED_FIXED : self::STATUS_CONFIRMED_BROKEN,
            'customer_confirmed_fixed' => $fixed,
            'customer_feedback' => $feedback,
        ]);
    }

    public function escalate(): void
    {
        $this->update(['status' => self::STATUS_ESCALATED]);
    }

    public function incrementRetry(): void
    {
        $this->increment('retry_count');
    }

    // Scopes

    public function scopePending($query)
    {
        return $query->where('status', self::STATUS_PENDING_APPROVAL);
    }

    public function scopeApproved($query)
    {
        return $query->where('status', self::STATUS_APPROVED);
    }

    public function scopeDeployed($query)
    {
        return $query->where('status', self::STATUS_DEPLOYED);
    }

    public function scopeForApprover($query, string $phone)
    {
        return $query->where('approver_phone', $phone);
    }

    public function scopeForTicket($query, string $ticketId)
    {
        return $query->where('ticket_id', $ticketId);
    }

    public function scopeAwaitingCustomerFeedback($query)
    {
        return $query->where('status', self::STATUS_DEPLOYED);
    }

    // Security validation

    public static function isPathAllowed(string $filePath): bool
    {
        // Check forbidden paths first
        foreach (self::FORBIDDEN_PATHS as $forbidden) {
            if (str_starts_with($filePath, $forbidden) || str_contains($filePath, $forbidden)) {
                return false;
            }
        }

        // Check if path is in allowed list
        foreach (self::ALLOWED_PATHS as $allowed) {
            if (str_starts_with($filePath, $allowed)) {
                return true;
            }
        }

        return false;
    }

    public static function isCodeDiffReasonable(string $oldCode, string $newCode): bool
    {
        $oldLines = substr_count($oldCode, "\n") + 1;
        $newLines = substr_count($newCode, "\n") + 1;

        // Max 100 lines difference
        return abs($newLines - $oldLines) <= 100 && $newLines <= 150;
    }

    // Helper to format for WhatsApp

    public function formatForWhatsApp(): string
    {
        $message = "🛠️ *SOLICITAÇÃO DE CORREÇÃO - ZION*\n\n";
        $message .= "📁 *Arquivo:* `{$this->file_path}`\n\n";
        $message .= "🐛 *Problema:*\n{$this->problem_description}\n\n";
        $message .= "🔍 *Diagnóstico:*\n{$this->diagnosis_summary}\n\n";
        $message .= "✅ *Correção proposta:*\n```\n";

        // Show diff-like format
        $oldLines = explode("\n", trim($this->old_code));
        $newLines = explode("\n", trim($this->new_code));

        foreach ($oldLines as $line) {
            $message .= "- {$line}\n";
        }
        foreach ($newLines as $line) {
            $message .= "+ {$line}\n";
        }

        $message .= "```\n\n";
        $message .= "💡 *Explicação:*\n{$this->fix_explanation}\n\n";
        $message .= "━━━━━━━━━━━━━━━━━━━━━\n";
        $message .= "Responda:\n";
        $message .= "• *APROVAR* - para aplicar a correção\n";
        $message .= "• *REJEITAR [motivo]* - para recusar\n\n";
        $message .= "⏰ _Expira em 30 minutos_\n";
        $message .= "🔑 Token: `{$this->approval_token}`";

        return $message;
    }
}
