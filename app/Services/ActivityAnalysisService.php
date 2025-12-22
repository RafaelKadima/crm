<?php

namespace App\Services;

use App\Enums\LeadStatusEnum;
use App\Models\DealStageActivity;
use App\Models\Lead;
use App\Models\PipelineStage;
use App\Models\StageActivityTemplate;
use App\Models\User;
use Illuminate\Support\Collection;

class ActivityAnalysisService
{
    /**
     * Analisa como as atividades contribuíram para os resultados de um usuário.
     */
    public function analyzeUserContribution(User $user, string $startDate, string $endDate): array
    {
        $tenantId = $user->tenant_id;

        // Atividades completadas pelo usuário no período
        $activities = DealStageActivity::where('tenant_id', $tenantId)
            ->where('completed_by', $user->id)
            ->where('status', 'completed')
            ->whereBetween('completed_at', [$startDate, $endDate])
            ->with(['template', 'lead', 'stage'])
            ->get();

        // Leads ganhos no período
        $wonLeads = Lead::where('tenant_id', $tenantId)
            ->where('owner_id', $user->id)
            ->where('status', LeadStatusEnum::WON)
            ->whereBetween('updated_at', [$startDate, $endDate])
            ->get();

        // Agrupa atividades por tipo
        $byType = $activities->groupBy(function ($activity) {
            return $activity->template?->activity_type ?? 'other';
        });

        // Agrupa atividades por etapa
        $byStage = $activities->groupBy('stage_id');

        // Calcula efetividade por tipo de atividade
        $typeEffectiveness = $this->calculateTypeEffectiveness($activities, $wonLeads);

        // Calcula efetividade por etapa
        $stageEffectiveness = $this->calculateStageEffectiveness($byStage, $wonLeads);

        return [
            'summary' => [
                'total_activities' => $activities->count(),
                'total_sales' => $wonLeads->count(),
                'total_revenue' => $wonLeads->sum('value'),
                'activities_per_sale' => $wonLeads->count() > 0
                    ? round($activities->count() / $wonLeads->count(), 1)
                    : 0,
                'completion_rate' => $this->getCompletionRate($user, $startDate, $endDate),
            ],
            'by_type' => $byType->map(function ($group, $type) {
                return [
                    'type' => $type,
                    'count' => $group->count(),
                    'avg_points' => round($group->avg('points_earned'), 1),
                ];
            })->values(),
            'by_stage' => $stageEffectiveness,
            'type_effectiveness' => $typeEffectiveness,
            'insights' => $this->generateInsights($activities, $wonLeads, $typeEffectiveness),
            'recommendations' => $this->generateRecommendations($activities, $wonLeads, $user),
        ];
    }

    /**
     * Calcula a efetividade por tipo de atividade.
     */
    protected function calculateTypeEffectiveness(Collection $activities, Collection $wonLeads): array
    {
        $wonLeadIds = $wonLeads->pluck('id')->toArray();

        $byType = $activities->groupBy(function ($activity) {
            return $activity->template?->activity_type ?? 'other';
        });

        $effectiveness = [];

        foreach ($byType as $type => $typeActivities) {
            // Conta quantas atividades desse tipo estão em leads ganhos
            $inWonLeads = $typeActivities->filter(function ($activity) use ($wonLeadIds) {
                return in_array($activity->lead_id, $wonLeadIds);
            })->count();

            $total = $typeActivities->count();
            $rate = $total > 0 ? ($inWonLeads / $total) * 100 : 0;

            $effectiveness[] = [
                'type' => $type,
                'type_label' => $this->getTypeLabel($type),
                'total' => $total,
                'in_won_leads' => $inWonLeads,
                'effectiveness_rate' => round($rate, 1),
            ];
        }

        // Ordena por efetividade
        usort($effectiveness, fn($a, $b) => $b['effectiveness_rate'] <=> $a['effectiveness_rate']);

        return $effectiveness;
    }

