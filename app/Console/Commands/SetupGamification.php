<?php

namespace App\Console\Commands;

use App\Models\Achievement;
use App\Models\GamificationSettings;
use App\Models\GamificationTier;
use App\Models\PointRule;
use App\Models\Reward;
use App\Models\Tenant;
use Illuminate\Console\Command;

class SetupGamification extends Command
{
    protected $signature = 'gamification:setup {tenant_id?}';
    protected $description = 'Configura gamificação completa para processo comercial';

    public function handle()
    {
        $tenantId = $this->argument('tenant_id');

        if (!$tenantId) {
            $tenant = Tenant::first();
            if (!$tenant) {
                $this->error('Nenhum tenant encontrado. Crie um tenant primeiro.');
                return 1;
            }
            $tenantId = $tenant->id;
        }

        $this->info("Configurando gamificação para tenant: {$tenantId}");

        // 1. Configurações Gerais
        $this->setupSettings($tenantId);

        // 2. Tiers (Níveis)
        $tiers = $this->setupTiers($tenantId);

        // 3. Regras de Pontos
        $this->setupPointRules($tenantId);

        // 4. Recompensas
        $this->setupRewards($tenantId, $tiers);

        // 5. Conquistas
        $this->setupAchievements($tenantId);

        $this->newLine();
        $this->info('✅ Gamificação configurada com sucesso!');
        $this->newLine();
        $this->table(
            ['Item', 'Quantidade'],
            [
                ['Tiers', count($tiers)],
                ['Regras de Pontos', 8],
                ['Recompensas', 5],
                ['Conquistas', 6],
            ]
        );

        return 0;
    }

    protected function setupSettings(string $tenantId): void
    {
        $this->info('Configurando settings...');

        GamificationSettings::updateOrCreate(
            ['tenant_id' => $tenantId],
            [
                'is_enabled' => true,
                'reset_period' => 'monthly',
                'show_leaderboard' => true,
                'show_points_to_users' => true,
                'notify_tier_change' => true,
                'notify_achievement' => true,
                'sound_enabled' => true,
            ]
        );
    }

    protected function setupTiers(string $tenantId): array
    {
        $this->info('Criando tiers...');

        $tiersData = [
            [
                'name' => 'Bronze',
                'icon' => '🥉',
                'color' => '#CD7F32',
                'min_points' => 0,
                'max_points' => 499,
                'order' => 1,
            ],
            [
                'name' => 'Prata',
                'icon' => '🥈',
                'color' => '#C0C0C0',
                'min_points' => 500,
                'max_points' => 1499,
                'order' => 2,
            ],
            [
                'name' => 'Ouro',
                'icon' => '🥇',
                'color' => '#FFD700',
                'min_points' => 1500,
                'max_points' => 3499,
                'order' => 3,
            ],
            [
                'name' => 'Platina',
                'icon' => '💎',
                'color' => '#E5E4E2',
                'min_points' => 3500,
                'max_points' => 6999,
                'order' => 4,
            ],
            [
                'name' => 'Diamante',
                'icon' => '👑',
                'color' => '#B9F2FF',
                'min_points' => 7000,
                'max_points' => null,
                'order' => 5,
            ],
        ];

        $tiers = [];
        foreach ($tiersData as $data) {
            $tiers[$data['name']] = GamificationTier::updateOrCreate(
                ['tenant_id' => $tenantId, 'name' => $data['name']],
                $data
            );
        }

        return $tiers;
    }

    protected function setupPointRules(string $tenantId): void
    {
        $this->info('Criando regras de pontos...');

        $rules = [
            // Atividades do checklist
            [
                'name' => 'Atividade Concluída',
                'action_type' => 'activity_completed',
                'points' => 15,
                'multiplier' => 1.0,
                'is_active' => true,
            ],
            // Ligações
            [
                'name' => 'Ligação Realizada',
                'action_type' => 'call_made',
                'points' => 10,
                'multiplier' => 1.0,
                'is_active' => true,
            ],
            // Reuniões
            [
                'name' => 'Reunião Agendada',
                'action_type' => 'meeting_scheduled',
                'points' => 30,
                'multiplier' => 1.0,
                'is_active' => true,
            ],
            [
                'name' => 'Reunião Realizada',
                'action_type' => 'meeting_completed',
                'points' => 50,
                'multiplier' => 1.0,
                'is_active' => true,
            ],
            // Propostas
            [
                'name' => 'Proposta Enviada',
                'action_type' => 'proposal_sent',
                'points' => 40,
                'multiplier' => 1.0,
                'is_active' => true,
            ],
            // Vendas
            [
                'name' => 'Venda Fechada',
                'action_type' => 'deal_won',
                'points' => 200,
                'multiplier' => 1.0,
                'is_active' => true,
            ],
            // Bônus por valor da venda
            [
                'name' => 'Bônus Venda > R$5.000',
                'action_type' => 'deal_won',
                'points' => 100,
                'multiplier' => 1.0,
                'conditions' => ['min_value' => 5000],
                'is_active' => true,
            ],
            // Resposta rápida
            [
                'name' => 'Resposta Rápida (< 5min)',
                'action_type' => 'quick_response',
                'points' => 25,
                'multiplier' => 1.0,
                'is_active' => true,
            ],
        ];

        foreach ($rules as $rule) {
            PointRule::updateOrCreate(
                ['tenant_id' => $tenantId, 'name' => $rule['name']],
                array_merge($rule, ['tenant_id' => $tenantId])
            );
        }
    }

