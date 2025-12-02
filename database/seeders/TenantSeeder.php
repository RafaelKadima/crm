<?php

namespace Database\Seeders;

use App\Enums\PlanEnum;
use App\Models\Tenant;
use Illuminate\Database\Seeder;

class TenantSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Tenant de demonstração - Plano Enterprise
        Tenant::create([
            'name' => 'Empresa Demo',
            'slug' => 'empresa-demo',
            'plan' => PlanEnum::ENTERPRISE,
            'whatsapp_number' => '5511999999999',
            'ia_enabled' => true,
            'ia_workflow_id' => 'workflow-demo-123',
            'settings' => [
                'gtm_webhook_url' => null,
                'timezone' => 'America/Sao_Paulo',
            ],
            'is_active' => true,
        ]);

        // Tenant secundário - Plano IA SDR
        Tenant::create([
            'name' => 'Startup Tech',
            'slug' => 'startup-tech',
            'plan' => PlanEnum::IA_SDR,
            'whatsapp_number' => '5511888888888',
            'ia_enabled' => true,
            'ia_workflow_id' => 'workflow-tech-456',
            'settings' => [
                'timezone' => 'America/Sao_Paulo',
            ],
            'is_active' => true,
        ]);

        // Tenant terciário - Plano Basic
        Tenant::create([
            'name' => 'Loja Simples',
            'slug' => 'loja-simples',
            'plan' => PlanEnum::BASIC,
            'whatsapp_number' => '5511777777777',
            'ia_enabled' => false,
            'ia_workflow_id' => null,
            'settings' => [
                'timezone' => 'America/Sao_Paulo',
            ],
            'is_active' => true,
        ]);
    }
}


