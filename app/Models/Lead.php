<?php

namespace App\Models;

use App\Enums\IaModeEnum;
use App\Enums\InteractionSourceEnum;
use App\Enums\LeadStatusEnum;
use App\Events\LeadStageChanged;
use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
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
        'queue_id',
        'owner_id',
        'status',
        'value',
        'expected_close_date',
        'ia_mode_at_creation',
        'last_message_at',
        'last_interaction_source',
        'custom_fields',
        'temperature',
        'score',
        'needs_human_attention',
        'human_attention_reason',
        'human_attention_priority',
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
            'custom_fields' => 'array',
            'score' => 'integer',
            'needs_human_attention' => 'boolean',
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
     * Fila/Setor do lead.
     */
    public function queue(): BelongsTo
    {
        return $this->belongsTo(Queue::class);
    }

    /**
     * Carteirizações por fila (um lead pode ter donos diferentes em filas diferentes).
     */
    public function queueOwners(): HasMany
    {
        return $this->hasMany(LeadQueueOwner::class);
    }

    /**
     * Retorna o dono do lead em uma fila específica.
     */
    public function getOwnerInQueue(Queue $queue): ?User
    {
        return LeadQueueOwner::getOwnerForQueue($this, $queue);
    }

    /**
     * Verifica se o lead tem dono em uma fila específica.
     */
    public function hasOwnerInQueue(Queue $queue): bool
    {
        return LeadQueueOwner::hasOwnerInQueue($this, $queue);
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
     * Produtos de interesse do lead.
     */
    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'lead_products')
            ->withPivot(['quantity', 'unit_price', 'notes'])
            ->withTimestamps();
    }

    /**
     * Dados do cliente (para fechamento).
     */
    public function customerData(): HasOne
    {
        return $this->hasOne(CustomerData::class);
    }

    /**
     * Agendamentos do lead.
     */
    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class)->orderByDesc('scheduled_at');
    }

    /**
     * Próximo agendamento.
     */
    public function nextAppointment(): HasOne
    {
        return $this->hasOne(Appointment::class)
            ->whereIn('status', ['scheduled', 'confirmed'])
            ->where('scheduled_at', '>', now())
            ->orderBy('scheduled_at');
    }

    /**
     * Atividades de etapa do lead.
     */
    public function stageActivities(): HasMany
    {
        return $this->hasMany(DealStageActivity::class)->orderBy('created_at');
    }

    /**
     * Atividades da etapa atual.
     */
    public function currentStageActivities(): HasMany
    {
        return $this->hasMany(DealStageActivity::class)
            ->where('stage_id', $this->stage_id)
            ->orderBy('created_at');
    }

    /**
     * Valor total dos produtos de interesse.
     */
    public function getProductsTotalAttribute(): float
    {
        return $this->products->sum(function ($product) {
            return $product->pivot->unit_price * $product->pivot->quantity;
        });
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
    public function moveToStage(PipelineStage $newStage, ?User $changedBy = null, string $source = 'user'): void
    {
        $oldStage = $this->stage;
        
        // Só dispara evento se realmente mudou de estágio
        if ($oldStage && $oldStage->id !== $newStage->id) {
            $this->update(['stage_id' => $newStage->id]);
            
            // Dispara evento para GTM e outras integrações
            LeadStageChanged::dispatch($this, $oldStage, $newStage, $changedBy, $source);
        } elseif (!$oldStage) {
            // Lead novo, só atualiza sem disparar evento
            $this->update(['stage_id' => $newStage->id]);
        }
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


