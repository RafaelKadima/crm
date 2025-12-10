<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Appointment extends Model
{
    use HasFactory, HasUuids, BelongsToTenant, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'lead_id',
        'contact_id',
        'user_id',
        'scheduled_by',
        'type',
        'scheduled_at',
        'ends_at',
        'duration_minutes',
        'status',
        'title',
        'description',
        'location',
        'meeting_link',
        'reminder_sent',
        'reminder_sent_at',
        'confirmation_received',
        'confirmed_at',
        'notes',
        'outcome',
        'rescheduled_from',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'scheduled_at' => 'datetime',
            'ends_at' => 'datetime',
            'duration_minutes' => 'integer',
            'reminder_sent' => 'boolean',
            'reminder_sent_at' => 'datetime',
            'confirmation_received' => 'boolean',
            'confirmed_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    /**
     * Tipos de agendamento
     */
    public const TYPES = [
        'meeting' => 'Reunião',
        'visit' => 'Visita à Loja',
        'demo' => 'Demonstração',
        'follow_up' => 'Follow-up',
        'other' => 'Outro',
    ];

    /**
     * Status do agendamento
     */
    public const STATUSES = [
        'scheduled' => 'Agendado',
        'confirmed' => 'Confirmado',
        'completed' => 'Realizado',
        'cancelled' => 'Cancelado',
        'no_show' => 'Não Compareceu',
        'rescheduled' => 'Reagendado',
    ];

    /**
     * Lead
     */
    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    /**
     * Contato
     */
    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    /**
     * Responsável (vendedor)
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Quem agendou
     */
    public function scheduledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'scheduled_by');
    }

    /**
     * Agendamento original (se reagendado)
     */
    public function originalAppointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class, 'rescheduled_from');
    }

    /**
     * Reagendamentos deste appointment
     */
    public function rescheduledAppointments(): HasMany
    {
        return $this->hasMany(Appointment::class, 'rescheduled_from');
    }

    /**
     * Tarefas agendadas
     */
    public function scheduledTasks(): HasMany
    {
        return $this->hasMany(ScheduledTask::class);
    }

    /**
     * Nome do tipo
     */
    public function getTypeNameAttribute(): string
    {
        return self::TYPES[$this->type] ?? $this->type;
    }

    /**
     * Nome do status
     */
    public function getStatusNameAttribute(): string
    {
        return self::STATUSES[$this->status] ?? $this->status;
    }

    /**
     * Verifica se está pendente (aguardando confirmação)
     */
    public function getIsPendingAttribute(): bool
    {
        return $this->status === 'scheduled' && !$this->confirmation_received;
    }

    /**
     * Verifica se pode ser cancelado
     */
    public function getCanBeCancelledAttribute(): bool
    {
        return in_array($this->status, ['scheduled', 'confirmed']);
    }

    /**
     * Verifica se pode ser confirmado
     */
    public function getCanBeConfirmedAttribute(): bool
    {
        return $this->status === 'scheduled' && !$this->confirmation_received;
    }

    /**
     * Confirma o agendamento
     */
    public function confirm(): self
    {
        $this->update([
            'status' => 'confirmed',
            'confirmation_received' => true,
            'confirmed_at' => now(),
        ]);
        
        return $this;
    }

    /**
     * Cancela o agendamento
     */
    public function cancel(string $reason = null): self
    {
        $this->update([
            'status' => 'cancelled',
            'notes' => $reason ? ($this->notes . "\n\nMotivo do cancelamento: " . $reason) : $this->notes,
        ]);
        
        // Cancela tarefas agendadas
        $this->scheduledTasks()->where('status', 'pending')->update(['status' => 'cancelled']);
        
        return $this;
    }

    /**
     * Marca como concluído
     */
    public function complete(string $outcome = null): self
    {
        $this->update([
            'status' => 'completed',
            'outcome' => $outcome,
        ]);
        
        return $this;
    }

    /**
     * Marca como no-show
     */
    public function markAsNoShow(): self
    {
        $this->update([
            'status' => 'no_show',
        ]);
        
        return $this;
    }

    /**
     * Reagenda
     */
    public function reschedule(\DateTime $newDateTime, int $duration = null): Appointment
    {
        // Marca original como reagendado
        $this->update(['status' => 'rescheduled']);
        
        // Cancela tarefas pendentes
        $this->scheduledTasks()->where('status', 'pending')->update(['status' => 'cancelled']);
        
        // Cria novo agendamento
        return static::create([
            'tenant_id' => $this->tenant_id,
            'lead_id' => $this->lead_id,
            'contact_id' => $this->contact_id,
            'user_id' => $this->user_id,
            'scheduled_by' => $this->scheduled_by,
            'type' => $this->type,
            'scheduled_at' => $newDateTime,
            'duration_minutes' => $duration ?? $this->duration_minutes,
            'status' => 'scheduled',
            'title' => $this->title,
            'description' => $this->description,
            'location' => $this->location,
            'meeting_link' => $this->meeting_link,
            'rescheduled_from' => $this->id,
        ]);
    }

    /**
     * Scope: Por status
     */
    public function scopeStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope: Próximos (futuros)
     */
    public function scopeUpcoming($query)
    {
        return $query->where('scheduled_at', '>', now())
            ->whereIn('status', ['scheduled', 'confirmed'])
            ->orderBy('scheduled_at');
    }

    /**
     * Scope: Hoje
     */
    public function scopeToday($query)
    {
        return $query->whereDate('scheduled_at', today());
    }

    /**
     * Scope: Precisando de lembrete
     */
    public function scopeNeedsReminder($query)
    {
        return $query->where('reminder_sent', false)
            ->whereIn('status', ['scheduled', 'confirmed'])
            ->where('scheduled_at', '>', now())
            ->where('scheduled_at', '<=', now()->addDay());
    }
}