    /**
     * Calcula a efetividade por etapa do funil.
     */
    protected function calculateStageEffectiveness(Collection $byStage, Collection $wonLeads): array
    {
        $wonLeadIds = $wonLeads->pluck('id')->toArray();
        $stages = PipelineStage::whereIn('id', $byStage->keys())->get()->keyBy('id');

        $effectiveness = [];

        foreach ($byStage as $stageId => $stageActivities) {
            $stage = $stages->get($stageId);

            $inWonLeads = $stageActivities->filter(function ($activity) use ($wonLeadIds) {
                return in_array($activity->lead_id, $wonLeadIds);
            })->count();

            $total = $stageActivities->count();
            $rate = $total > 0 ? ($inWonLeads / $total) * 100 : 0;

            $effectiveness[] = [
                'stage_id' => $stageId,
                'stage_name' => $stage?->name ?? 'Desconhecido',
                'stage_order' => $stage?->order ?? 0,
                'total_activities' => $total,
                'in_won_leads' => $inWonLeads,
                'effectiveness_rate' => round($rate, 1),
            ];
        }

        // Ordena por ordem do estágio
        usort($effectiveness, fn($a, $b) => $a['stage_order'] <=> $b['stage_order']);

        return $effectiveness;
    }

    /**
     * Calcula a taxa de conclusão de atividades.
     */
    protected function getCompletionRate(User $user, string $startDate, string $endDate): float
    {
        $total = DealStageActivity::where('tenant_id', $user->tenant_id)
            ->whereHas('lead', function ($q) use ($user) {
                $q->where('owner_id', $user->id);
            })
            ->whereBetween('created_at', [$startDate, $endDate])
            ->count();

        if ($total === 0) {
            return 0;
        }

        $completed = DealStageActivity::where('tenant_id', $user->tenant_id)
            ->where('completed_by', $user->id)
            ->where('status', 'completed')
            ->whereBetween('completed_at', [$startDate, $endDate])
            ->count();

        return round(($completed / $total) * 100, 1);
    }

    /**
     * Gera insights baseados na análise.
     */
    protected function generateInsights(Collection $activities, Collection $wonLeads, array $typeEffectiveness): array
    {
        $insights = [];

        // Insight 1: Tipo de atividade mais efetivo
        if (!empty($typeEffectiveness)) {
            $mostEffective = $typeEffectiveness[0];
            if ($mostEffective['effectiveness_rate'] > 0) {
                $insights[] = [
                    'type' => 'positive',
                    'icon' => 'TrendingUp',
                    'message' => "Atividades do tipo \"{$mostEffective['type_label']}\" têm a maior taxa de conversão ({$mostEffective['effectiveness_rate']}%).",
                ];
            }
        }

        // Insight 2: Média de atividades por venda
        if ($wonLeads->count() > 0) {
            $avgActivities = round($activities->count() / $wonLeads->count(), 1);
            $insights[] = [
                'type' => 'info',
                'icon' => 'Activity',
                'message' => "Em média, você completa {$avgActivities} atividades para cada venda fechada.",
            ];
        }

        // Insight 3: Atividades atrasadas
        $overdueCount = DealStageActivity::where('status', 'pending')
            ->whereNotNull('due_at')
            ->where('due_at', '<', now())
            ->whereHas('lead', function ($q) use ($wonLeads) {
                $q->where('owner_id', $wonLeads->first()?->owner_id);
            })
            ->count();

        if ($overdueCount > 0) {
            $insights[] = [
                'type' => 'warning',
                'icon' => 'AlertTriangle',
                'message' => "Você tem {$overdueCount} atividades atrasadas que precisam de atenção.",
            ];
        }

        // Insight 4: Tendência de vendas
        if ($wonLeads->count() >= 3) {
            $avgValue = $wonLeads->avg('value');
            $insights[] = [
                'type' => 'info',
                'icon' => 'DollarSign',
                'message' => "Ticket médio das vendas: R$ " . number_format($avgValue, 2, ',', '.'),
            ];
        }

        return $insights;
    }

