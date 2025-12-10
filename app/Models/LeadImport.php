<?php

namespace App\Models;

use App\Enums\LeadImportStatusEnum;
use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LeadImport extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'user_id',
        'pipeline_id',
        'stage_id',
        'filename',
        'status',
        'total_rows',
        'processed_rows',
        'success_count',
        'error_count',
        'errors',
        'settings',
        'started_at',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => LeadImportStatusEnum::class,
            'errors' => 'array',
            'settings' => 'array',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    /**
     * Usuário que realizou a importação.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Pipeline de destino.
     */
    public function pipeline(): BelongsTo
    {
        return $this->belongsTo(Pipeline::class);
    }

    /**
     * Estágio inicial.
     */
    public function stage(): BelongsTo
    {
        return $this->belongsTo(PipelineStage::class, 'stage_id');
    }

    /**
     * Calcula o progresso da importação.
     */
    public function getProgressAttribute(): int
    {
        if ($this->total_rows === 0) {
            return 0;
        }

        return (int) round(($this->processed_rows / $this->total_rows) * 100);
    }

    /**
     * Verifica se a importação está em andamento.
     */
    public function isProcessing(): bool
    {
        return $this->status === LeadImportStatusEnum::PROCESSING;
    }

    /**
     * Verifica se a importação foi concluída.
     */
    public function isCompleted(): bool
    {
        return $this->status === LeadImportStatusEnum::COMPLETED;
    }

    /**
     * Marca como processando.
     */
    public function markAsProcessing(): void
    {
        $this->update([
            'status' => LeadImportStatusEnum::PROCESSING,
            'started_at' => now(),
        ]);
    }

    /**
     * Marca como concluída.
     */
    public function markAsCompleted(): void
    {
        $this->update([
            'status' => LeadImportStatusEnum::COMPLETED,
            'completed_at' => now(),
        ]);
    }

    /**
     * Marca como falha.
     */
    public function markAsFailed(array $errors = []): void
    {
        $this->update([
            'status' => LeadImportStatusEnum::FAILED,
            'errors' => array_merge($this->errors ?? [], $errors),
            'completed_at' => now(),
        ]);
    }

    /**
     * Incrementa contadores.
     */
    public function incrementProcessed(bool $success = true): void
    {
        $this->increment('processed_rows');

        if ($success) {
            $this->increment('success_count');
        } else {
            $this->increment('error_count');
        }
    }

    /**
     * Adiciona um erro.
     */
    public function addError(int $row, string $message): void
    {
        $errors = $this->errors ?? [];
        $errors[] = [
            'row' => $row,
            'message' => $message,
        ];
        $this->update(['errors' => $errors]);
    }
}

