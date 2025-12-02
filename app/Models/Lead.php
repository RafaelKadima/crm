<?php

namespace App\Models;

use App\Enums\IaModeEnum;
use App\Enums\InteractionSourceEnum;
use App\Enums\LeadStatusEnum;
use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Lead extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'tenant_id',
        'contact_id',
        'pipeline_id',
        'stage_id',
        'channel_id',
        'owner_id',
        'status',
        'value',
        'expected_close_date',
        'ia_mode_at_creation',
        'last_message_at',
        'last_interaction_source',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => LeadStatusEnum::class,
            'value' => 'decimal:2',
            'expected_close_date' => 'date',
            'ia_mode_at_creation' => IaModeEnum::class,
            'last_message_at' => 'datetime',
            'last_interaction_source' => InteractionSourceEnum::class,
        ];
    }

    /**
     * Contato do lead.
     */
    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    /**
     * Pipeline do lead.
     */
    public function pipeline(): BelongsTo
    {
        return $this->belongsTo(Pipeline::class);
    }

    /**
     * Estágio atual do lead.
     */
    public function stage(): BelongsTo
    {
        return $this->belongsTo(PipelineStage::class, 'stage_id');
    }

    /**
     * Canal de origem do lead.
     */
    public function channel(): BelongsTo
    {
        return $this->belongsTo(Channel::class);
    }

    /**
     * Vendedor responsável.
     */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    /**
     * Tickets do lead.
     */
    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class);
    }

    /**
     * Ticket ativo do lead.
     */
    public function activeTicket(): HasOne
    {
        return $this->hasOne(Ticket::class)->whereNotIn('status', ['closed'])->latest();
    }

    /**
     * Tarefas do lead.
     */
    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    /**
     * Atividades do lead.
     */
    public function activities(): HasMany
    {
        return $this->hasMany(LeadActivity::class)->orderByDesc('created_at');
    }

    /**
     * Verifica se o lead está aberto.
     */
    public function isOpen(): bool
    {
        return $this->status->isOpen();
    }

    /**
     * Verifica se o lead está fechado.
     */
    public function isClosed(): bool
    {
        return $this->status->isClosed();
    }

    /**
     * Move o lead para outro estágio.
     */
    public function moveToStage(PipelineStage $stage): void
    {
        $this->update(['stage_id' => $stage->id]);
    }

    /**
     * Atribui o lead a um vendedor.
     */
    public function assignTo(User $user): void
    {
        $this->update(['owner_id' => $user->id]);
        
        // Também atribui o contato ao vendedor se não tiver dono
        if (!$this->contact->owner_id) {
            $this->contact->update(['owner_id' => $user->id]);
        }
    }

    /**
     * Marca o lead como ganho.
     */
    public function markAsWon(?float $value = null): void
    {
        $data = ['status' => LeadStatusEnum::WON];
        if ($value !== null) {
            $data['value'] = $value;
        }
        $this->update($data);
    }

    /**
     * Marca o lead como perdido.
     */
    public function markAsLost(): void
    {
        $this->update(['status' => LeadStatusEnum::LOST]);
    }

    /**
     * Atualiza a última interação.
     */
    public function updateLastInteraction(InteractionSourceEnum $source): void
    {
        $this->update([
            'last_message_at' => now(),
            'last_interaction_source' => $source,
        ]);
    }
}


