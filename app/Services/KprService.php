<?php

namespace App\Services;

use App\Enums\LeadStatusEnum;
use App\Models\DealStageActivity;
use App\Models\Kpr;
use App\Models\KprAssignment;
use App\Models\KprSnapshot;
use App\Models\Lead;
use App\Models\Team;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class KprService
{
    /**
     * Cria uma nova meta (KPR).
     */
    public function create(array $data): Kpr
    {
        return DB::transaction(function () use ($data) {
            $kpr = Kpr::create($data);

            // Se já tem distribuição, aplica
            if (!empty($data['distributions'])) {
                $this->distribute($kpr, $data['distributions']);
            }

            return $kpr;
        });
    }

    /**
     * Distribui a meta entre equipes ou usuários.
     * Recebe porcentagem e calcula o valor a partir da meta total.
     */
    public function distribute(Kpr $kpr, array $distributions): void
    {
        DB::transaction(function () use ($kpr, $distributions) {
            foreach ($distributions as $dist) {
                $assignableType = $dist['type'] === 'team' ? Team::class : User::class;

                // Calcula o valor alvo a partir da porcentagem
                $percentage = $dist['percentage'];
                $targetValue = ($percentage / 100) * $kpr->target_value;

                KprAssignment::updateOrCreate(
                    [
                        'kpr_id' => $kpr->id,
                        'assignable_type' => $assignableType,
                        'assignable_id' => $dist['id'],
                    ],
                    [
                        'tenant_id' => $kpr->tenant_id,
                        'target_value' => round($targetValue, 2),
                        'weight' => $percentage,
                        'parent_assignment_id' => $dist['parent_id'] ?? null,
                    ]
                );
            }
        });
    }

    /**
     * Recalcula os valores das distribuições quando o target_value muda.
     * Mantém as porcentagens e atualiza os valores proporcionalmente.
     */
    public function recalculateDistributions(Kpr $kpr): void
    {
        DB::transaction(function () use ($kpr) {
            $assignments = $kpr->assignments()->get();

            foreach ($assignments as $assignment) {
                // Recalcula o valor baseado na porcentagem (weight)
                $newTargetValue = ($assignment->weight / 100) * $kpr->target_value;

                $assignment->update([
                    'target_value' => round($newTargetValue, 2),
                ]);
            }
        });
    }

    /**
     * Distribui a meta igualmente entre vendedores de uma equipe.
     */
    public function distributeEquallyToTeamMembers(Kpr $kpr, Team $team): void
    {
        $users = $team->users()->where('is_active', true)->get();
        $count = $users->count();

        if ($count === 0) {
            return;
        }

        $valuePerUser = $kpr->target_value / $count;
        $weightPerUser = 100 / $count;

        // Primeiro cria a atribuição da equipe
        $teamAssignment = KprAssignment::updateOrCreate(
            [
                'kpr_id' => $kpr->id,
                'assignable_type' => Team::class,
                'assignable_id' => $team->id,
            ],
            [
                'tenant_id' => $kpr->tenant_id,
                'target_value' => $kpr->target_value,
                'weight' => 100,
            ]
        );

        // Depois distribui para os membros
        foreach ($users as $user) {
            KprAssignment::updateOrCreate(
                [
                    'kpr_id' => $kpr->id,
                    'assignable_type' => User::class,
                    'assignable_id' => $user->id,
                ],
                [
                    'tenant_id' => $kpr->tenant_id,
                    'target_value' => round($valuePerUser, 2),
                    'weight' => round($weightPerUser, 2),
                    'parent_assignment_id' => $teamAssignment->id,
                ]
            );
        }
    }

    /**
     * Distribui a meta proporcionalmente baseado em performance histórica.
     */
    public function distributeByPerformance(Kpr $kpr, Team $team, int $lookbackMonths = 3): void
    {
        $users = $team->users()->where('is_active', true)->get();

        if ($users->isEmpty()) {
            return;
        }

        // Calcula performance histórica de cada usuário
        $performances = [];
        $totalPerformance = 0;

        $startDate = now()->subMonths($lookbackMonths)->startOfMonth();
        $endDate = now()->subDay();

        foreach ($users as $user) {
            $performance = Lead::where('owner_id', $user->id)
                ->where('status', LeadStatusEnum::WON)
                ->whereBetween('updated_at', [$startDate, $endDate])
                ->sum('value');

            $performances[$user->id] = $performance;
            $totalPerformance += $performance;
        }

        // Se não tem histórico, distribui igualmente
        if ($totalPerformance === 0) {
            $this->distributeEquallyToTeamMembers($kpr, $team);
            return;
        }

        // Cria atribuição da equipe
        $teamAssignment = KprAssignment::updateOrCreate(
            [
                'kpr_id' => $kpr->id,
                'assignable_type' => Team::class,
                'assignable_id' => $team->id,
            ],
            [
                'tenant_id' => $kpr->tenant_id,
                'target_value' => $kpr->target_value,
                'weight' => 100,
            ]
        );

        // Distribui proporcionalmente
        foreach ($users as $user) {
            $weight = ($performances[$user->id] / $totalPerformance) * 100;
            $targetValue = ($performances[$user->id] / $totalPerformance) * $kpr->target_value;

            KprAssignment::updateOrCreate(
                [
                    'kpr_id' => $kpr->id,
                    'assignable_type' => User::class,
                    'assignable_id' => $user->id,
                ],
                [
                    'tenant_id' => $kpr->tenant_id,
                    'target_value' => round($targetValue, 2),
                    'weight' => round($weight, 2),
                    'parent_assignment_id' => $teamAssignment->id,
                    'metadata' => [
                        'distribution_method' => 'performance',
                        'historical_value' => $performances[$user->id],
                    ],
                ]
            );
        }
    }

    /**
     * Recalcula o progresso de todas as atribuições de uma KPR.
     */
    public function recalculateProgress(Kpr $kpr): void
    {
        $assignments = $kpr->assignments()
            ->orderBy('parent_assignment_id', 'asc') // Processa filhos primeiro
            ->get();

        foreach ($assignments as $assignment) {
            $assignment->updateProgress();
        }
    }

    /**
     * Recalcula todas as KPRs ativas de um tenant.
     */
    public function recalculateAllActive(string $tenantId): void
    {
        $kprs = Kpr::where('tenant_id', $tenantId)
            ->active()
            ->currentPeriod()
            ->get();

        foreach ($kprs as $kpr) {
            $this->recalculateProgress($kpr);
        }
    }

    /**
     * Cria snapshots diários para todas as KPRs ativas.
     */
    public function createDailySnapshots(string $tenantId): void
    {
        $kprs = Kpr::where('tenant_id', $tenantId)
            ->active()
            ->currentPeriod()
            ->with('assignments')
            ->get();

        foreach ($kprs as $kpr) {
            // Snapshot global
            KprSnapshot::createForKpr($kpr);

            // Snapshots individuais
            foreach ($kpr->assignments as $assignment) {
                KprSnapshot::createForAssignment($assignment);
            }
        }
    }

    /**
     * Retorna o dashboard de metas para um usuário.
     */
    public function getUserDashboard(User $user): array
    {
        $assignments = KprAssignment::forUser($user->id)
            ->whereHas('kpr', function ($q) {
                $q->active()->currentPeriod();
            })
            ->with(['kpr', 'snapshots' => function ($q) {
                $q->orderBy('snapshot_date', 'desc')->limit(30);
            }])
            ->get();

        return [
            'assignments' => $assignments->map(function ($assignment) {
                return [
                    'id' => $assignment->id,
                    'kpr' => [
                        'id' => $assignment->kpr->id,
                        'name' => $assignment->kpr->name,
                        'type' => $assignment->kpr->type,
                        'period_start' => $assignment->kpr->period_start->format('Y-m-d'),
                        'period_end' => $assignment->kpr->period_end->format('Y-m-d'),
                        'remaining_days' => $assignment->kpr->remaining_days,
                    ],
                    'target_value' => $assignment->target_value,
                    'current_value' => $assignment->current_value,
                    'progress_percentage' => $assignment->progress_percentage,
                    'remaining_value' => $assignment->remaining_value,
                    'track_status' => $assignment->kpr->track_status,
                    'trend' => $this->calculateTrend($assignment),
                    'contributing_leads' => $assignment->getContributingLeads()->count(),
                    'contributing_activities' => $assignment->getContributingActivities()->count(),
                ];
            }),
            'summary' => [
                'total_targets' => $assignments->sum('target_value'),
                'total_current' => $assignments->sum('current_value'),
                'overall_progress' => $assignments->sum('target_value') > 0
                    ? round(($assignments->sum('current_value') / $assignments->sum('target_value')) * 100, 2)
                    : 0,
            ],
        ];
    }

    /**
     * Retorna o dashboard de metas para uma equipe.
     */
    public function getTeamDashboard(Team $team): array
    {
        $teamAssignments = KprAssignment::where('assignable_type', Team::class)
            ->where('assignable_id', $team->id)
            ->whereHas('kpr', function ($q) {
                $q->active()->currentPeriod();
            })
            ->with(['kpr', 'children.assignable'])
            ->get();

        return [
            'team' => [
                'id' => $team->id,
                'name' => $team->name,
            ],
            'kprs' => $teamAssignments->map(function ($assignment) {
                return [
                    'id' => $assignment->id,
                    'kpr' => [
                        'id' => $assignment->kpr->id,
                        'name' => $assignment->kpr->name,
                        'type' => $assignment->kpr->type,
                    ],
                    'target_value' => $assignment->target_value,
                    'current_value' => $assignment->current_value,
                    'progress_percentage' => $assignment->progress_percentage,
                    'members' => $assignment->children->map(function ($child) {
                        return [
                            'id' => $child->assignable_id,
                            'name' => $child->assignable?->name,
                            'target_value' => $child->target_value,
                            'current_value' => $child->current_value,
                            'progress_percentage' => $child->progress_percentage,
                        ];
                    })->sortByDesc('current_value')->values(),
                ];
            }),
        ];
    }

    /**
     * Retorna o ranking de vendedores de uma KPR.
     */
    public function getRanking(Kpr $kpr): Collection
    {
        return $kpr->userAssignments()
            ->with('assignable')
            ->orderByDesc('current_value')
            ->get()
            ->map(function ($assignment, $index) {
                return [
                    'rank' => $index + 1,
                    'user_id' => $assignment->assignable_id,
                    'user_name' => $assignment->assignable?->name,
                    'target_value' => $assignment->target_value,
                    'current_value' => $assignment->current_value,
                    'progress_percentage' => $assignment->progress_percentage,
                    'remaining_value' => $assignment->remaining_value,
                ];
            });
    }

    /**
     * Calcula a tendência baseada nos snapshots.
     */
    protected function calculateTrend(KprAssignment $assignment): array
    {
        $snapshots = $assignment->snapshots()
            ->orderBy('snapshot_date', 'desc')
            ->limit(7)
            ->get();

        if ($snapshots->count() < 2) {
            return ['direction' => 'stable', 'change' => 0];
        }

        $latest = $snapshots->first()->current_value;
        $previous = $snapshots->last()->current_value;
        $change = $previous > 0 ? (($latest - $previous) / $previous) * 100 : 0;

        return [
            'direction' => $change > 5 ? 'up' : ($change < -5 ? 'down' : 'stable'),
            'change' => round($change, 2),
        ];
    }
}
