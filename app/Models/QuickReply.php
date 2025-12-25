<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class QuickReply extends Model
{
    use HasFactory, HasUuids, BelongsToTenant, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'user_id',
        'title',
        'shortcut',
        'content',
        'variables',
        'is_active',
        'use_count',
        'order',
    ];

    protected function casts(): array
    {
        return [
            'variables' => 'array',
            'is_active' => 'boolean',
            'use_count' => 'integer',
            'order' => 'integer',
        ];
    }

    /**
     * Variáveis disponíveis para substituição
     */
    public const AVAILABLE_VARIABLES = [
        '{nome_cliente}' => 'Nome completo do cliente/lead',
        '{primeiro_nome}' => 'Primeiro nome do cliente',
        '{telefone}' => 'Telefone do cliente',
        '{email}' => 'Email do cliente',
        '{nome_atendente}' => 'Nome do usuário atual',
        '{nome_empresa}' => 'Nome da empresa (tenant)',
        '{data_hoje}' => 'Data de hoje (dd/mm/yyyy)',
        '{hora_atual}' => 'Hora atual (HH:mm)',
    ];

    /**
     * Gera shortcut a partir do título
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($quickReply) {
            if (empty($quickReply->shortcut)) {
                $quickReply->shortcut = '/' . Str::slug($quickReply->title, '_');
            }
            // Detecta variáveis no conteúdo
            $quickReply->variables = $quickReply->detectVariables();
        });

        static::updating(function ($quickReply) {
            // Atualiza variáveis se o conteúdo mudou
            if ($quickReply->isDirty('content')) {
                $quickReply->variables = $quickReply->detectVariables();
            }
        });
    }

    /**
     * Usuário dono da resposta rápida
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Detecta variáveis no conteúdo
     */
    public function detectVariables(): array
    {
        preg_match_all('/\{([a-z_]+)\}/', $this->content, $matches);
        return array_unique($matches[0]);
    }

    /**
     * Renderiza o conteúdo substituindo variáveis
     */
    public function render(array $context = []): string
    {
        $content = $this->content;

        foreach ($context as $key => $value) {
            $content = str_replace("{{$key}}", $value ?? '', $content);
        }

        return $content;
    }

    /**
     * Incrementa contador de uso
     */
    public function incrementUseCount(): void
    {
        $this->increment('use_count');
    }

    /**
     * Scope: Ativas
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope: Do usuário atual
     */
    public function scopeForCurrentUser($query)
    {
        return $query->where('user_id', auth()->id());
    }

    /**
     * Scope: Busca por shortcut ou título
     */
    public function scopeSearch($query, string $search)
    {
        return $query->where(function ($q) use ($search) {
            $q->where('shortcut', 'ilike', "%{$search}%")
                ->orWhere('title', 'ilike', "%{$search}%");
        });
    }
}
