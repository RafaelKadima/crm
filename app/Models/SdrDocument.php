<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class SdrDocument extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'sdr_agent_id',
        'uploaded_by',
        'name',
        'original_filename',
        'file_path',
        'file_type',
        'file_size',
        'content',
        'chunks',
        'embeddings_metadata',
        'status',
        'error_message',
        'processed_at',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'chunks' => 'array',
            'embeddings_metadata' => 'array',
            'file_size' => 'integer',
            'processed_at' => 'datetime',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Agente SDR
     */
    public function agent(): BelongsTo
    {
        return $this->belongsTo(SdrAgent::class, 'sdr_agent_id');
    }

    /**
     * Usuário que fez upload
     */
    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    /**
     * URL do arquivo
     */
    public function getFileUrlAttribute(): string
    {
        return Storage::url($this->file_path);
    }

    /**
     * Tamanho formatado
     */
    public function getFormattedSizeAttribute(): string
    {
        $bytes = $this->file_size;
        $units = ['B', 'KB', 'MB', 'GB'];
        
        for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
            $bytes /= 1024;
        }
        
        return round($bytes, 2) . ' ' . $units[$i];
    }

    /**
     * Verifica se está processado
     */
    public function isProcessed(): bool
    {
        return $this->status === 'completed';
    }

    /**
     * Verifica se está pendente
     */
    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    /**
     * Verifica se falhou
     */
    public function hasFailed(): bool
    {
        return $this->status === 'failed';
    }

    /**
     * Marca como processando
     */
    public function markAsProcessing(): void
    {
        $this->update(['status' => 'processing']);
    }

    /**
     * Marca como completo
     */
    public function markAsCompleted(string $content, ?array $chunks = null): void
    {
        $this->update([
            'status' => 'completed',
            'content' => $content,
            'chunks' => $chunks,
            'processed_at' => now(),
            'error_message' => null,
        ]);
    }

    /**
     * Marca como falha
     */
    public function markAsFailed(string $error): void
    {
        $this->update([
            'status' => 'failed',
            'error_message' => $error,
        ]);
    }

    /**
     * Scope: Ativos
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope: Processados
     */
    public function scopeProcessed($query)
    {
        return $query->where('status', 'completed');
    }
}

