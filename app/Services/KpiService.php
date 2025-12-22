<?php

namespace App\Services;

use App\Enums\LeadStatusEnum;
use App\Models\DealStageActivity;
use App\Models\Kpi;
use App\Models\KpiValue;
use App\Models\Lead;
use App\Models\Team;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class KpiService
{
    /**
     * Calcula todos os KPIs ativos de um tenant para um período.
     */
    public function calculateAll(string $tenantId, string $period, string $periodType = 'monthly'): Collection
    {
        $kpis = Kpi::where('tenant_id', $tenantId)
            ->active()
            ->ordered()
            ->get();

        return $kpis->map(function ($kpi) use ($tenantId, $period, $periodType) {
            return $this->calculate($kpi, $period, $periodType);
        });
    }

    /**
     * Calcula um KPI específico.
     */
    public function calculate(Kpi $kpi, string $period, string $periodType = 'monthly', ?User $user = null, ?Team $team = null): KpiValue
    {
        $dateRange = $this->getPeriodDateRange($period, $periodType);
        $previousPeriod = $this->getPreviousPeriod($period, $periodType);
        $previousRange = $this->getPeriodDateRange($previousPeriod, $periodType);

        // Calcula o valor atual
        $currentValue = $this->calculateKpiValue($kpi, $dateRange, $user, $team);

        // Calcula o valor anterior para comparação
        $previousValue = $this->calculateKpiValue($kpi, $previousRange, $user, $team);

        // Calcula variação
        $variation = $previousValue > 0
            ? (($currentValue - $previousValue) / $previousValue) * 100
            : 0;

        // Calcula atingimento da meta
        $achievement = $kpi->target_value > 0
            ? ($currentValue / $kpi->target_value) * 100
            : 0;

        // Atualiza ou cria o registro
        return KpiValue::updateOrCreate(
            [
                'kpi_id' => $kpi->id,
                'user_id' => $user?->id,
                'team_id' => $team?->id,
                'period' => $period,
            ],
            [
                'tenant_id' => $kpi->tenant_id,
                'period_type' => $periodType,
                'calculated_value' => round($currentValue, 4),
                'target_value' => $kpi->target_value,
                'previous_value' => round($previousValue, 4),
                'achievement_percentage' => round(min(100, $achievement), 2),
                'variation_percentage' => round($variation, 2),
                'calculated_at' => now(),
            ]
        );
    }

    /**
     * Calcula o valor de um KPI.
     */
    protected function calculateKpiValue(Kpi $kpi, array $dateRange, ?User $user = null, ?Team $team = null): float
    {
        return match($kpi->key) {
            'conversion_rate' => $this->calculateConversionRate($kpi->tenant_id, $dateRange, $user, $team),
            'average_ticket' => $this->calculateAverageTicket($kpi->tenant_id, $dateRange, $user, $team),
            'cycle_time' => $this->calculateCycleTime($kpi->tenant_id, $dateRange, $user, $team),
            'activity_completion_rate' => $this->calculateActivityCompletionRate($kpi->tenant_id, $dateRange, $user, $team),
            'activities_per_sale' => $this->calculateActivitiesPerSale($kpi->tenant_id, $dateRange, $user, $team),
            'activities_per_lead' => $this->calculateActivitiesPerLead($kpi->tenant_id, $dateRange, $user, $team),
            'pipeline_velocity' => $this->calculatePipelineVelocity($kpi->tenant_id, $dateRange, $user, $team),
            'overdue_activities' => $this->calculateOverdueActivities($kpi->tenant_id, $user, $team),
            'new_leads' => $this->calculateNewLeads($kpi->tenant_id, $dateRange, $user, $team),
            'loss_rate' => $this->calculateLossRate($kpi->tenant_id, $dateRange, $user, $team),
            'follow_up_rate' => $this->calculateFollowUpRate($kpi->tenant_id, $dateRange, $user, $team),
            'response_time' => $this->calculateResponseTime($kpi->tenant_id, $dateRange, $user, $team),
            'pipeline_value' => $this->calculatePipelineValue($kpi->tenant_id, $user, $team),
            'activity_effectiveness' => $this->calculateActivityEffectiveness($kpi->tenant_id, $dateRange, $user, $team),
            'activities_before_conversion' => $this->calculateActivitiesBeforeConversion($kpi->tenant_id, $dateRange, $user, $team),
            default => $this->calculateCustomKpi($kpi, $dateRange, $user, $team),
        };
    }

    /**
     * Taxa de Conversão: Leads Ganhos / Total de Leads
     */
    protected function calculateConversionRate(string $tenantId, array $dateRange, ?User $user, ?Team $team): float
    {
        $query = Lead::where('tenant_id', $tenantId)
            ->whereBetween('created_at', $dateRange);

        $this->applyUserOrTeamFilter($query, $user, $team);

        $total = $query->count();

        if ($total === 0) {
            return 0;
        }

        $won = (clone $query)->where('status', LeadStatusEnum::WON)->count();

        return ($won / $total) * 100;
    }

    /**
     * Ticket Médio: Soma dos Valores / Quantidade de Vendas
     */
    protected function calculateAverageTicket(string $tenantId, array $dateRange, ?User $user, ?Team $team): float
    {
        $query = Lead::where('tenant_id', $tenantId)
            ->where('status', LeadStatusEnum::WON)
            ->whereBetween('updated_at', $dateRange);

        $this->applyUserOrTeamFilter($query, $user, $team);

        $count = $query->count();

        if ($count === 0) {
            return 0;
        }

        $sum = $query->sum('value');

        return $sum / $count;
    }

    /**
     * Ciclo de Venda: Média de dias entre criação e fechamento
     */
    protected function calculateCycleTime(string $tenantId, array $dateRange, ?User $user, ?Team $team): float
    {
        $query = Lead::where('tenant_id', $tenantId)
            ->where('status', LeadStatusEnum::WON)
            ->whereBetween('updated_at', $dateRange)
            ->selectRaw('AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400) as avg_days');

        $this->applyUserOrTeamFilter($query, $user, $team);

        return (float) ($query->value('avg_days') ?? 0);
    }

    /**
     * Taxa de Conclusão de Atividades
     */
    protected function calculateActivityCompletionRate(string $tenantId, array $dateRange, ?User $user, ?Team $team): float
    {
        $query = DealStageActivity::where('tenant_id', $tenantId)
            ->whereBetween('created_at', $dateRange);

        if ($user) {
            $query->whereHas('lead', function ($q) use ($user) {
                $q->where('owner_id', $user->id);
            });
        } elseif ($team) {
            $userIds = $team->users()->pluck('users.id');
            $query->whereHas('lead', function ($q) use ($userIds) {
                $q->whereIn('owner_id', $userIds);
            });
        }

        $total = $query->count();

        if ($total === 0) {
            return 0;
        }

        $completed = (clone $query)->where('status', 'completed')->count();

        return ($completed / $total) * 100;
    }

    /**
     * Atividades por Venda
     */
    protected function calculateActivitiesPerSale(string $tenantId, array $dateRange, ?User $user, ?Team $team): float
    {
        // Conta vendas no período
        $salesQuery = Lead::where('tenant_id', $tenantId)
            ->where('status', LeadStatusEnum::WON)
            ->whereBetween('updated_at', $dateRange);

        $this->applyUserOrTeamFilter($salesQuery, $user, $team);
        $salesCount = $salesQuery->count();

        if ($salesCount === 0) {
            return 0;
        }

        // Conta atividades completadas no período
        $activitiesQuery = DealStageActivity::where('tenant_id', $tenantId)
            ->where('status', 'completed')
            ->whereBetween('completed_at', $dateRange);

        if ($user) {
            $activitiesQuery->where('completed_by', $user->id);
        } elseif ($team) {
            $userIds = $team->users()->pluck('users.id');
            $activitiesQuery->whereIn('completed_by', $userIds);
        }

        $activitiesCount = $activitiesQuery->count();

        return $activitiesCount / $salesCount;
    }

    /**
     * Velocidade do Pipeline: (Deals * Taxa Conversão * Ticket Médio) / Ciclo
     */
    protected function calculatePipelineVelocity(string $tenantId, array $dateRange, ?User $user, ?Team $team): float
    {
        $conversionRate = $this->calculateConversionRate($tenantId, $dateRange, $user, $team) / 100;
        $averageTicket = $this->calculateAverageTicket($tenantId, $dateRange, $user, $team);
        $cycleTime = $this->calculateCycleTime($tenantId, $dateRange, $user, $team);

        $query = Lead::where('tenant_id', $tenantId)
            ->whereIn('status', [LeadStatusEnum::OPEN])
            ->whereBetween('created_at', $dateRange);

        $this->applyUserOrTeamFilter($query, $user, $team);
        $openDeals = $query->count();

        if ($cycleTime === 0) {
            return 0;
        }

        return ($openDeals * $conversionRate * $averageTicket) / $cycleTime;
    }

    /**
     * Atividades Atrasadas (contagem atual, não do período)
     */
    protected function calculateOverdueActivities(string $tenantId, ?User $user, ?Team $team): float
    {
        $query = DealStageActivity::where('tenant_id', $tenantId)
            ->where('status', 'pending')
            ->whereNotNull('due_at')
            ->where('due_at', '<', now());

        if ($user) {
            $query->whereHas('lead', function ($q) use ($user) {
                $q->where('owner_id', $user->id);
            });
        } elseif ($team) {
            $userIds = $team->users()->pluck('users.id');
            $query->whereHas('lead', function ($q) use ($userIds) {
                $q->whereIn('owner_id', $userIds);
            });
        }

        return (float) $query->count();
    }

    /**
     * Novos Leads no período
     */
    protected function calculateNewLeads(string $tenantId, array $dateRange, ?User $user, ?Team $team): float
    {
        $query = Lead::where('tenant_id', $tenantId)
            ->whereBetween('created_at', $dateRange);

        $this->applyUserOrTeamFilter($query, $user, $team);

        return (float) $query->count();
    }

    /**
     * Taxa de Perda: Leads Perdidos / Total de Leads
     */
    protected function calculateLossRate(string $tenantId, array $dateRange, ?User $user, ?Team $team): float
    {
        $query = Lead::where('tenant_id', $tenantId)
            ->whereBetween('created_at', $dateRange);

        $this->applyUserOrTeamFilter($query, $user, $team);

        $total = $query->count();

        if ($total === 0) {
            return 0;
        }

        $lost = (clone $query)->where('status', LeadStatusEnum::LOST)->count();

        return ($lost / $total) * 100;
    }

    /**
     * Taxa de Follow-up: Leads com follow-up / Total de Leads
     */
    protected function calculateFollowUpRate(string $tenantId, array $dateRange, ?User $user, ?Team $team): float
    {
        $query = Lead::where('tenant_id', $tenantId)
            ->whereBetween('created_at', $dateRange);

        $this->applyUserOrTeamFilter($query, $user, $team);

        $total = $query->count();

        if ($total === 0) {
            return 0;
        }

        // Leads que tem pelo menos uma atividade de follow-up completada
        // O tipo de atividade está no template (stage_activity_templates)
        $withFollowUp = (clone $query)
            ->whereHas('stageActivities', function ($q) {
                $q->where('status', 'completed')
                  ->whereHas('template', function ($tq) {
                      $tq->where('activity_type', 'follow_up');
                  });
            })
            ->count();

        return ($withFollowUp / $total) * 100;
    }

    /**
     * Atividades por Lead
     */
    protected function calculateActivitiesPerLead(string $tenantId, array $dateRange, ?User $user, ?Team $team): float
    {
        $leadsQuery = Lead::where('tenant_id', $tenantId)
            ->whereBetween('created_at', $dateRange);

        $this->applyUserOrTeamFilter($leadsQuery, $user, $team);
        $leadsCount = $leadsQuery->count();

        if ($leadsCount === 0) {
            return 0;
        }

        // Conta atividades completadas no período
        $activitiesQuery = DealStageActivity::where('tenant_id', $tenantId)
            ->where('status', 'completed')
            ->whereBetween('completed_at', $dateRange);

        if ($user) {
            $activitiesQuery->where('completed_by', $user->id);
        } elseif ($team) {
            $userIds = $team->users()->pluck('users.id');
            $activitiesQuery->whereIn('completed_by', $userIds);
        }

        $activitiesCount = $activitiesQuery->count();

        return $activitiesCount / $leadsCount;
    }

    /**
     * Tempo de Resposta: Tempo médio entre criação do lead e primeira atividade (em minutos)
     */
    protected function calculateResponseTime(string $tenantId, array $dateRange, ?User $user, ?Team $team): float
    {
        $query = Lead::where('tenant_id', $tenantId)
            ->whereBetween('created_at', $dateRange)
            ->whereHas('stageActivities', function ($q) {
                $q->where('status', 'completed');
            });

        $this->applyUserOrTeamFilter($query, $user, $team);

        $leads = $query->with(['stageActivities' => function ($q) {
            $q->where('status', 'completed')
              ->orderBy('completed_at')
              ->limit(1);
        }])->get();

        if ($leads->isEmpty()) {
            return 0;
        }

        $totalMinutes = 0;
        $count = 0;

        foreach ($leads as $lead) {
            $firstActivity = $lead->stageActivities->first();
            if ($firstActivity && $firstActivity->completed_at) {
                $diffMinutes = $lead->created_at->diffInMinutes($firstActivity->completed_at);
                $totalMinutes += $diffMinutes;
                $count++;
            }
        }

        return $count > 0 ? $totalMinutes / $count : 0;
    }

    /**
     * Valor do Pipeline: Soma dos valores de leads em aberto
     */
    protected function calculatePipelineValue(string $tenantId, ?User $user, ?Team $team): float
    {
        $query = Lead::where('tenant_id', $tenantId)
            ->whereIn('status', [LeadStatusEnum::OPEN]);

        $this->applyUserOrTeamFilter($query, $user, $team);

        return (float) $query->sum('value');
    }

    /**
     * Efetividade de Atividades: Diferença na conversão entre leads com e sem atividades
     * Valor positivo = atividades aumentam conversão
     */
    protected function calculateActivityEffectiveness(string $tenantId, array $dateRange, ?User $user, ?Team $team): float
    {
        // Leads COM atividades completadas
        $queryWith = Lead::where('tenant_id', $tenantId)
            ->whereBetween('created_at', $dateRange)
            ->whereHas('stageActivities', fn($q) => $q->where('status', 'completed'));

        $this->applyUserOrTeamFilter($queryWith, $user, $team);

        $totalWith = $queryWith->count();
        $wonWith = (clone $queryWith)->where('status', LeadStatusEnum::WON)->count();

        // Leads SEM atividades completadas
        $queryWithout = Lead::where('tenant_id', $tenantId)
            ->whereBetween('created_at', $dateRange)
            ->whereDoesntHave('stageActivities', fn($q) => $q->where('status', 'completed'));

        $this->applyUserOrTeamFilter($queryWithout, $user, $team);

        $totalWithout = $queryWithout->count();
        $wonWithout = (clone $queryWithout)->where('status', LeadStatusEnum::WON)->count();

        // Calcula taxas de conversão
        $conversionWith = $totalWith > 0 ? ($wonWith / $totalWith) * 100 : 0;
        $conversionWithout = $totalWithout > 0 ? ($wonWithout / $totalWithout) * 100 : 0;

        // Retorna a diferença (lift)
        return round($conversionWith - $conversionWithout, 2);
    }

    /**
     * Atividades Antes da Conversão: Média de atividades completadas em leads ganhos
     */
    protected function calculateActivitiesBeforeConversion(string $tenantId, array $dateRange, ?User $user, ?Team $team): float
    {
        $query = Lead::where('tenant_id', $tenantId)
            ->where('status', LeadStatusEnum::WON)
            ->whereBetween('updated_at', $dateRange)
            ->withCount(['stageActivities' => fn($q) => $q->where('status', 'completed')]);

        $this->applyUserOrTeamFilter($query, $user, $team);

        $leads = $query->get();

        if ($leads->isEmpty()) {
            return 0;
        }

        $totalActivities = $leads->sum('stage_activities_count');

        return round($totalActivities / $leads->count(), 1);
    }

    /**
     * KPI customizado
     */
    protected function calculateCustomKpi(Kpi $kpi, array $dateRange, ?User $user, ?Team $team): float
    {
        // Implementar lógica customizada baseada em formula_config
        $config = $kpi->formula_config ?? [];

        // Exemplo de estrutura customizada
        if (isset($config['query'])) {
            // Executa query customizada
            // CUIDADO: Validar/sanitizar queries customizadas
        }

        return 0;
    }

    /**
     * Aplica filtro de usuário ou equipe na query.
     */
    protected function applyUserOrTeamFilter($query, ?User $user, ?Team $team): void
    {
        if ($user) {
            $query->where('owner_id', $user->id);
        } elseif ($team) {
            $userIds = $team->users()->pluck('users.id');
            $query->whereIn('owner_id', $userIds);
        }
    }

    /**
     * Retorna o range de datas para um período.
     */
    protected function getPeriodDateRange(string $period, string $periodType): array
    {
        return match($periodType) {
            'daily' => [
                "{$period} 00:00:00",
                "{$period} 23:59:59",
            ],
            'weekly' => $this->getWeekRange($period),
            'monthly' => [
                "{$period}-01 00:00:00",
                now()->parse("{$period}-01")->endOfMonth()->format('Y-m-d 23:59:59'),
            ],
            'quarterly' => $this->getQuarterRange($period),
            'yearly' => [
                "{$period}-01-01 00:00:00",
                "{$period}-12-31 23:59:59",
            ],
            default => [
                "{$period}-01 00:00:00",
                now()->parse("{$period}-01")->endOfMonth()->format('Y-m-d 23:59:59'),
            ],
        };
    }

    /**
     * Retorna o período anterior.
     */
    protected function getPreviousPeriod(string $period, string $periodType): string
    {
        return match($periodType) {
            'daily' => now()->parse($period)->subDay()->format('Y-m-d'),
            'weekly' => now()->parse($period)->subWeek()->format('Y-\WW'),
            'monthly' => now()->parse("{$period}-01")->subMonth()->format('Y-m'),
            'quarterly' => $this->getPreviousQuarter($period),
            'yearly' => (string) ((int) $period - 1),
            default => now()->parse("{$period}-01")->subMonth()->format('Y-m'),
        };
    }

    /**
     * Retorna range de uma semana.
     */
    protected function getWeekRange(string $period): array
    {
        // Formato: 2025-W01
        $parts = explode('-W', $period);
        $year = (int) $parts[0];
        $week = (int) $parts[1];

        $start = now()->setISODate($year, $week)->startOfWeek();
        $end = now()->setISODate($year, $week)->endOfWeek();

        return [
            $start->format('Y-m-d 00:00:00'),
            $end->format('Y-m-d 23:59:59'),
        ];
    }

    /**
     * Retorna range de um trimestre.
     */
    protected function getQuarterRange(string $period): array
    {
        // Formato: 2025-Q1
        $parts = explode('-Q', $period);
        $year = (int) $parts[0];
        $quarter = (int) $parts[1];

        $startMonth = (($quarter - 1) * 3) + 1;
        $endMonth = $quarter * 3;

        $start = now()->setDate($year, $startMonth, 1)->startOfMonth();
        $end = now()->setDate($year, $endMonth, 1)->endOfMonth();

        return [
            $start->format('Y-m-d 00:00:00'),
            $end->format('Y-m-d 23:59:59'),
        ];
    }

    /**
     * Retorna o trimestre anterior.
     */
    protected function getPreviousQuarter(string $period): string
    {
        $parts = explode('-Q', $period);
        $year = (int) $parts[0];
        $quarter = (int) $parts[1];

        if ($quarter === 1) {
            return ($year - 1) . '-Q4';
        }

        return $year . '-Q' . ($quarter - 1);
    }

    /**
     * Retorna todos os KPIs com seus valores para exibição.
     */
    public function getDashboard(string $tenantId, string $period, ?User $user = null, ?Team $team = null): array
    {
        $kpis = Kpi::where('tenant_id', $tenantId)
            ->active()
            ->ordered()
            ->get();

        $values = [];
        foreach ($kpis as $kpi) {
            $value = $this->calculate($kpi, $period, 'monthly', $user, $team);
            $values[] = [
                'kpi' => [
                    'id' => $kpi->id,
                    'name' => $kpi->name,
                    'key' => $kpi->key,
                    'unit' => $kpi->unit,
                    'icon' => $kpi->icon,
                    'color' => $kpi->color,
                    'target_value' => $kpi->target_value,
                ],
                'value' => $value->calculated_value,
                'formatted_value' => $kpi->formatValue($value->calculated_value),
                'previous_value' => $value->previous_value,
                'variation' => $value->variation_percentage,
                'achievement' => $value->achievement_percentage,
                'trend' => $value->trend,
                'is_on_target' => $kpi->target_value
                    ? $value->calculated_value >= $kpi->target_value
                    : null,
            ];
        }

        return [
            'period' => $period,
            'kpis' => $values,
        ];
    }

    /**
     * Inicializa os KPIs padrão para um tenant.
     */
    public function initializeDefaultKpis(string $tenantId): void
    {
        $defaults = Kpi::getDefaultKpis();

        foreach ($defaults as $kpiData) {
            Kpi::firstOrCreate(
                [
                    'tenant_id' => $tenantId,
                    'key' => $kpiData['key'],
                ],
                array_merge($kpiData, ['tenant_id' => $tenantId])
            );
        }
    }

    /**
     * Retorna a tendência histórica de um KPI.
     */
    public function getTrend(string $kpiId, int $periods = 6, string $periodType = 'monthly', ?User $user = null): array
    {
        $kpi = Kpi::findOrFail($kpiId);
        $values = [];

        for ($i = $periods - 1; $i >= 0; $i--) {
            $period = match($periodType) {
                'daily' => now()->subDays($i)->format('Y-m-d'),
                'weekly' => now()->subWeeks($i)->format('Y-\WW'),
                'monthly' => now()->subMonths($i)->format('Y-m'),
                'quarterly' => $this->getQuarterBack($i),
                default => now()->subMonths($i)->format('Y-m'),
            };

            $value = KpiValue::where('kpi_id', $kpiId)
                ->where('period', $period)
                ->when($user, fn($q) => $q->where('user_id', $user->id))
                ->first();

            $values[] = [
                'period' => $period,
                'value' => $value?->calculated_value ?? 0,
                'formatted' => $kpi->formatValue($value?->calculated_value ?? 0),
            ];
        }

        return [
            'kpi' => [
                'id' => $kpi->id,
                'name' => $kpi->name,
                'key' => $kpi->key,
            ],
            'values' => $values,
        ];
    }

    /**
     * Retorna o trimestre X períodos atrás.
     */
    protected function getQuarterBack(int $periodsBack): string
    {
        $date = now()->subQuarters($periodsBack);
        $quarter = ceil($date->month / 3);
        return $date->year . '-Q' . $quarter;
    }
}
