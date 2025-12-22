<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Kpi extends Model
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
        'key',
        'description',
        'formula_type',
        'source',
        'formula_config',
        'unit',
        'target_value',
        'weight',
        'is_active',
        'is_system',
        'display_order',
        'icon',
        'color',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'formula_config' => 'array',
            'target_value' => 'decimal:4',
            'weight' => 'integer',
            'is_active' => 'boolean',
            'is_system' => 'boolean',
            'display_order' => 'integer',
        ];
    }

    /**
     * Valores históricos deste KPI.
     */
    public function values(): HasMany
    {
        return $this->hasMany(KpiValue::class);
    }

    /**
     * Mapeamentos com atividades.
     */
    public function activityMappings(): HasMany
    {
        return $this->hasMany(ActivityKpiMapping::class);
    }

    /**
     * Retorna o último valor calculado.
     */
    public function getLatestValueAttribute(): ?KpiValue
    {
        return $this->values()->latest('calculated_at')->first();
    }

    /**
     * Retorna o valor atual (último calculado).
     */
    public function getCurrentValueAttribute(): ?float
    {
        return $this->latest_value?->calculated_value;
    }

    /**
     * Formata o valor para exibição.
     */
    public function formatValue(float $value): string
    {
        return match($this->unit) {
            '%' => number_format($value, 1) . '%',
            'R$' => 'R$ ' . number_format($value, 2, ',', '.'),
            'dias' => number_format($value, 1) . ' dias',
            'horas' => number_format($value, 1) . 'h',
            default => number_format($value, 0)
        };
    }

    /**
     * Verifica se o KPI está atingindo a meta.
     */
    public function isOnTarget(): bool
    {
        if (!$this->target_value || !$this->current_value) {
            return false;
        }

        // Para KPIs onde menor é melhor (ex: tempo de ciclo)
        $lowerIsBetter = in_array($this->key, ['cycle_time', 'response_time', 'overdue_activities']);

        if ($lowerIsBetter) {
            return $this->current_value <= $this->target_value;
        }

        return $this->current_value >= $this->target_value;
    }

    /**
     * Retorna a porcentagem de atingimento da meta.
     */
    public function getAchievementPercentageAttribute(): ?float
    {
        if (!$this->target_value || !$this->current_value) {
            return null;
        }

        return round(($this->current_value / $this->target_value) * 100, 2);
    }

    /**
     * Scope para KPIs ativos.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope para KPIs de sistema.
     */
    public function scopeSystem($query)
    {
        return $query->where('is_system', true);
    }

    /**
     * Scope para KPIs customizados.
     */
    public function scopeCustom($query)
    {
        return $query->where('is_system', false);
    }

    /**
     * Scope ordenado por display_order.
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('display_order');
    }

    /**
     * KPIs padrão do sistema.
     */
    public static function getDefaultKpis(): array
    {
        return [
            [
                'name' => 'Taxa de Conversão',
                'key' => 'conversion_rate',
                'description' => 'Porcentagem de leads convertidos em vendas',
                'formula_type' => 'ratio',
                'source' => 'leads',
                'unit' => '%',
                'icon' => 'TrendingUp',
                'color' => '#22c55e',
                'is_system' => true,
                'display_order' => 1,
            ],
            [
                'name' => 'Ticket Médio',
                'key' => 'average_ticket',
                'description' => 'Valor médio das vendas realizadas',
                'formula_type' => 'average',
                'source' => 'leads',
                'unit' => 'R$',
                'icon' => 'DollarSign',
                'color' => '#3b82f6',
                'is_system' => true,
                'display_order' => 2,
            ],
            [
                'name' => 'Ciclo de Venda',
                'key' => 'cycle_time',
                'description' => 'Tempo médio do primeiro contato até a venda',
                'formula_type' => 'average',
                'source' => 'leads',
                'unit' => 'dias',
                'icon' => 'Clock',
                'color' => '#f59e0b',
                'is_system' => true,
                'display_order' => 3,
            ],
            [
                'name' => 'Taxa de Conclusão de Atividades',
                'key' => 'activity_completion_rate',
                'description' => 'Porcentagem de atividades concluídas no prazo',
                'formula_type' => 'ratio',
                'source' => 'activities',
                'unit' => '%',
                'icon' => 'CheckCircle',
                'color' => '#8b5cf6',
                'is_system' => true,
                'display_order' => 4,
            ],
            [
                'name' => 'Atividades por Venda',
                'key' => 'activities_per_sale',
                'description' => 'Número médio de atividades para fechar uma venda',
                'formula_type' => 'ratio',
                'source' => 'activities',
                'unit' => 'unidades',
                'icon' => 'Activity',
                'color' => '#ec4899',
                'is_system' => true,
                'display_order' => 5,
            ],
            [
                'name' => 'Velocidade do Pipeline',
                'key' => 'pipeline_velocity',
                'description' => 'Valor potencial dividido pelo ciclo de venda',
                'formula_type' => 'custom',
                'source' => 'leads',
                'unit' => 'R$',
                'icon' => 'Zap',
                'color' => '#06b6d4',
                'is_system' => true,
                'display_order' => 6,
            ],
            [
                'name' => 'Atividades Atrasadas',
                'key' => 'overdue_activities',
                'description' => 'Número de atividades pendentes com prazo vencido',
                'formula_type' => 'count',
                'source' => 'activities',
                'unit' => 'unidades',
                'icon' => 'AlertTriangle',
                'color' => '#ef4444',
                'is_system' => true,
                'display_order' => 7,
            ],
            [
                'name' => 'Leads Novos',
                'key' => 'new_leads',
                'description' => 'Quantidade de novos leads no período',
                'formula_type' => 'count',
                'source' => 'leads',
                'unit' => 'unidades',
                'icon' => 'UserPlus',
                'color' => '#14b8a6',
                'is_system' => true,
                'display_order' => 8,
            ],
        ];
    }
}
