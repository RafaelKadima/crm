<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AdCreative extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'ad_account_id',
        'name',
        'type',
        'external_url',
        'file_path',
        'file_url',
        'file_size',
        'mime_type',
        'thumbnail_url',
        'headline',
        'description',
        'primary_text',
        'call_to_action',
        'destination_url',
        'format',
        'width',
        'height',
        'duration_seconds',
        'metadata',
        'is_active',
        'status',
        'platform_media_id',
        'platform_hash',
    ];

    protected $casts = [
        'metadata' => 'array',
        'is_active' => 'boolean',
        'file_size' => 'integer',
        'width' => 'integer',
        'height' => 'integer',
        'duration_seconds' => 'integer',
    ];

    /**
     * Status do criativo.
     */
    public const STATUS_UPLOADED = 'uploaded';
    public const STATUS_PROCESSING = 'processing';
    public const STATUS_READY = 'ready';
    public const STATUS_USED = 'used';
    public const STATUS_ERROR = 'error';

    /**
     * Tipos de criativos.
     */
    public const TYPE_IMAGE = 'image';
    public const TYPE_VIDEO = 'video';
    public const TYPE_CAROUSEL = 'carousel';
    public const TYPE_COLLECTION = 'collection';

    /**
     * Call to Actions disponíveis.
     */
    public const CTA_LEARN_MORE = 'LEARN_MORE';
    public const CTA_SHOP_NOW = 'SHOP_NOW';
    public const CTA_SIGN_UP = 'SIGN_UP';
    public const CTA_CONTACT_US = 'CONTACT_US';
    public const CTA_DOWNLOAD = 'DOWNLOAD';
    public const CTA_GET_QUOTE = 'GET_QUOTE';
    public const CTA_BOOK_NOW = 'BOOK_NOW';
    public const CTA_SEND_MESSAGE = 'SEND_MESSAGE';

    /**
     * Conta de anúncio relacionada.
     */
    public function account(): BelongsTo
    {
        return $this->belongsTo(AdAccount::class, 'ad_account_id');
    }

    /**
     * Copies associadas a este criativo.
     */
    public function copies(): HasMany
    {
        return $this->hasMany(AdCopy::class);
    }

    /**
     * Anúncios usando este criativo.
     */
    public function ads(): HasMany
    {
        return $this->hasMany(AdAd::class);
    }

    /**
     * Verifica se é vídeo.
     */
    public function isVideo(): bool
    {
        return $this->type === self::TYPE_VIDEO;
    }

    /**
     * Verifica se é imagem.
     */
    public function isImage(): bool
    {
        return $this->type === self::TYPE_IMAGE;
    }

    /**
     * Scope para criativos ativos.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope por tipo.
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Scope por status.
     */
    public function scopeStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope para criativos prontos para uso.
     */
    public function scopeReady($query)
    {
        return $query->where('status', self::STATUS_READY);
    }

    /**
     * Marca como pronto.
     */
    public function markAsReady(): void
    {
        $this->update(['status' => self::STATUS_READY]);
    }

    /**
     * Marca como usado.
     */
    public function markAsUsed(): void
    {
        $this->update(['status' => self::STATUS_USED]);
    }

    /**
     * Marca como erro.
     */
    public function markAsError(): void
    {
        $this->update(['status' => self::STATUS_ERROR]);
    }

    /**
     * Atualiza com dados do Meta após upload.
     */
    public function updateMetaData(string $mediaId, ?string $hash = null): void
    {
        $this->update([
            'platform_media_id' => $mediaId,
            'platform_hash' => $hash,
            'status' => self::STATUS_READY,
        ]);
    }

    /**
     * Verifica se está pronto para uso.
     */
    public function isReady(): bool
    {
        return $this->status === self::STATUS_READY;
    }

    /**
     * Retorna URL do arquivo (prioriza file_url, depois external_url).
     */
    public function getMediaUrl(): ?string
    {
        return $this->file_url ?? $this->external_url;
    }
}

