<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Permission extends Model
{
    use HasUuids;

    protected $fillable = [
        'key',
        'name',
        'description',
        'module',
    ];

    /**
     * Roles que têm essa permissão.
     */
    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(RolePermission::class, 'role_permissions', 'permission_id', 'id')
            ->withTimestamps();
    }

    /**
     * Usuários que têm essa permissão diretamente.
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_permissions')
            ->withPivot('granted')
            ->withTimestamps();
    }

    /**
     * Retorna todas as permissões agrupadas por módulo.
     */
    public static function getGroupedByModule(): array
    {
        return static::all()
            ->groupBy('module')
            ->map(fn($perms) => $perms->map(fn($p) => [
                'id' => $p->id,
                'key' => $p->key,
                'name' => $p->name,
            ])->values())
            ->toArray();
    }

    /**
     * Módulos disponíveis no sistema.
     */
    public static function getModules(): array
    {
        return [
            'leads' => 'Leads',
            'contacts' => 'Contatos',
            'tickets' => 'Tickets/Chat',
            'tasks' => 'Tarefas',
            'appointments' => 'Agendamentos',
            'products' => 'Produtos',
            'landing_pages' => 'Landing Pages',
            'sdr_ia' => 'SDR IA',
            'reports' => 'Relatórios',
            'channels' => 'Canais',
            'pipelines' => 'Pipelines',
            'users' => 'Usuários',
            'settings' => 'Configurações',
        ];
    }
}

