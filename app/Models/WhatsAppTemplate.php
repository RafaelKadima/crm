<?php

namespace App\Models;

use App\Enums\WhatsAppTemplateCategoryEnum;
use App\Enums\WhatsAppTemplateStatusEnum;
use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Model para templates do WhatsApp Business API.
 * 
 * Permite criar, listar e gerenciar templates diretamente no sistema,
 * sem precisar acessar o Meta Business.
 */
class WhatsAppTemplate extends Model
{
    use HasFactory, HasUuids, BelongsToTenant, SoftDeletes;

    /**
     * Nome da tabela no banco de dados.
     * Necessário porque "WhatsAppTemplate" seria convertido para "whats_app_templates".
     */
    protected $table = 'whatsapp_templates';

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'tenant_id',
        'channel_id',
        'name',
        'category',
        'language',
        'header_type',
        'header_text',
        'header_handle',
        'body_text',
        'footer_text',
        'buttons',
        'meta_template_id',
        'status',
        'rejection_reason',
        'request_payload',
        'response_payload',
        'is_active',
        'submitted_at',
        'approved_at',
    ];

    /**
     * The attributes that should be cast.
     */
    protected function casts(): array
    {
        return [
            'category' => WhatsAppTemplateCategoryEnum::class,
            'status' => WhatsAppTemplateStatusEnum::class,
            'buttons' => 'array',
            'request_payload' => 'array',
            'response_payload' => 'array',
            'is_active' => 'boolean',
            'submitted_at' => 'datetime',
            'approved_at' => 'datetime',
        ];
    }

    // ==================
    // RELACIONAMENTOS
    // ==================

    /**
     * Canal do WhatsApp associado ao template.
     */
    public function channel(): BelongsTo
    {
        return $this->belongsTo(Channel::class);
    }

    // ==================
    // SCOPES
    // ==================

    /**
     * Scope para filtrar templates aprovados.
     */
    public function scopeApproved($query)
    {
        return $query->where('status', WhatsAppTemplateStatusEnum::APPROVED);
    }

    /**
     * Scope para filtrar templates pendentes.
     */
    public function scopePending($query)
    {
        return $query->where('status', WhatsAppTemplateStatusEnum::PENDING);
    }

    /**
     * Scope para filtrar por categoria.
     */
    public function scopeByCategory($query, WhatsAppTemplateCategoryEnum $category)
    {
        return $query->where('category', $category);
    }

    /**
     * Scope para filtrar por canal.
     */
    public function scopeByChannel($query, string $channelId)
    {
        return $query->where('channel_id', $channelId);
    }

    /**
     * Scope para templates ativos.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    // ==================
    // MÉTODOS
    // ==================

    /**
     * Verifica se o template pode ser usado para envio.
     */
    public function canSend(): bool
    {
        return $this->is_active && $this->status->canSend();
    }

    /**
     * Conta o número de variáveis/placeholders no body.
     */
    public function getVariableCount(): int
    {
        preg_match_all('/\{\{(\d+)\}\}/', $this->body_text, $matches);
        return count(array_unique($matches[1]));
    }

    /**
     * Retorna os índices das variáveis no body.
     */
    public function getVariableIndices(): array
    {
        preg_match_all('/\{\{(\d+)\}\}/', $this->body_text, $matches);
        return array_map('intval', array_unique($matches[1]));
    }

    /**
     * Substitui variáveis no body por valores reais.
     */
    public function renderBody(array $variables): string
    {
        $body = $this->body_text;
        
        foreach ($variables as $index => $value) {
            $body = str_replace("{{{$index}}}", $value, $body);
        }
        
        return $body;
    }

    /**
     * Gera o payload JSON para a API do Meta.
     */
    public function toMetaPayload(): array
    {
        $payload = [
            'name' => $this->name,
            'language' => $this->language,
            'category' => $this->category->value,
            'components' => [],
        ];

        // Header component
        if ($this->header_type && $this->header_type !== 'NONE') {
            $header = [
                'type' => 'HEADER',
                'format' => $this->header_type,
            ];

            if ($this->header_type === 'TEXT' && $this->header_text) {
                $header['text'] = $this->header_text;
            } elseif ($this->header_handle) {
                $header['example'] = [
                    'header_handle' => [$this->header_handle],
                ];
            }

            $payload['components'][] = $header;
        }

        // Body component (obrigatório)
        $bodyComponent = [
            'type' => 'BODY',
            'text' => $this->body_text,
        ];

        // Adiciona exemplos para variáveis
        $variableCount = $this->getVariableCount();
        if ($variableCount > 0) {
            $examples = array_fill(0, $variableCount, 'exemplo');
            $bodyComponent['example'] = [
                'body_text' => [$examples],
            ];
        }

        $payload['components'][] = $bodyComponent;

        // Footer component
        if ($this->footer_text) {
            $payload['components'][] = [
                'type' => 'FOOTER',
                'text' => $this->footer_text,
            ];
        }

        // Buttons component
        if ($this->buttons && count($this->buttons) > 0) {
            $payload['components'][] = [
                'type' => 'BUTTONS',
                'buttons' => $this->buttons,
            ];
        }

        return $payload;
    }

    /**
     * Atualiza o status baseado na resposta do Meta.
     */
    public function updateFromMetaResponse(array $response): void
    {
        $this->meta_template_id = $response['id'] ?? $this->meta_template_id;
        
        if (isset($response['status'])) {
            $this->status = WhatsAppTemplateStatusEnum::tryFrom($response['status']) 
                ?? $this->status;
        }

        if ($this->status === WhatsAppTemplateStatusEnum::APPROVED && !$this->approved_at) {
            $this->approved_at = now();
        }

        if (isset($response['rejected_reason'])) {
            $this->rejection_reason = $response['rejected_reason'];
        }

        $this->response_payload = $response;
        $this->save();
    }

    /**
     * Marca como submetido ao Meta.
     */
    public function markAsSubmitted(array $requestPayload): void
    {
        $this->request_payload = $requestPayload;
        $this->submitted_at = now();
        $this->status = WhatsAppTemplateStatusEnum::PENDING;
        $this->save();
    }
}