    protected function setupRewards(string $tenantId, array $tiers): void
    {
        $this->info('Criando recompensas...');

        $rewards = [
            [
                'tier' => 'Prata',
                'name' => 'Vale-Café R$50',
                'description' => 'Crédito de R$50 em cafeterias parceiras ou iFood',
                'type' => 'digital',
                'value' => 50,
                'is_active' => true,
            ],
            [
                'tier' => 'Ouro',
                'name' => 'Day Off',
                'description' => 'Um dia de folga para usar quando quiser (agendar com 1 semana de antecedência)',
                'type' => 'experience',
                'value' => 0,
                'is_active' => true,
            ],
            [
                'tier' => 'Ouro',
                'name' => 'Almoço Premium',
                'description' => 'Vale de R$150 para almoço em restaurante à escolha',
                'type' => 'physical',
                'value' => 150,
                'is_active' => true,
            ],
            [
                'tier' => 'Platina',
                'name' => 'Bônus R$500',
                'description' => 'Bônus em dinheiro adicionado ao próximo salário',
                'type' => 'bonus',
                'value' => 500,
                'is_active' => true,
            ],
            [
                'tier' => 'Diamante',
                'name' => 'Viagem de Final de Semana',
                'description' => 'Viagem com acompanhante para destino à escolha (até R$2.000)',
                'type' => 'experience',
                'value' => 2000,
                'is_active' => true,
            ],
        ];

        foreach ($rewards as $reward) {
            $tierName = $reward['tier'];
            unset($reward['tier']);

            if (isset($tiers[$tierName])) {
                Reward::updateOrCreate(
                    ['tenant_id' => $tenantId, 'name' => $reward['name']],
                    array_merge($reward, [
                        'tenant_id' => $tenantId,
                        'tier_id' => $tiers[$tierName]->id,
                    ])
                );
            }
        }
    }

    protected function setupAchievements(string $tenantId): void
    {
        $this->info('Criando conquistas...');

        $achievements = [
            [
                'name' => 'Primeiro Sangue',
                'description' => 'Fechou sua primeira venda!',
                'icon' => '🎯',
                'condition_type' => 'deals_count',
                'condition_value' => ['min' => 1],
                'points_bonus' => 50,
                'is_active' => true,
            ],
            [
                'name' => 'Vendedor Consistente',
                'description' => 'Fechou 5 vendas no mesmo mês',
                'icon' => '📈',
                'condition_type' => 'deals_count',
                'condition_value' => ['min' => 5, 'period' => 'month'],
                'points_bonus' => 150,
                'is_active' => true,
            ],
            [
                'name' => 'Maratonista',
                'description' => 'Fechou 10 vendas no mesmo mês',
                'icon' => '🏃',
                'condition_type' => 'deals_count',
                'condition_value' => ['min' => 10, 'period' => 'month'],
                'points_bonus' => 300,
                'is_active' => true,
            ],
            [
                'name' => 'Flash',
                'description' => 'Respondeu 10 leads em menos de 5 minutos',
                'icon' => '⚡',
                'condition_type' => 'quick_responses',
                'condition_value' => ['min' => 10],
                'points_bonus' => 100,
                'is_active' => true,
            ],
            [
                'name' => 'Perfeccionista',
                'description' => 'Completou 100% das atividades de 10 leads',
                'icon' => '✨',
                'condition_type' => 'perfect_activities',
                'condition_value' => ['min' => 10],
                'points_bonus' => 200,
                'is_active' => true,
            ],
            [
                'name' => 'Big Deal',
                'description' => 'Fechou uma venda acima de R$10.000',
                'icon' => '💰',
                'condition_type' => 'deal_value',
                'condition_value' => ['min' => 10000],
                'points_bonus' => 250,
                'is_active' => true,
            ],
        ];

        foreach ($achievements as $achievement) {
            Achievement::updateOrCreate(
                ['tenant_id' => $tenantId, 'name' => $achievement['name']],
                array_merge($achievement, ['tenant_id' => $tenantId])
            );
        }
    }
}
