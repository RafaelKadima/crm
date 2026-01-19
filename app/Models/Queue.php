<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Queue extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'tenant_id',
        'channel_id',
        'pipeline_id',
        'sdr_agent_id',
        'sdr_disabled',
        'name',
        'menu_option',
        'menu_label',
        'welcome_message',
        'auto_distribute',
        'is_active',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'menu_option' => 'integer',
            'auto_distribute' => 'boolean',
            'is_active' => 'boolean',
            'sdr_disabled' => 'boolean',
        ];
    }

    /**
     * Canal associado à fila.
     */
    public function channel(): BelongsTo
    {
        return $this->belongsTo(Channel::class);
    }

    /**
     * Pipeline/Funil associado à fila.
     */
    public function pipeline(): BelongsTo
    {
        return $this->belongsTo(Pipeline::class);
    }

    /**
     * SDR Agent associado à fila.
     */
    public function sdrAgent(): BelongsTo
    {
        return $this->belongsTo(SdrAgent::class);
    }

    /**
     * Verifica se a fila tem um agente SDR configurado.
     */
    public function hasSdrAgent(): bool
    {
        return $this->sdr_agent_id !== null;
    }

    /**
     * Usuários atribuídos a esta fila.
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'queue_user')
            ->withPivot(['is_active', 'priority'])
            ->withTimestamps();
    }

    /**
     * Usuários ativos na fila.
     */
    public function activeUsers(): BelongsToMany
    {
        return $this->users()->wherePivot('is_active', true);
    }

    /**
     * Leads associados a esta fila.
     */
    public function leads(): HasMany
    {
        return $this->hasMany(Lead::class);
    }

    /**
     * Retorna os IDs dos usuários ativos na fila (para Round-Robin).
     */
    public function getActiveUserIds(): array
    {
        return $this->activeUsers()
            ->where('users.is_active', true)
            ->orderBy('queue_user.priority', 'desc')
            ->pluck('users.id')
            ->toArray();
    }

    /**
     * Verifica se a fila tem usuários disponíveis.
     */
    public function hasAvailableUsers(): bool
    {
        return $this->activeUsers()
            ->where('users.is_active', true)
            ->exists();
    }

    /**
     * Scope para filas ativas.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope para filas de um canal específico.
     */
    public function scopeForChannel($query, string $channelId)
    {
        return $query->where('channel_id', $channelId);
    }

    /**
     * Formata o texto do menu para exibição.
     */
    public function getMenuText(): string
    {
        return "{$this->menu_option} - {$this->menu_label}";
    }

    /**
     * Gera o menu completo do canal (todas as filas ativas).
     */
    public static function generateMenuForChannel(string $channelId): array
    {
        $queues = static::where('channel_id', $channelId)
            ->where('is_active', true)
            ->orderBy('menu_option')
            ->get();

        $menuText = "Escolha uma opção:\n";
        $options = [];

        foreach ($queues as $queue) {
            $menuText .= "{$queue->menu_option} - {$queue->menu_label}\n";
            $options[$queue->menu_option] = [
                'queue_id' => $queue->id,
                'name' => $queue->name,
                'pipeline_id' => $queue->pipeline_id,
            ];
        }

        return [
            'text' => trim($menuText),
            'options' => $options,
            'queues' => $queues,
        ];
    }

    /**
     * Encontra a fila pela resposta do menu.
     */
    public static function findByMenuResponse(string $channelId, string $response): ?self
    {
        $response = trim($response);

        // Tenta encontrar pelo número da opção
        if (is_numeric($response)) {
            return static::where('channel_id', $channelId)
                ->where('menu_option', (int) $response)
                ->where('is_active', true)
                ->first();
        }

        // Fallback: busca por texto parcial no label
        return static::where('channel_id', $channelId)
            ->where('is_active', true)
            ->where(function ($query) use ($response) {
                $query->where('menu_label', 'LIKE', "%{$response}%")
                    ->orWhere('name', 'LIKE', "%{$response}%");
            })
            ->first();
    }
}

