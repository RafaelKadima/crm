<?php

namespace App\Models;

use App\Enums\MessageDirectionEnum;
use App\Enums\SenderTypeEnum;
use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TicketMessage extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'tenant_id',
        'ticket_id',
        'sender_type',
        'sender_id',
        'message',
        'direction',
        'sent_at',
        'metadata',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'sender_type' => SenderTypeEnum::class,
            'direction' => MessageDirectionEnum::class,
            'sent_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    /**
     * Ticket da mensagem.
     */
    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }

    /**
     * Usuário que enviou (se sender_type = user).
     */
    public function sender(): ?BelongsTo
    {
        if ($this->sender_type === SenderTypeEnum::USER) {
            return $this->belongsTo(User::class, 'sender_id');
        }
        return null;
    }

    /**
     * Verifica se é mensagem de entrada.
     */
    public function isInbound(): bool
    {
        return $this->direction === MessageDirectionEnum::INBOUND;
    }

    /**
     * Verifica se é mensagem de saída.
     */
    public function isOutbound(): bool
    {
        return $this->direction === MessageDirectionEnum::OUTBOUND;
    }

    /**
     * Verifica se foi enviada pela IA.
     */
    public function isFromIa(): bool
    {
        return $this->sender_type === SenderTypeEnum::IA;
    }

    /**
     * Anexos da mensagem.
     */
    public function attachments(): HasMany
    {
        return $this->hasMany(TicketMessageAttachment::class);
    }
}


