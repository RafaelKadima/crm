<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

/**
 * Model para anexos de mensagens de tickets.
 * 
 * Suporta upload direto para S3/R2/MinIO via presigned URLs,
 * com fallback para upload tradicional em storage local.
 */
class TicketMessageAttachment extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'tenant_id',
        'ticket_id',
        'ticket_message_id',
        'file_name',
        'file_path',
        'file_type',
        'file_size',
        'mime_type',
        'storage_disk',
        'status',
        'presigned_expires_at',
        'metadata',
    ];

    /**
     * The attributes that should be cast.
     */
    protected function casts(): array
    {
        return [
            'file_size' => 'integer',
            'metadata' => 'array',
            'presigned_expires_at' => 'datetime',
        ];
    }

    // ==================
    // RELACIONAMENTOS
    // ==================

    /**
     * Ticket associado
     */
    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }

    /**
     * Mensagem associada (opcional)
     */
    public function message(): BelongsTo
    {
        return $this->belongsTo(TicketMessage::class, 'ticket_message_id');
    }

    // ==================
    // ACCESSORS
    // ==================

    /**
     * URL pública/temporária do arquivo
     */
    public function getUrlAttribute(): ?string
    {
        if ($this->status !== 'confirmed') {
            return null;
        }

        try {
            $disk = Storage::disk($this->storage_disk);
            
            if (config("filesystems.disks.{$this->storage_disk}.driver") === 's3') {
                return $disk->temporaryUrl($this->file_path, now()->addHour());
            }

            return $disk->url($this->file_path);
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Tamanho formatado (KB, MB, GB)
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
     * Extensão do arquivo
     */
    public function getExtensionAttribute(): string
    {
        return pathinfo($this->file_name, PATHINFO_EXTENSION);
    }

    /**
     * Verifica se é imagem
     */
    public function getIsImageAttribute(): bool
    {
        return $this->file_type === 'image';
    }

    /**
     * Verifica se é vídeo
     */
    public function getIsVideoAttribute(): bool
    {
        return $this->file_type === 'video';
    }

    /**
     * Verifica se é áudio
     */
    public function getIsAudioAttribute(): bool
    {
        return $this->file_type === 'audio';
    }

    /**
     * Verifica se é documento
     */
    public function getIsDocumentAttribute(): bool
    {
        return $this->file_type === 'document';
    }

    // ==================
    // SCOPES
    // ==================

    /**
     * Apenas anexos confirmados
     */
    public function scopeConfirmed($query)
    {
        return $query->where('status', 'confirmed');
    }

    /**
     * Anexos pendentes
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Por tipo de arquivo
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('file_type', $type);
    }

    // ==================
    // MÉTODOS
    // ==================

    /**
     * Verifica se o presigned URL expirou
     */
    public function isExpired(): bool
    {
        return $this->presigned_expires_at && $this->presigned_expires_at->isPast();
    }

    /**
     * Verifica se o arquivo existe no storage
     */
    public function existsInStorage(): bool
    {
        try {
            return Storage::disk($this->storage_disk)->exists($this->file_path);
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Remove o arquivo do storage
     */
    public function deleteFromStorage(): bool
    {
        try {
            $disk = Storage::disk($this->storage_disk);
            
            if ($disk->exists($this->file_path)) {
                return $disk->delete($this->file_path);
            }

            return true;
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Retorna ícone baseado no tipo
     */
    public function getIconName(): string
    {
        return match($this->file_type) {
            'image' => 'image',
            'video' => 'video',
            'audio' => 'music',
            'document' => 'file-text',
            default => 'file',
        };
    }
}

