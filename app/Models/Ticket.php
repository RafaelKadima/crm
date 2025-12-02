<?php

namespace App\Models;

use App\Enums\TicketStatusEnum;
use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Ticket extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'tenant_id',
        'lead_id',
        'contact_id',
        'channel_id',
        'assigned_user_id',
        'status',
        'closed_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => TicketStatusEnum::class,
            'closed_at' => 'datetime',
        ];
    }

    /**
     * Lead associado ao ticket.
     */
    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    /**
     * Contato do ticket.
     */
    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    /**
     * Canal do ticket.
     */
    public function channel(): BelongsTo
    {
        return $this->belongsTo(Channel::class);
    }

    /**
     * Atendente responsável.
     */
    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
    }

    /**
     * Mensagens do ticket.
     */
    public function messages(): HasMany
    {
        return $this->hasMany(TicketMessage::class)->orderBy('sent_at');
    }

    /**
     * Última mensagem do ticket.
     */
    public function lastMessage()
    {
        return $this->messages()->latest('sent_at')->first();
    }

    /**
     * Verifica se o ticket está aberto.
     */
    public function isOpen(): bool
    {
        return $this->status->isOpen();
    }

    /**
     * Transfere o ticket para outro usuário.
     */
    public function transferTo(User $user): void
    {
        $this->update(['assigned_user_id' => $user->id]);
    }

    /**
     * Fecha o ticket.
     */
    public function close(): void
    {
        $this->update([
            'status' => TicketStatusEnum::CLOSED,
            'closed_at' => now(),
        ]);
    }

    /**
     * Reabre o ticket.
     */
    public function reopen(): void
    {
        $this->update([
            'status' => TicketStatusEnum::OPEN,
            'closed_at' => null,
        ]);
    }
}


