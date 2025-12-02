<?php

namespace Database\Seeders;

use App\Enums\RoleEnum;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $tenant = Tenant::where('slug', 'empresa-demo')->first();

        if (!$tenant) {
            $this->command->error('Tenant "empresa-demo" não encontrado. Execute TenantSeeder primeiro.');
            return;
        }

        // Admin
        User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Admin Demo',
            'email' => 'admin@demo.com',
            'password' => Hash::make('password'),
            'role' => RoleEnum::ADMIN,
            'phone' => '5511999990001',
            'is_active' => true,
        ]);

        // Gestor
        User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Gestor Vendas',
            'email' => 'gestor@demo.com',
            'password' => Hash::make('password'),
            'role' => RoleEnum::GESTOR,
            'phone' => '5511999990002',
            'is_active' => true,
        ]);

        // Vendedores
        $vendedores = [
            ['name' => 'João Silva', 'email' => 'joao@demo.com', 'phone' => '5511999990003'],
            ['name' => 'Maria Santos', 'email' => 'maria@demo.com', 'phone' => '5511999990004'],
            ['name' => 'Pedro Oliveira', 'email' => 'pedro@demo.com', 'phone' => '5511999990005'],
        ];

        foreach ($vendedores as $vendedor) {
            User::create([
                'tenant_id' => $tenant->id,
                'name' => $vendedor['name'],
                'email' => $vendedor['email'],
                'password' => Hash::make('password'),
                'role' => RoleEnum::VENDEDOR,
                'phone' => $vendedor['phone'],
                'is_active' => true,
            ]);
        }

        // Marketing
        User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Ana Marketing',
            'email' => 'marketing@demo.com',
            'password' => Hash::make('password'),
            'role' => RoleEnum::MARKETING,
            'phone' => '5511999990006',
            'is_active' => true,
        ]);
    }
}