    /**
     * Gera recomendações de ação.
     */
    protected function generateRecommendations(Collection $activities, Collection $wonLeads, User $user): array
    {
        $recommendations = [];

        // Recomendação 1: Se poucas atividades
        if ($activities->count() < 10) {
            $recommendations[] = [
                'priority' => 'high',
                'icon' => 'Plus',
                'title' => 'Aumente suas atividades',
                'description' => 'Complete mais atividades para aumentar suas chances de conversão.',
            ];
        }

        // Recomendação 2: Se taxa de conclusão baixa
        $completionRate = $this->getCompletionRate($user, now()->subMonth()->format('Y-m-d'), now()->format('Y-m-d'));
        if ($completionRate < 70) {
            $recommendations[] = [
                'priority' => 'medium',
                'icon' => 'CheckCircle',
                'title' => 'Melhore sua taxa de conclusão',
                'description' => "Sua taxa de conclusão está em {$completionRate}%. Tente completar mais atividades no prazo.",
            ];
        }

        // Recomendação 3: Baseada no tipo mais efetivo
        $byType = $activities->groupBy(function ($a) {
            return $a->template?->activity_type ?? 'other';
        });

        if ($byType->has('demo') && $byType->get('demo')->count() < 5) {
            $recommendations[] = [
                'priority' => 'high',
                'icon' => 'Play',
                'title' => 'Agende mais demonstrações',
                'description' => 'Demos têm alta taxa de conversão. Considere agendar mais apresentações.',
            ];
        }

        // Recomendação 4: Se não tem atividades de follow-up
        if (!$byType->has('follow_up') || $byType->get('follow_up')->count() < 3) {
            $recommendations[] = [
                'priority' => 'medium',
                'icon' => 'RefreshCw',
                'title' => 'Faça mais follow-ups',
                'description' => 'Follow-ups regulares mantêm os leads engajados e aumentam a conversão.',
            ];
        }

        return $recommendations;
    }

    /**
     * Retorna o label amigável para um tipo de atividade.
     */
    protected function getTypeLabel(string $type): string
    {
        return match($type) {
            'call' => 'Ligação',
            'email' => 'E-mail',
            'meeting' => 'Reunião',
            'task' => 'Tarefa',
            'demo' => 'Demonstração',
            'follow_up' => 'Follow-up',
            default => ucfirst($type),
        };
    }

    /**
     * Analisa a jornada de um lead específico.
     */
    public function analyzeLeadJourney(string $leadId): array
    {
        $lead = Lead::with(['activities.template', 'stageActivities.template', 'stage', 'pipeline.stages'])->findOrFail($leadId);

        $stageActivities = $lead->stageActivities->groupBy('stage_id');

        $journey = [];
        foreach ($lead->pipeline->stages as $stage) {
            $activities = $stageActivities->get($stage->id, collect());

            $journey[] = [
                'stage' => [
                    'id' => $stage->id,
                    'name' => $stage->name,
                    'order' => $stage->order,
                ],
                'is_current' => $lead->stage_id === $stage->id,
                'activities' => [
                    'total' => $activities->count(),
                    'completed' => $activities->where('status', 'completed')->count(),
                    'pending' => $activities->where('status', 'pending')->count(),
                    'skipped' => $activities->where('status', 'skipped')->count(),
                ],
                'points_earned' => $activities->sum('points_earned'),
                'time_in_stage' => null, // Pode calcular se tiver histórico de mudanças
            ];
        }

        return [
            'lead' => [
                'id' => $lead->id,
                'status' => $lead->status->value,
                'value' => $lead->value,
                'current_stage' => $lead->stage?->name,
            ],
            'journey' => $journey,
            'totals' => [
                'total_activities' => $lead->stageActivities->count(),
                'completed_activities' => $lead->stageActivities->where('status', 'completed')->count(),
                'total_points' => $lead->stageActivities->sum('points_earned'),
            ],
        ];
    }

    /**
     * Compara performance entre vendedores.
     */
    public function compareUsers(array $userIds, string $startDate, string $endDate): array
    {
        $comparisons = [];

        foreach ($userIds as $userId) {
            $user = User::find($userId);
            if (!$user) continue;

            $analysis = $this->analyzeUserContribution($user, $startDate, $endDate);

            $comparisons[] = [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                ],
                'metrics' => $analysis['summary'],
            ];
        }

        // Ordena por receita
        usort($comparisons, fn($a, $b) => $b['metrics']['total_revenue'] <=> $a['metrics']['total_revenue']);

        return $comparisons;
    }
}
