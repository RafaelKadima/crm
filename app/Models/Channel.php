<?php

namespace App\Models;

use App\Enums\ChannelTypeEnum;
use App\Enums\IaModeEnum;
use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Channel extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'tenant_id',
        'name',
        'type',
        'identifier',
        'ia_mode',
        'ia_workflow_id',
        'sdr_agent_id',
        'config',
        'is_active',
        'queue_menu_enabled',
        'queue_menu_header',
        'queue_menu_footer',
        'queue_menu_invalid_response',
        'return_timeout_hours',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => ChannelTypeEnum::class,
            'ia_mode' => IaModeEnum::class,
            'config' => 'array',
            'is_active' => 'boolean',
            'queue_menu_enabled' => 'boolean',
        ];
    }

    /**
     * Verifica se o menu de filas está habilitado.
     */
    public function hasQueueMenu(): bool
    {
        return $this->queue_menu_enabled && $this->hasQueues();
    }

    /**
     * Gera o texto completo do menu de filas.
     */
    public function getQueueMenuText(): string
    {
        if (!$this->hasQueueMenu()) {
            return '';
        }

        $queues = $this->activeQueues()->orderBy('menu_option')->get();
        
        if ($queues->isEmpty()) {
            return '';
        }

        // Header personalizado ou padrão
        $header = $this->queue_menu_header 
            ?: "Olá! Para melhor atendê-lo, escolha uma opção:";
        
        // Opções do menu
        $options = [];
        foreach ($queues as $queue) {
            $options[] = "{$queue->menu_option} - {$queue->menu_label}";
        }
        
        // Footer personalizado ou padrão
        $footer = $this->queue_menu_footer 
            ?: "Digite o número da opção desejada.";
        
        return $header . "\n\n" . implode("\n", $options) . "\n\n" . $footer;
    }

    /**
     * Mensagem para resposta inválida do menu.
     */
    public function getQueueMenuInvalidResponse(): string
    {
        return $this->queue_menu_invalid_response 
            ?: "Desculpe, não entendi. Por favor, digite apenas o número da opção desejada.";
    }

    /**
     * Leads originados deste canal.
     */
    public function leads(): HasMany
    {
        return $this->hasMany(Lead::class);
    }

    /**
     * Tickets originados deste canal.
     */
    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class);
    }

    /**
     * Filas/Setores do canal.
     */
    public function queues(): HasMany
    {
        return $this->hasMany(Queue::class)->orderBy('menu_option');
    }

    /**
     * Filas ativas do canal.
     */
    public function activeQueues(): HasMany
    {
        return $this->queues()->where('is_active', true);
    }

    /**
     * Verifica se o canal tem filas configuradas.
     */
    public function hasQueues(): bool
    {
        return $this->queues()->exists();
    }

    /**
     * SDR Agent vinculado ao canal.
     */
    public function sdrAgent(): BelongsTo
    {
        return $this->belongsTo(SdrAgent::class);
    }

    /**
     * Verifica se o canal usa IA.
     */
    public function hasIa(): bool
    {
        return $this->ia_mode->hasIa();
    }

    /**
     * Verifica se tem SDR Agent local configurado.
     */
    public function hasSdrAgent(): bool
    {
        return $this->sdr_agent_id !== null;
    }

    /**
     * Verifica se é canal de WhatsApp.
     */
    public function isWhatsApp(): bool
    {
        return $this->type === ChannelTypeEnum::WHATSAPP;
    }
}


