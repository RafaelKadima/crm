<?php

namespace Database\Seeders;

use App\Enums\ChannelTypeEnum;
use App\Enums\IaModeEnum;
use App\Models\Channel;
use App\Models\Tenant;
use Illuminate\Database\Seeder;

class ChannelSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $tenant = Tenant::where('slug', 'empresa-demo')->first();

        if (!$tenant) {
            $this->command->error('Tenant "empresa-demo" não encontrado.');
            return;
        }

        // WhatsApp Principal com IA SDR
        Channel::create([
            'tenant_id' => $tenant->id,
            'name' => 'WhatsApp Principal',
            'type' => ChannelTypeEnum::WHATSAPP,
            'identifier' => '5511999999999',
            'ia_mode' => IaModeEnum::IA_SDR,
            'ia_workflow_id' => 'n8n-whatsapp-workflow',
            'is_active' => true,
        ]);

        // WhatsApp Vendas Diretas (sem IA)
        Channel::create([
            'tenant_id' => $tenant->id,
            'name' => 'WhatsApp Vendas',
            'type' => ChannelTypeEnum::WHATSAPP,
            'identifier' => '5511988888888',
            'ia_mode' => IaModeEnum::NONE,
            'is_active' => true,
        ]);

        // Instagram
        Channel::create([
            'tenant_id' => $tenant->id,
            'name' => 'Instagram DM',
            'type' => ChannelTypeEnum::INSTAGRAM,
            'identifier' => '@empresa_demo',
            'ia_mode' => IaModeEnum::IA_SDR,
            'ia_workflow_id' => 'n8n-instagram-workflow',
            'is_active' => true,
        ]);

        // Webchat
        Channel::create([
            'tenant_id' => $tenant->id,
            'name' => 'Chat do Site',
            'type' => ChannelTypeEnum::WEBCHAT,
            'identifier' => 'chat.empresademo.com',
            'ia_mode' => IaModeEnum::ENTERPRISE,
            'ia_workflow_id' => 'n8n-webchat-workflow',
            'is_active' => true,
        ]);
    }
}


