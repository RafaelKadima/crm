<?php

namespace App\Services;

use App\Enums\LeadStatusEnum;
use App\Models\DealStageActivity;
use App\Models\Lead;
use App\Models\StageActivityTemplate;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class ActivityEffectivenessService
{
    /**
     * Analisa a efetividade de cada tipo de atividade.
     * Retorna quais atividades mais contribuem para conversão.
     */
    public function analyzeActivityEffectiveness(string $tenantId, array $dateRange, ?string $pipelineId = null): array
    {
        // Busca todos os templates de atividades
        $templatesQuery = StageActivityTemplate::where('tenant_id', $tenantId);
        if ($pipelineId) {
            $templatesQuery->where('pipeline_id', $pipelineId);
        }
        $templates = $templatesQuery->get();

        $effectiveness = [];

        foreach ($templates as $template) {
            $stats = $this->calculateTemplateEffectiveness($template, $dateRange);
            $effectiveness[] = [
                'template_id' => $template->id,
                'template_title' => $template->title,
                'activity_type' => $template->activity_type,
                'stage_name' => $template->stage?->name,
                'pipeline_name' => $template->pipeline?->name,
                ...$stats,
            ];
        }

        // Ordena por taxa de conversão
        usort($effectiveness, fn($a, $b) => $b['conversion_rate'] <=> $a['conversion_rate']);

        return $effectiveness;
    }

    /**
     * Calcula efetividade de um template específico.
     */
    protected function calculateTemplateEffectiveness(StageActivityTemplate $template, array $dateRange): array
    {
        // Leads que tiveram essa atividade completada
        $leadsWithActivity = Lead::where('tenant_id', $template->tenant_id)
            ->whereBetween('created_at', $dateRange)
            ->whereHas('stageActivities', function ($q) use ($template) {
                $q->where('stage_activity_template_id', $template->id)
                  ->where('status', 'completed');
            });

        $totalWithActivity = $leadsWithActivity->count();
        $wonWithActivity = (clone $leadsWithActivity)->where('status', LeadStatusEnum::WON)->count();
        $lostWithActivity = (clone $leadsWithActivity)->where('status', LeadStatusEnum::LOST)->count();

        // Leads que NÃO tiveram essa atividade completada
        $leadsWithoutActivity = Lead::where('tenant_id', $template->tenant_id)
            ->whereBetween('created_at', $dateRange)
            ->whereDoesntHave('stageActivities', function ($q) use ($template) {
                $q->where('stage_activity_template_id', $template->id)
                  ->where('status', 'completed');
            });

        $totalWithoutActivity = $leadsWithoutActivity->count();
        $wonWithoutActivity = (clone $leadsWithoutActivity)->where('status', LeadStatusEnum::WON)->count();

        // Calcula taxas
        $conversionWithActivity = $totalWithActivity > 0
            ? round(($wonWithActivity / $totalWithActivity) * 100, 2)
            : 0;

        $conversionWithoutActivity = $totalWithoutActivity > 0
            ? round(($wonWithoutActivity / $totalWithoutActivity) * 100, 2)
            : 0;

        // Impacto: diferença entre fazer ou não a atividade
        $impact = $conversionWithActivity - $conversionWithoutActivity;

        // Tempo médio para completar a atividade
        $avgCompletionTime = DealStageActivity::where('stage_activity_template_id', $template->id)
            ->where('status', 'completed')
            ->whereNotNull('completed_at')
            ->selectRaw('AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 60) as avg_minutes')
            ->value('avg_minutes');

        return [
            'total_completed' => $totalWithActivity,
            'won_with_activity' => $wonWithActivity,
            'lost_with_activity' => $lostWithActivity,
            'conversion_rate' => $conversionWithActivity,
            'conversion_without' => $conversionWithoutActivity,
            'impact_percentage' => round($impact, 2),
            'avg_completion_minutes' => round($avgCompletionTime ?? 0, 1),
            'is_high_impact' => $impact > 10,
            'is_critical' => $template->is_required && $impact > 20,
        ];
    }

    /**
     * Analisa a sequência de atividades dos leads ganhos vs perdidos.
     */
    public function analyzeActivitySequence(string $tenantId, array $dateRange): array
    {
        // Leads ganhos
        $wonLeads = Lead::where('tenant_id', $tenantId)
            ->where('status', LeadStatusEnum::WON)
            ->whereBetween('created_at', $dateRange)
            ->with(['stageActivities' => function ($q) {
                $q->where('status', 'completed')
                  ->orderBy('completed_at')
                  ->with('template');
            }])
            ->get();

        // Leads perdidos
        $lostLeads = Lead::where('tenant_id', $tenantId)
            ->where('status', LeadStatusEnum::LOST)
            ->whereBetween('created_at', $dateRange)
            ->with(['stageActivities' => function ($q) {
                $q->where('status', 'completed')
                  ->orderBy('completed_at')
                  ->with('template');
            }])
            ->get();

        // Estatísticas dos ganhos
        $wonStats = $this->calculateSequenceStats($wonLeads);

        // Estatísticas dos perdidos
        $lostStats = $this->calculateSequenceStats($lostLeads);

        return [
            'won' => [
                'total_leads' => $wonLeads->count(),
                'avg_activities' => $wonStats['avg_activities'],
                'avg_days_to_close' => $wonStats['avg_days'],
                'most_common_sequence' => $wonStats['common_sequence'],
                'activity_distribution' => $wonStats['distribution'],
            ],
            'lost' => [
                'total_leads' => $lostLeads->count(),
                'avg_activities' => $lostStats['avg_activities'],
                'avg_days_to_close' => $lostStats['avg_days'],
                'most_common_sequence' => $lostStats['common_sequence'],
                'activity_distribution' => $lostStats['distribution'],
            ],
            'insights' => $this->generateInsights($wonStats, $lostStats),
        ];
    }

    /**
     * Calcula estatísticas de sequência de atividades.
     */
    protected function calculateSequenceStats(Collection $leads): array
    {
        if ($leads->isEmpty()) {
            return [
                'avg_activities' => 0,
                'avg_days' => 0,
                'common_sequence' => [],
                'distribution' => [],
            ];
        }

        $totalActivities = 0;
        $totalDays = 0;
        $sequences = [];
        $activityCounts = [];

        foreach ($leads as $lead) {
            $activities = $lead->stageActivities;
            $totalActivities += $activities->count();

            // Dias até fechamento
            $days = $lead->created_at->diffInDays($lead->updated_at);
            $totalDays += $days;

            // Sequência de atividades
            $sequence = $activities->pluck('template.title')->filter()->toArray();
            $sequenceKey = implode(' → ', array_slice($sequence, 0, 3)); // Primeiras 3
            $sequences[$sequenceKey] = ($sequences[$sequenceKey] ?? 0) + 1;

            // Contagem por tipo
            foreach ($activities as $activity) {
                $type = $activity->template?->activity_type ?? 'other';
                $activityCounts[$type] = ($activityCounts[$type] ?? 0) + 1;
            }
        }

        // Ordena sequências por frequência
        arsort($sequences);
        $commonSequence = array_slice($sequences, 0, 5, true);

        return [
            'avg_activities' => round($totalActivities / $leads->count(), 1),
            'avg_days' => round($totalDays / $leads->count(), 1),
            'common_sequence' => $commonSequence,
            'distribution' => $activityCounts,
        ];
    }

    /**
     * Gera insights baseados na comparação won vs lost.
     */
    protected function generateInsights(array $wonStats, array $lostStats): array
    {
        $insights = [];

        // Insight sobre quantidade de atividades
        if ($wonStats['avg_activities'] > $lostStats['avg_activities']) {
            $diff = round($wonStats['avg_activities'] - $lostStats['avg_activities'], 1);
            $insights[] = [
                'type' => 'activities',
                'severity' => 'high',
                'message' => "Leads ganhos têm em média {$diff} atividades a mais que os perdidos",
                'recommendation' => 'Aumente o engajamento com leads que têm poucas atividades',
            ];
        }

        // Insight sobre tempo de ciclo
        if ($wonStats['avg_days'] < $lostStats['avg_days'] && $lostStats['avg_days'] > 0) {
            $insights[] = [
                'type' => 'cycle_time',
                'severity' => 'medium',
                'message' => "Leads perdidos levam mais tempo no funil ({$lostStats['avg_days']} dias vs {$wonStats['avg_days']} dias)",
                'recommendation' => 'Leads parados por muito tempo têm mais chance de serem perdidos. Acelere o follow-up.',
            ];
        }

        // Insight sobre tipos de atividades
        $wonTypes = array_keys($wonStats['distribution']);
        $lostTypes = array_keys($lostStats['distribution']);
        $missingInLost = array_diff($wonTypes, $lostTypes);

        if (!empty($missingInLost)) {
            $insights[] = [
                'type' => 'missing_activities',
                'severity' => 'high',
                'message' => 'Atividades comuns em leads ganhos que faltam nos perdidos: ' . implode(', ', $missingInLost),
                'recommendation' => 'Certifique-se de executar essas atividades em todos os leads',
            ];
        }

        return $insights;
    }

    /**
     * Retorna as atividades mais efetivas para conversão.
     */
    public function getTopPerformingActivities(string $tenantId, array $dateRange, int $limit = 5): array
    {
        $effectiveness = $this->analyzeActivityEffectiveness($tenantId, $dateRange);

        return array_slice(
            array_filter($effectiveness, fn($e) => $e['total_completed'] >= 5), // Mínimo de 5 execuções
            0,
            $limit
        );
    }

    /**
     * Retorna atividades que precisam de atenção (baixa efetividade).
     */
    public function getActivitiesNeedingImprovement(string $tenantId, array $dateRange): array
    {
        $effectiveness = $this->analyzeActivityEffectiveness($tenantId, $dateRange);

        return array_filter($effectiveness, function ($e) {
            return $e['total_completed'] >= 5 && // Mínimo de execuções
                   $e['impact_percentage'] < 0;  // Impacto negativo
        });
    }

    /**
     * Calcula KPI de efetividade geral de atividades.
     */
    public function calculateOverallEffectiveness(string $tenantId, array $dateRange): float
    {
        // Leads com pelo menos 1 atividade completada
        $leadsWithActivities = Lead::where('tenant_id', $tenantId)
            ->whereBetween('created_at', $dateRange)
            ->whereHas('stageActivities', fn($q) => $q->where('status', 'completed'));

        $totalWithActivities = $leadsWithActivities->count();
        $wonWithActivities = (clone $leadsWithActivities)->where('status', LeadStatusEnum::WON)->count();

        // Leads sem atividades
        $leadsWithoutActivities = Lead::where('tenant_id', $tenantId)
            ->whereBetween('created_at', $dateRange)
            ->whereDoesntHave('stageActivities', fn($q) => $q->where('status', 'completed'));

        $totalWithoutActivities = $leadsWithoutActivities->count();
        $wonWithoutActivities = (clone $leadsWithoutActivities)->where('status', LeadStatusEnum::WON)->count();

        // Calcula o "lift" que atividades proporcionam
        $conversionWith = $totalWithActivities > 0 ? ($wonWithActivities / $totalWithActivities) * 100 : 0;
        $conversionWithout = $totalWithoutActivities > 0 ? ($wonWithoutActivities / $totalWithoutActivities) * 100 : 0;

        // Retorna a diferença percentual
        return round($conversionWith - $conversionWithout, 2);
    }

    /**
     * Analisa efetividade por vendedor.
     */
    public function analyzeByUser(string $tenantId, array $dateRange): array
    {
        $users = User::where('tenant_id', $tenantId)
            ->whereHas('assignedLeads', function ($q) use ($dateRange) {
                $q->whereBetween('created_at', $dateRange);
            })
            ->get();

        $results = [];

        foreach ($users as $user) {
            $leads = Lead::where('tenant_id', $tenantId)
                ->where('owner_id', $user->id)
                ->whereBetween('created_at', $dateRange);

            $total = $leads->count();
            $won = (clone $leads)->where('status', LeadStatusEnum::WON)->count();

            // Média de atividades por lead
            $avgActivities = DealStageActivity::whereHas('lead', function ($q) use ($user, $dateRange) {
                    $q->where('owner_id', $user->id)
                      ->whereBetween('created_at', $dateRange);
                })
                ->where('status', 'completed')
                ->where('completed_by', $user->id)
                ->count();

            $results[] = [
                'user_id' => $user->id,
                'user_name' => $user->name,
                'total_leads' => $total,
                'won_leads' => $won,
                'conversion_rate' => $total > 0 ? round(($won / $total) * 100, 2) : 0,
                'total_activities' => $avgActivities,
                'activities_per_lead' => $total > 0 ? round($avgActivities / $total, 1) : 0,
            ];
        }

        // Ordena por taxa de conversão
        usort($results, fn($a, $b) => $b['conversion_rate'] <=> $a['conversion_rate']);

        return $results;
    }
}
