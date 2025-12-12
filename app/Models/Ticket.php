<?php

namespace App\Models;

use App\Enums\TicketStatusEnum;
use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

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
        'ia_enabled',
        'ia_disabled_by',
        'ia_disabled_at',
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
            'ia_enabled' => 'boolean',
            'ia_disabled_at' => 'datetime',
        ];
    }

    /**
     * Usuário que desligou a IA.
     */
    public function iaDisabledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'ia_disabled_by');
    }

    /**
     * Verifica se a IA está habilitada para este ticket.
     */
    public function hasIaEnabled(): bool
    {
        return $this->ia_enabled ?? true;
    }

    /**
     * Habilita a IA para este ticket.
     */
    public function enableIa(): void
    {
        $this->update([
            'ia_enabled' => true,
            'ia_disabled_by' => null,
            'ia_disabled_at' => null,
        ]);
    }

    /**
     * Desabilita a IA para este ticket.
     * O vendedor assume o atendimento, mas a IA continua aprendendo.
     */
    public function disableIa(?User $user = null): void
    {
        $this->update([
            'ia_enabled' => false,
            'ia_disabled_by' => $user?->id,
            'ia_disabled_at' => now(),
        ]);
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
     * Agente SDR associado.
     * Prioridade:
     * 1. Agente do Pipeline do Lead
     * 2. Agente do Canal
     */
    public function sdrAgent()
    {
        // 1. Primeiro verifica se o lead tem um pipeline com agente SDR
        if ($this->lead && $this->lead->pipeline && $this->lead->pipeline->sdr_agent_id) {
            return SdrAgent::find($this->lead->pipeline->sdr_agent_id);
        }

        // 2. Se não, verifica o canal
        if ($this->channel && $this->channel->sdr_agent_id) {
            return SdrAgent::find($this->channel->sdr_agent_id);
        }

        return null;
    }

    /**
     * Accessor para carregar sdrAgent como relação.
     */
    public function getSdrAgentAttribute()
    {
        return $this->sdrAgent();
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
     * Última mensagem do ticket (para eager loading).
     */
    public function lastMessage(): HasOne
    {
        return $this->hasOne(TicketMessage::class)->latestOfMany('sent_at');
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


