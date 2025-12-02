<?php

namespace App\Models;

use App\Enums\TaskStatusEnum;
use App\Enums\TaskTypeEnum;
use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Task extends Model
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
        'assigned_user_id',
        'type',
        'title',
        'description',
        'due_at',
        'status',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => TaskTypeEnum::class,
            'status' => TaskStatusEnum::class,
            'due_at' => 'datetime',
        ];
    }

    /**
     * Lead associado à tarefa.
     */
    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    /**
     * Contato associado à tarefa.
     */
    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    /**
     * Usuário responsável pela tarefa.
     */
    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
    }

    /**
     * Verifica se a tarefa está pendente.
     */
    public function isPending(): bool
    {
        return $this->status === TaskStatusEnum::PENDING;
    }

    /**
     * Verifica se a tarefa está atrasada.
     */
    public function isOverdue(): bool
    {
        return $this->isPending() && $this->due_at->isPast();
    }

    /**
     * Marca a tarefa como concluída.
     */
    public function complete(): void
    {
        $this->update(['status' => TaskStatusEnum::DONE]);
    }

    /**
     * Cancela a tarefa.
     */
    public function cancel(): void
    {
        $this->update(['status' => TaskStatusEnum::CANCELED]);
    }

    /**
     * Escopo para tarefas pendentes.
     */
    public function scopePending($query)
    {
        return $query->where('status', TaskStatusEnum::PENDING);
    }

    /**
     * Escopo para tarefas de hoje.
     */
    public function scopeToday($query)
    {
        return $query->whereDate('due_at', today());
    }

    /**
     * Escopo para tarefas atrasadas.
     */
    public function scopeOverdue($query)
    {
        return $query->pending()->where('due_at', '<', now());
    }
}


