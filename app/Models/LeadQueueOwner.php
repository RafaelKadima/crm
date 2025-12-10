<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Carteirização por Fila
 * 
 * Um lead pode ter donos diferentes em filas diferentes.
 * Ex: João → SAC (Ana) | Comercial (Carlos)
 */
class LeadQueueOwner extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'lead_id',
        'queue_id',
        'user_id',
        'assigned_at',
    ];

    protected function casts(): array
    {
        return [
            'assigned_at' => 'datetime',
        ];
    }

    // ==================
    // RELACIONAMENTOS
    // ==================

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function queue(): BelongsTo
    {
        return $this->belongsTo(Queue::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // ==================
    // MÉTODOS ESTÁTICOS
    // ==================

    /**
     * Busca o dono de um lead em uma fila específica.
     */
    public static function getOwnerForQueue(Lead $lead, Queue $queue): ?User
    {
        $ownership = static::where('lead_id', $lead->id)
            ->where('queue_id', $queue->id)
            ->first();

        return $ownership?->user;
    }

    /**
     * Cria ou atualiza a carteirização de um lead em uma fila.
     */
    public static function setOwnerForQueue(Lead $lead, Queue $queue, User $user): self
    {
        return static::updateOrCreate(
            [
                'lead_id' => $lead->id,
                'queue_id' => $queue->id,
            ],
            [
                'tenant_id' => $lead->tenant_id,
                'user_id' => $user->id,
                'assigned_at' => now(),
            ]
        );
    }

    /**
     * Remove a carteirização de um lead em uma fila.
     */
    public static function removeOwnerForQueue(Lead $lead, Queue $queue): bool
    {
        return static::where('lead_id', $lead->id)
            ->where('queue_id', $queue->id)
            ->delete() > 0;
    }

    /**
     * Lista todas as carteirizações de um lead.
     */
    public static function getLeadOwnerships(Lead $lead): array
    {
        return static::where('lead_id', $lead->id)
            ->with(['queue:id,name', 'user:id,name'])
            ->get()
            ->map(fn($o) => [
                'queue_id' => $o->queue_id,
                'queue_name' => $o->queue?->name,
                'user_id' => $o->user_id,
                'user_name' => $o->user?->name,
                'assigned_at' => $o->assigned_at,
            ])
            ->toArray();
    }
}
