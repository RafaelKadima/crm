<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\RolePermission;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class PermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Definição de todas as permissões do sistema
        $permissions = [
            // Módulo: Leads
            ['key' => 'leads.view_own', 'name' => 'Ver próprios leads', 'module' => 'leads'],
            ['key' => 'leads.view_all', 'name' => 'Ver todos os leads', 'module' => 'leads'],
            ['key' => 'leads.create', 'name' => 'Criar leads', 'module' => 'leads'],
            ['key' => 'leads.edit', 'name' => 'Editar leads', 'module' => 'leads'],
            ['key' => 'leads.delete', 'name' => 'Excluir leads', 'module' => 'leads'],
            ['key' => 'leads.assign', 'name' => 'Atribuir leads', 'module' => 'leads'],
            ['key' => 'leads.import', 'name' => 'Importar leads', 'module' => 'leads'],
            ['key' => 'leads.export', 'name' => 'Exportar leads', 'module' => 'leads'],

            // Módulo: Contatos
            ['key' => 'contacts.view', 'name' => 'Ver contatos', 'module' => 'contacts'],
            ['key' => 'contacts.create', 'name' => 'Criar contatos', 'module' => 'contacts'],
            ['key' => 'contacts.edit', 'name' => 'Editar contatos', 'module' => 'contacts'],
            ['key' => 'contacts.delete', 'name' => 'Excluir contatos', 'module' => 'contacts'],

            // Módulo: Tickets/Chat
            ['key' => 'tickets.view_own', 'name' => 'Ver próprios tickets', 'module' => 'tickets'],
            ['key' => 'tickets.view_all', 'name' => 'Ver todos os tickets', 'module' => 'tickets'],
            ['key' => 'tickets.respond', 'name' => 'Responder tickets', 'module' => 'tickets'],
            ['key' => 'tickets.transfer', 'name' => 'Transferir tickets', 'module' => 'tickets'],
            ['key' => 'tickets.close', 'name' => 'Fechar tickets', 'module' => 'tickets'],

            // Módulo: Tarefas
            ['key' => 'tasks.view_own', 'name' => 'Ver próprias tarefas', 'module' => 'tasks'],
            ['key' => 'tasks.view_all', 'name' => 'Ver todas as tarefas', 'module' => 'tasks'],
            ['key' => 'tasks.create', 'name' => 'Criar tarefas', 'module' => 'tasks'],
            ['key' => 'tasks.edit', 'name' => 'Editar tarefas', 'module' => 'tasks'],
            ['key' => 'tasks.delete', 'name' => 'Excluir tarefas', 'module' => 'tasks'],

            // Módulo: Agendamentos
            ['key' => 'appointments.view', 'name' => 'Ver agendamentos', 'module' => 'appointments'],
            ['key' => 'appointments.create', 'name' => 'Criar agendamentos', 'module' => 'appointments'],
            ['key' => 'appointments.edit', 'name' => 'Editar agendamentos', 'module' => 'appointments'],
            ['key' => 'appointments.delete', 'name' => 'Excluir agendamentos', 'module' => 'appointments'],

            // Módulo: Produtos
            ['key' => 'products.view', 'name' => 'Ver produtos', 'module' => 'products'],
            ['key' => 'products.create', 'name' => 'Criar produtos', 'module' => 'products'],
            ['key' => 'products.edit', 'name' => 'Editar produtos', 'module' => 'products'],
            ['key' => 'products.delete', 'name' => 'Excluir produtos', 'module' => 'products'],

            // Módulo: Landing Pages
            ['key' => 'landing_pages.view', 'name' => 'Ver landing pages', 'module' => 'landing_pages'],
            ['key' => 'landing_pages.create', 'name' => 'Criar landing pages', 'module' => 'landing_pages'],
            ['key' => 'landing_pages.edit', 'name' => 'Editar landing pages', 'module' => 'landing_pages'],
            ['key' => 'landing_pages.delete', 'name' => 'Excluir landing pages', 'module' => 'landing_pages'],
            ['key' => 'landing_pages.publish', 'name' => 'Publicar landing pages', 'module' => 'landing_pages'],

            // Módulo: SDR IA
            ['key' => 'sdr_ia.view', 'name' => 'Ver SDR IA', 'module' => 'sdr_ia'],
            ['key' => 'sdr_ia.configure', 'name' => 'Configurar SDR IA', 'module' => 'sdr_ia'],
            ['key' => 'sdr_ia.train', 'name' => 'Treinar SDR IA', 'module' => 'sdr_ia'],

            // Módulo: Relatórios
            ['key' => 'reports.view_own', 'name' => 'Ver relatórios próprios', 'module' => 'reports'],
            ['key' => 'reports.view_all', 'name' => 'Ver todos os relatórios', 'module' => 'reports'],
            ['key' => 'reports.export', 'name' => 'Exportar relatórios', 'module' => 'reports'],

            // Módulo: Canais
            ['key' => 'channels.view', 'name' => 'Ver canais', 'module' => 'channels'],
            ['key' => 'channels.create', 'name' => 'Criar canais', 'module' => 'channels'],
            ['key' => 'channels.edit', 'name' => 'Editar canais', 'module' => 'channels'],
            ['key' => 'channels.delete', 'name' => 'Excluir canais', 'module' => 'channels'],

            // Módulo: Pipelines
            ['key' => 'pipelines.view', 'name' => 'Ver pipelines', 'module' => 'pipelines'],
            ['key' => 'pipelines.create', 'name' => 'Criar pipelines', 'module' => 'pipelines'],
            ['key' => 'pipelines.edit', 'name' => 'Editar pipelines', 'module' => 'pipelines'],
            ['key' => 'pipelines.delete', 'name' => 'Excluir pipelines', 'module' => 'pipelines'],

            // Módulo: Usuários
            ['key' => 'users.view', 'name' => 'Ver usuários', 'module' => 'users'],
            ['key' => 'users.create', 'name' => 'Criar usuários', 'module' => 'users'],
            ['key' => 'users.edit', 'name' => 'Editar usuários', 'module' => 'users'],
            ['key' => 'users.delete', 'name' => 'Excluir usuários', 'module' => 'users'],
            ['key' => 'users.manage_permissions', 'name' => 'Gerenciar permissões', 'module' => 'users'],

            // Módulo: Configurações
            ['key' => 'settings.view', 'name' => 'Ver configurações', 'module' => 'settings'],
            ['key' => 'settings.edit', 'name' => 'Editar configurações', 'module' => 'settings'],
            ['key' => 'settings.integrations', 'name' => 'Gerenciar integrações', 'module' => 'settings'],
        ];

        // Criar permissões
        foreach ($permissions as $perm) {
            Permission::updateOrCreate(
                ['key' => $perm['key']],
                [
                    'name' => $perm['name'],
                    'module' => $perm['module'],
                ]
            );
        }

        // Definição de permissões por role
        $rolePermissions = [
            'admin' => [
                // Admin tem todas as permissões
                'leads.*', 'contacts.*', 'tickets.*', 'tasks.*', 'appointments.*',
                'products.*', 'landing_pages.*', 'sdr_ia.*', 'reports.*',
                'channels.*', 'pipelines.*', 'users.*', 'settings.*',
            ],
            'gestor' => [
                'leads.view_all', 'leads.create', 'leads.edit', 'leads.assign', 'leads.export',
                'contacts.*', 
                'tickets.view_all', 'tickets.respond', 'tickets.transfer', 'tickets.close',
                'tasks.view_all', 'tasks.create', 'tasks.edit',
                'appointments.*',
                'products.view',
                'landing_pages.view',
                'sdr_ia.view',
                'reports.view_all', 'reports.export',
                'channels.view',
                'pipelines.view',
                'users.view',
                'settings.view',
            ],
            'vendedor' => [
                'leads.view_own', 'leads.create', 'leads.edit',
                'contacts.view', 'contacts.create', 'contacts.edit',
                'tickets.view_own', 'tickets.respond',
                'tasks.view_own', 'tasks.create', 'tasks.edit',
                'appointments.view', 'appointments.create', 'appointments.edit',
                'products.view',
                'reports.view_own',
            ],
            'marketing' => [
                'leads.view_all', 'leads.import', 'leads.export',
                'contacts.view', 'contacts.create',
                'landing_pages.*',
                'reports.view_all', 'reports.export',
                'products.view', 'products.create', 'products.edit',
            ],
        ];

        // Limpar permissões de roles existentes
        RolePermission::truncate();

        // Atribuir permissões aos roles
        $allPermissions = Permission::all()->keyBy('key');

        foreach ($rolePermissions as $role => $permKeys) {
            foreach ($permKeys as $permKey) {
                if (str_ends_with($permKey, '.*')) {
                    // Wildcard - todas as permissões do módulo
                    $module = str_replace('.*', '', $permKey);
                    $modulePerms = $allPermissions->filter(fn($p) => $p->module === $module);
                    
                    foreach ($modulePerms as $perm) {
                        RolePermission::create([
                            'role' => $role,
                            'permission_id' => $perm->id,
                        ]);
                    }
                } else {
                    // Permissão específica
                    if (isset($allPermissions[$permKey])) {
                        RolePermission::create([
                            'role' => $role,
                            'permission_id' => $allPermissions[$permKey]->id,
                        ]);
                    }
                }
            }
        }

        $this->command->info('Permissões criadas com sucesso!');
    }
}

