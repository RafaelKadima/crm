<?php

namespace Database\Seeders;

use App\Models\Kpi;
use App\Models\Tenant;
use Illuminate\Database\Seeder;

class DefaultKpisSeeder extends Seeder
{
    /**
     * KPIs padrão do sistema.
     */
    protected array $defaultKpis = [
        [
            'key' => 'conversion_rate',
            'name' => 'Taxa de Conversão',
            'description' => 'Porcentagem de leads que foram convertidos em vendas',
            'formula_type' => 'ratio',
            'source' => 'leads',
            'unit' => '%',
            'icon' => 'TrendingUp',
            'color' => '#10B981',
            'weight' => 100,
            'display_order' => 1,
        ],
        [
            'key' => 'average_ticket',
            'name' => 'Ticket Médio',
            'description' => 'Valor médio das vendas realizadas',
            'formula_type' => 'average',
            'source' => 'leads',
            'unit' => 'R$',
            'icon' => 'DollarSign',
            'color' => '#3B82F6',
            'weight' => 90,
            'display_order' => 2,
        ],
        [
            'key' => 'cycle_time',
            'name' => 'Ciclo de Vendas',
            'description' => 'Tempo médio para fechar uma venda (dias)',
            'formula_type' => 'average',
            'source' => 'leads',
            'unit' => 'dias',
            'icon' => 'Clock',
            'color' => '#8B5CF6',
            'weight' => 80,
            'display_order' => 3,
        ],
        [
            'key' => 'loss_rate',
            'name' => 'Taxa de Perda',
            'description' => 'Porcentagem de leads perdidos',
            'formula_type' => 'ratio',
            'source' => 'leads',
            'unit' => '%',
            'icon' => 'XCircle',
            'color' => '#EF4444',
            'weight' => 70,
            'display_order' => 4,
        ],
        [
            'key' => 'follow_up_rate',
            'name' => 'Taxa de Follow-up',
            'description' => 'Porcentagem de leads com follow-up realizado',
            'formula_type' => 'ratio',
            'source' => 'activities',
            'unit' => '%',
            'icon' => 'PhoneCall',
            'color' => '#F59E0B',
            'weight' => 60,
            'display_order' => 5,
        ],
        [
            'key' => 'activities_per_lead',
            'name' => 'Atividades por Lead',
            'description' => 'Número médio de atividades por lead',
            'formula_type' => 'average',
            'source' => 'activities',
            'unit' => '',
            'icon' => 'Activity',
            'color' => '#06B6D4',
            'weight' => 50,
            'display_order' => 6,
        ],
        [
            'key' => 'response_time',
            'name' => 'Tempo de Resposta',
            'description' => 'Tempo médio para primeira resposta ao lead (minutos)',
            'formula_type' => 'average',
            'source' => 'activities',
            'unit' => 'min',
            'icon' => 'MessageCircle',
            'color' => '#EC4899',
            'weight' => 40,
            'display_order' => 7,
        ],
        [
            'key' => 'pipeline_value',
            'name' => 'Valor do Pipeline',
            'description' => 'Valor total de leads em aberto no funil',
            'formula_type' => 'sum',
            'source' => 'leads',
            'unit' => 'R$',
            'icon' => 'Briefcase',
            'color' => '#84CC16',
            'weight' => 30,
            'display_order' => 8,
        ],
    ];

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get all tenants
        $tenants = Tenant::all();

        foreach ($tenants as $tenant) {
            $this->createDefaultKpisForTenant($tenant->id);
        }

        $this->command->info('Default KPIs created for all tenants.');
    }

    /**
     * Create default KPIs for a specific tenant.
     */
    public function createDefaultKpisForTenant(string $tenantId): void
    {
        foreach ($this->defaultKpis as $kpiData) {
            Kpi::firstOrCreate(
                [
                    'tenant_id' => $tenantId,
                    'key' => $kpiData['key'],
                ],
                array_merge($kpiData, [
                    'tenant_id' => $tenantId,
                    'is_active' => true,
                    'is_system' => true, // Marcado como KPI do sistema
                ])
            );
        }
    }

    /**
     * Get default KPIs array (for programmatic use).
     */
    public function getDefaultKpis(): array
    {
        return $this->defaultKpis;
    }
}
