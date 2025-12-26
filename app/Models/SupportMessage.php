<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupportMessage extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'session_id',
        'role',
        'content',
        'tool_calls',
        'metadata',
        'input_tokens',
        'output_tokens',
    ];

    protected function casts(): array
    {
        return [
            'tool_calls' => 'array',
            'metadata' => 'array',
        ];
    }

    // Relationships

    public function session(): BelongsTo
    {
        return $this->belongsTo(SupportSession::class, 'session_id');
    }

    // Scopes

    public function scopeFromUser($query)
    {
        return $query->where('role', 'user');
    }

    public function scopeFromAssistant($query)
    {
        return $query->where('role', 'assistant');
    }

    // Accessors

    public function getTotalTokensAttribute(): int
    {
        return ($this->input_tokens ?? 0) + ($this->output_tokens ?? 0);
    }

    public function hasToolCalls(): bool
    {
        return !empty($this->tool_calls);
    }
}
