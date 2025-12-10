<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScheduledTask extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'lead_id',
        'appointment_id',
        'ticket_id',
        'type',
        'scheduled_for',
        'message',
        'channel',
        'status',
        'sent_at',
        'error_message',
        'retry_count',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'scheduled_for' => 'datetime',
            'sent_at' => 'datetime',
            'retry_count' => 'integer',
            'metadata' => 'array',
        ];
    }

    /**
     * Tipos de tarefa
     */
    public const TYPES = [
        'appointment_reminder' => 'Lembrete de Agendamento',
        'appointment_confirmation' => 'Confirmação de Agendamento',
        'follow_up' => 'Follow-up',
        'custom_message' => 'Mensagem Personalizada',
    ];

    /**
     * Lead
     */
    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    /**
     * Agendamento
     */
    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

    /**
     * Ticket
     */
    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }

    /**
     * Marca como enviada
     */
    public function markAsSent(): self
    {
        $this->update([
            'status' => 'sent',
            'sent_at' => now(),
        ]);
        
        return $this;
    }

    /**
     * Marca como falha
     */
    public function markAsFailed(string $error): self
    {
        $this->update([
            'status' => 'failed',
            'error_message' => $error,
            'retry_count' => $this->retry_count + 1,
        ]);
        
        return $this;
    }

    /**
     * Scope: Pendentes e prontas para executar
     */
    public function scopeReadyToExecute($query)
    {
        return $query->where('status', 'pending')
            ->where('scheduled_for', '<=', now())
            ->where('retry_count', '<', 3);
    }

    /**
     * Scope: Por tipo
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('type', $type);
    }
}

