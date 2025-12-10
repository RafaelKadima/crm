<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Regras de escalação para transferir conversa para humano.
 * Define quando o agente deve parar e chamar um atendente.
 */
class AgentEscalationRule extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    // Tipos de condição disponíveis
    public const CONDITION_KEYWORD = 'keyword';           // Palavras específicas
    public const CONDITION_SENTIMENT = 'sentiment';       // Sentimento negativo
    public const CONDITION_TIME_IN_STAGE = 'time_in_stage'; // Tempo no estágio
    public const CONDITION_EXPLICIT_REQUEST = 'explicit_request'; // "quero falar com atendente"
    public const CONDITION_MESSAGE_COUNT = 'message_count'; // Número de mensagens sem resolução
    public const CONDITION_NO_RESPONSE = 'no_response';   // Agente não soube responder

    // Ações disponíveis
    public const ACTION_PAUSE_AGENT = 'pause_agent';      // Pausa o agente para esse ticket
    public const ACTION_NOTIFY_OWNER = 'notify_owner';    // Notifica o dono do lead
    public const ACTION_TRANSFER_TICKET = 'transfer_ticket'; // Transfere o ticket
    public const ACTION_CREATE_TASK = 'create_task';      // Cria tarefa para follow-up

    protected $fillable = [
        'tenant_id',
        'sdr_agent_id',
        'condition_type',
        'condition_value',
        'action',
        'notification_template',
        'assign_to_user_id',
        'priority',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'priority' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    // ==================== RELACIONAMENTOS ====================

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function sdrAgent(): BelongsTo
    {
        return $this->belongsTo(SdrAgent::class);
    }

    public function assignToUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assign_to_user_id');
    }

    // ==================== SCOPES ====================

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeForAgent($query, string $agentId)
    {
        return $query->where('sdr_agent_id', $agentId);
    }

    public function scopeByConditionType($query, string $type)
    {
        return $query->where('condition_type', $type);
    }

    public function scopeOrderByPriority($query)
    {
        return $query->orderBy('priority', 'desc');
    }

    // ==================== MÉTODOS ====================

    /**
     * Verifica se a condição de escalação foi atingida
     */
    public function shouldEscalate(array $context): bool
    {
        return match ($this->condition_type) {
            self::CONDITION_KEYWORD => $this->checkKeywordCondition($context['message'] ?? ''),
            self::CONDITION_SENTIMENT => $this->checkSentimentCondition($context['sentiment'] ?? 'neutral'),
            self::CONDITION_TIME_IN_STAGE => $this->checkTimeCondition($context['stage_changed_at'] ?? null),
            self::CONDITION_EXPLICIT_REQUEST => $this->checkExplicitRequest($context['message'] ?? ''),
            self::CONDITION_MESSAGE_COUNT => $this->checkMessageCount($context['message_count'] ?? 0),
            self::CONDITION_NO_RESPONSE => $context['no_response'] ?? false,
            default => false,
        };
    }

    /**
     * Verifica se a mensagem contém palavras-chave de escalação
     */
    protected function checkKeywordCondition(string $message): bool
    {
        if (empty($message)) {
            return false;
        }

        $message = mb_strtolower($message);
        $keywords = array_map('trim', explode(',', mb_strtolower($this->condition_value)));

        foreach ($keywords as $keyword) {
            if (!empty($keyword) && str_contains($message, $keyword)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Verifica sentimento da conversa
     */
    protected function checkSentimentCondition(string $sentiment): bool
    {
        return mb_strtolower($sentiment) === mb_strtolower($this->condition_value);
    }

    /**
     * Verifica tempo no estágio
     */
    protected function checkTimeCondition($stageChangedAt): bool
    {
        if (!$stageChangedAt) {
            return false;
        }

        $changedAt = $stageChangedAt instanceof \Carbon\Carbon 
            ? $stageChangedAt 
            : \Carbon\Carbon::parse($stageChangedAt);

        // Condition value pode ser: "24h", "48h", "7d"
        $value = $this->condition_value;
        
        if (str_ends_with($value, 'h')) {
            $hours = (int) str_replace('h', '', $value);
            return $changedAt->diffInHours(now()) >= $hours;
        }
        
        if (str_ends_with($value, 'd')) {
            $days = (int) str_replace('d', '', $value);
            return $changedAt->diffInDays(now()) >= $days;
        }

        return false;
    }

    /**
     * Verifica pedido explícito de atendente
     */
    protected function checkExplicitRequest(string $message): bool
    {
        $patterns = [
            'falar com atendente',
            'falar com humano',
            'atendente humano',
            'pessoa real',
            'quero falar com alguém',
            'preciso de ajuda real',
            'não quero falar com robô',
            'quero um atendente',
        ];

        $message = mb_strtolower($message);
        
        foreach ($patterns as $pattern) {
            if (str_contains($message, $pattern)) {
                return true;
            }
        }

        // Também verifica o condition_value customizado
        if (!empty($this->condition_value)) {
            $customPatterns = array_map('trim', explode(',', mb_strtolower($this->condition_value)));
            foreach ($customPatterns as $pattern) {
                if (!empty($pattern) && str_contains($message, $pattern)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Verifica número de mensagens
     */
    protected function checkMessageCount(int $count): bool
    {
        return $count >= (int) $this->condition_value;
    }

    /**
     * Retorna descrição legível da regra
     */
    public function getDescription(): string
    {
        $conditionDesc = match ($this->condition_type) {
            self::CONDITION_KEYWORD => "Palavras: {$this->condition_value}",
            self::CONDITION_SENTIMENT => "Sentimento: {$this->condition_value}",
            self::CONDITION_TIME_IN_STAGE => "Tempo no estágio: {$this->condition_value}",
            self::CONDITION_EXPLICIT_REQUEST => "Pedido de atendente",
            self::CONDITION_MESSAGE_COUNT => "Após {$this->condition_value} mensagens",
            self::CONDITION_NO_RESPONSE => "Sem resposta do agente",
            default => $this->condition_type,
        };

        $actionDesc = match ($this->action) {
            self::ACTION_PAUSE_AGENT => "Pausar agente",
            self::ACTION_NOTIFY_OWNER => "Notificar responsável",
            self::ACTION_TRANSFER_TICKET => "Transferir ticket",
            self::ACTION_CREATE_TASK => "Criar tarefa",
            default => $this->action,
        };

        return "{$conditionDesc} → {$actionDesc}";
    }
}

