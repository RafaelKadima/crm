<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdCopy extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'ad_creative_id',
        'name',
        'primary_text',
        'headline',
        'description',
        'call_to_action',
        'link_url',
        'status',
        'hook_type',
        'estimated_effectiveness',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
        'estimated_effectiveness' => 'integer',
    ];

    /**
     * Status da copy.
     */
    public const STATUS_DRAFT = 'draft';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_USED = 'used';

    /**
     * Tipos de hooks.
     */
    public const HOOK_BENEFIT = 'benefit';
    public const HOOK_CURIOSITY = 'curiosity';
    public const HOOK_URGENCY = 'urgency';
    public const HOOK_SOCIAL_PROOF = 'social_proof';
    public const HOOK_QUESTION = 'question';
    public const HOOK_AUTHORITY = 'authority';

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
    public const CTA_GET_OFFER = 'GET_OFFER';

    /**
     * Criativo associado.
     */
    public function creative(): BelongsTo
    {
        return $this->belongsTo(AdCreative::class, 'ad_creative_id');
    }

    /**
     * Scope por status.
     */
    public function scopeStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope para copies aprovadas.
     */
    public function scopeApproved($query)
    {
        return $query->where('status', self::STATUS_APPROVED);
    }

    /**
     * Scope para copies disponíveis (draft ou approved).
     */
    public function scopeAvailable($query)
    {
        return $query->whereIn('status', [self::STATUS_DRAFT, self::STATUS_APPROVED]);
    }

    /**
     * Scope por tipo de hook.
     */
    public function scopeHookType($query, string $hookType)
    {
        return $query->where('hook_type', $hookType);
    }

    /**
     * Aprova a copy.
     */
    public function approve(): void
    {
        $this->update(['status' => self::STATUS_APPROVED]);
    }

    /**
     * Marca como usada.
     */
    public function markAsUsed(): void
    {
        $this->update(['status' => self::STATUS_USED]);
    }

    /**
     * Verifica se está aprovada.
     */
    public function isApproved(): bool
    {
        return $this->status === self::STATUS_APPROVED;
    }

    /**
     * Retorna array formatado para uso no Meta Ads.
     */
    public function toMetaFormat(): array
    {
        return [
            'primary_text' => $this->primary_text,
            'headline' => $this->headline,
            'description' => $this->description,
            'call_to_action' => $this->call_to_action,
            'link_url' => $this->link_url,
        ];
    }

    /**
     * Lista de CTAs disponíveis.
     */
    public static function getAvailableCtas(): array
    {
        return [
            self::CTA_LEARN_MORE => 'Saiba Mais',
            self::CTA_SHOP_NOW => 'Compre Agora',
            self::CTA_SIGN_UP => 'Cadastre-se',
            self::CTA_CONTACT_US => 'Fale Conosco',
            self::CTA_DOWNLOAD => 'Baixar',
            self::CTA_GET_QUOTE => 'Solicitar Orçamento',
            self::CTA_BOOK_NOW => 'Agende Agora',
            self::CTA_SEND_MESSAGE => 'Enviar Mensagem',
            self::CTA_GET_OFFER => 'Ver Oferta',
        ];
    }

    /**
     * Lista de tipos de hooks disponíveis.
     */
    public static function getAvailableHookTypes(): array
    {
        return [
            self::HOOK_BENEFIT => 'Benefício',
            self::HOOK_CURIOSITY => 'Curiosidade',
            self::HOOK_URGENCY => 'Urgência',
            self::HOOK_SOCIAL_PROOF => 'Prova Social',
            self::HOOK_QUESTION => 'Pergunta',
            self::HOOK_AUTHORITY => 'Autoridade',
        ];
    }
}

