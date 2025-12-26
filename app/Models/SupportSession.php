<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SupportSession extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'user_id',
        'title',
        'summary',
        'status',
        'context',
        'metadata',
        'last_message_at',
    ];

    protected function casts(): array
    {
        return [
            'context' => 'array',
            'metadata' => 'array',
            'last_message_at' => 'datetime',
        ];
    }

    // Relationships

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(SupportMessage::class, 'session_id');
    }

    public function actions(): HasMany
    {
        return $this->hasMany(SupportAction::class, 'session_id');
    }

    // Scopes

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeForUser($query, string $userId)
    {
        return $query->where('user_id', $userId);
    }

    // Methods

    public function addMessage(string $role, string $content, ?array $toolCalls = null): SupportMessage
    {
        $message = $this->messages()->create([
            'role' => $role,
            'content' => $content,
            'tool_calls' => $toolCalls,
        ]);

        $this->update(['last_message_at' => now()]);

        return $message;
    }

    public function complete(?string $summary = null): void
    {
        $this->update([
            'status' => 'completed',
            'summary' => $summary ?? $this->generateSummary(),
        ]);
    }

    protected function generateSummary(): string
    {
        $firstMessage = $this->messages()->where('role', 'user')->first();
        return $firstMessage ? substr($firstMessage->content, 0, 200) : 'Sessao de suporte';
    }
}
