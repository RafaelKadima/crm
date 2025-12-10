<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AdCreative extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'name',
        'type',
        'external_url',
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
    ];

    protected $casts = [
        'metadata' => 'array',
        'is_active' => 'boolean',
    ];

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
}

