<?php

namespace Database\Seeders;

use App\Models\Contact;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;

class ContactSeeder extends Seeder
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

        $vendedores = User::where('tenant_id', $tenant->id)
            ->where('role', 'vendedor')
            ->get();

        $contacts = [
            [
                'name' => 'Carlos Mendes',
                'phone' => '5511911111111',
                'email' => 'carlos@empresa1.com',
                'cpf' => '123.456.789-00',
                'source' => 'facebook_ads',
            ],
            [
                'name' => 'Ana Paula Costa',
                'phone' => '5511922222222',
                'email' => 'ana@empresa2.com',
                'cpf' => '234.567.890-11',
                'source' => 'google_ads',
            ],
            [
                'name' => 'Roberto Ferreira',
                'phone' => '5511933333333',
                'email' => 'roberto@empresa3.com',
                'cpf' => '345.678.901-22',
                'source' => 'indicacao',
            ],
            [
                'name' => 'Juliana Lima',
                'phone' => '5511944444444',
                'email' => 'juliana@empresa4.com',
                'source' => 'organico',
            ],
            [
                'name' => 'Marcos Souza',
                'phone' => '5511955555555',
                'email' => 'marcos@empresa5.com',
                'source' => 'facebook_ads',
            ],
            [
                'name' => 'Fernanda Oliveira',
                'phone' => '5511966666666',
                'email' => 'fernanda@empresa6.com',
                'source' => 'google_ads',
            ],
            [
                'name' => 'Lucas Santos',
                'phone' => '5511977777777',
                'email' => 'lucas@empresa7.com',
                'source' => 'indicacao',
            ],
            [
                'name' => 'Patrícia Alves',
                'phone' => '5511988888888',
                'email' => 'patricia@empresa8.com',
                'source' => 'organico',
            ],
        ];

        foreach ($contacts as $index => $contactData) {
            // Distribui os contatos entre os vendedores
            $ownerId = $vendedores->count() > 0 
                ? $vendedores[$index % $vendedores->count()]->id 
                : null;

            Contact::create([
                'tenant_id' => $tenant->id,
                'name' => $contactData['name'],
                'phone' => $contactData['phone'],
                'email' => $contactData['email'],
                'cpf' => $contactData['cpf'] ?? null,
                'source' => $contactData['source'],
                'owner_id' => $ownerId,
                'address' => [
                    'street' => 'Rua das Flores',
                    'number' => (string) ($index + 100),
                    'city' => 'São Paulo',
                    'state' => 'SP',
                    'zip' => '01234-567',
                ],
            ]);
        }
    }
}


