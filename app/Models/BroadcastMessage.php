<?php

namespace App\Models;

use App\Enums\BroadcastMessageStatusEnum;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BroadcastMessage extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'broadcast_id',
        'contact_id',
        'phone',
        'status',
        'whatsapp_message_id',
        'error_code',
        'error_message',
        'sent_at',
        'delivered_at',
        'read_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => BroadcastMessageStatusEnum::class,
            'error_code' => 'integer',
            'sent_at' => 'datetime',
            'delivered_at' => 'datetime',
            'read_at' => 'datetime',
        ];
    }

    // ─── Relationships ───────────────────────────────────────

    public function broadcast(): BelongsTo
    {
        return $this->belongsTo(Broadcast::class);
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    // ─── Scopes ──────────────────────────────────────────────

    public function scopePending($query)
    {
        return $query->where('status', BroadcastMessageStatusEnum::PENDING);
    }

    public function scopeFailed($query)
    {
        return $query->where('status', BroadcastMessageStatusEnum::FAILED);
    }
}
