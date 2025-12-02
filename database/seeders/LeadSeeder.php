<?php

namespace Database\Seeders;

use App\Enums\IaModeEnum;
use App\Enums\LeadStatusEnum;
use App\Models\Channel;
use App\Models\Contact;
use App\Models\Lead;
use App\Models\Pipeline;
use App\Models\PipelineStage;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;

class LeadSeeder extends Seeder
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

        $pipeline = Pipeline::where('tenant_id', $tenant->id)->where('is_default', true)->first();
        $stages = PipelineStage::where('pipeline_id', $pipeline->id)->orderBy('order')->get();
        $channels = Channel::where('tenant_id', $tenant->id)->get();
        $contacts = Contact::where('tenant_id', $tenant->id)->get();
        $vendedores = User::where('tenant_id', $tenant->id)->where('role', 'vendedor')->get();

        if ($contacts->isEmpty() || $stages->isEmpty()) {
            $this->command->error('Contatos ou estágios não encontrados.');
            return;
        }

        // Cria leads distribuídos pelos estágios
        foreach ($contacts as $index => $contact) {
            $stage = $stages[$index % $stages->count()];
            $channel = $channels[$index % $channels->count()];
            $owner = $vendedores->count() > 0 ? $vendedores[$index % $vendedores->count()] : null;

            // Define status baseado no estágio
            $status = LeadStatusEnum::OPEN;
            if ($stage->slug === 'fechamento') {
                $status = $index % 2 === 0 ? LeadStatusEnum::WON : LeadStatusEnum::OPEN;
            }

            Lead::create([
                'tenant_id' => $tenant->id,
                'contact_id' => $contact->id,
                'pipeline_id' => $pipeline->id,
                'stage_id' => $stage->id,
                'channel_id' => $channel->id,
                'owner_id' => $owner?->id,
                'status' => $status,
                'value' => rand(1000, 50000),
                'expected_close_date' => now()->addDays(rand(7, 60)),
                'ia_mode_at_creation' => $channel->ia_mode ?? IaModeEnum::NONE,
                'last_message_at' => now()->subHours(rand(1, 72)),
            ]);
        }
    }
}


