<?php

namespace Database\Seeders;

use App\Enums\GroupRoleEnum;
use App\Models\Group;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;

class GroupSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Busca todos os tenants
        $tenants = Tenant::all();

        if ($tenants->count() < 2) {
            $this->command->warn('Precisa de pelo menos 2 tenants para criar um grupo.');
            return;
        }

        // Cria um grupo de demonstração
        $group = Group::create([
            'name' => 'Grupo Demo Holdings',
            'slug' => 'grupo-demo-holdings',
            'description' => 'Grupo de demonstração com múltiplas lojas',
            'is_active' => true,
            'settings' => [
                'timezone' => 'America/Sao_Paulo',
            ],
        ]);

        // Adiciona todos os tenants ao grupo
        $group->tenants()->attach($tenants->pluck('id'));

        // Adiciona o admin do primeiro tenant como owner do grupo
        $admin = User::where('email', 'admin@demo.com')->first();

        if ($admin) {
            $group->users()->attach($admin->id, ['role' => GroupRoleEnum::OWNER->value]);
        }

        // Adiciona o gestor como viewer do grupo
        $gestor = User::where('email', 'gestor@demo.com')->first();

        if ($gestor) {
            $group->users()->attach($gestor->id, ['role' => GroupRoleEnum::VIEWER->value]);
        }

        $this->command->info("Grupo '{$group->name}' criado com {$tenants->count()} lojas.");
    }
}

