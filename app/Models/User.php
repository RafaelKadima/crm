<?php

namespace App\Models;

use App\Enums\RoleEnum;
use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use App\Models\RolePermission;
use App\Models\Permission;
use Illuminate\Notifications\Notifiable;
use Laravel\Passport\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, HasUuids, Notifiable, BelongsToTenant;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'tenant_id',
        'name',
        'email',
        'password',
        'role',
        'phone',
        'avatar',
        'is_active',
        'is_super_admin',
        // Campos de integracao Linx
        'linx_empresa_id',
        'linx_vendedor_id',
        'linx_loja_id',
        'linx_showroom_id',
        'external_integrations',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'role' => RoleEnum::class,
            'is_active' => 'boolean',
            'is_super_admin' => 'boolean',
            'external_integrations' => 'array',
        ];
    }

    /**
     * Verifica se o usuario tem configuracao Linx completa.
     */
    public function hasLinxConfig(): bool
    {
        return !empty($this->linx_empresa_id) && !empty($this->linx_vendedor_id);
    }

    /**
     * Relacionamento com times.
     */
    public function teams(): BelongsToMany
    {
        return $this->belongsToMany(Team::class)->withTimestamps();
    }

    /**
     * Leads que o usuário é responsável.
     */
    public function leads(): HasMany
    {
        return $this->hasMany(Lead::class, 'owner_id');
    }

    /**
     * Tickets atribuídos ao usuário.
     */
    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class, 'assigned_user_id');
    }

    /**
     * Filas/Setores que o usuário participa.
     */
    public function queues(): BelongsToMany
    {
        return $this->belongsToMany(Queue::class, 'queue_user')
            ->withPivot(['is_active', 'priority'])
            ->withTimestamps();
    }

    /**
     * Filas ativas do usuário.
     */
    public function activeQueues(): BelongsToMany
    {
        return $this->queues()->wherePivot('is_active', true);
    }

    /**
     * Tarefas atribuídas ao usuário.
     */
    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class, 'assigned_user_id');
    }

    /**
     * Contatos na carteira do usuário.
     */
    public function contacts(): HasMany
    {
        return $this->hasMany(Contact::class, 'owner_id');
    }

    /**
     * Grupos que o usuário tem acesso.
     */
    public function groups(): BelongsToMany
    {
        return $this->belongsToMany(Group::class, 'group_user')
            ->withPivot('role')
            ->withTimestamps();
    }

    /**
     * Grupos que o usuário é owner.
     */
    public function ownedGroups(): BelongsToMany
    {
        return $this->groups()->wherePivot('role', 'owner');
    }

    /**
     * Obtém todos os tenant_ids que o usuário tem acesso via grupos.
     */
    public function getAccessibleTenantIds(): array
    {
        $tenantIds = [$this->tenant_id];

        foreach ($this->groups as $group) {
            $tenantIds = array_merge($tenantIds, $group->getTenantIds());
        }

        return array_unique(array_filter($tenantIds));
    }

    /**
     * Verifica se o usuário tem acesso a um tenant específico.
     */
    public function hasAccessToTenant(string $tenantId): bool
    {
        return in_array($tenantId, $this->getAccessibleTenantIds());
    }

    /**
     * Verifica se o usuário é admin.
     */
    public function isAdmin(): bool
    {
        return $this->role === RoleEnum::ADMIN;
    }

    /**
     * Verifica se o usuário é gestor.
     */
    public function isGestor(): bool
    {
        return $this->role === RoleEnum::GESTOR;
    }

    /**
     * Verifica se o usuário pode gerenciar outros usuários.
     */
    public function canManageUsers(): bool
    {
        return $this->role->canManageUsers();
    }

    /**
     * Verifica se o usuário pode ver todos os leads.
     */
    public function canViewAllLeads(): bool
    {
        return $this->role->canViewAllLeads();
    }

    /**
     * Verifica se o usuário é super admin.
     */
    public function isSuperAdmin(): bool
    {
        return $this->is_super_admin === true;
    }

    /**
     * Verifica se o usuário tem uma permissão específica.
     */
    public function hasPermission(string $permissionKey): bool
    {
        // Super admin tem todas as permissões
        if ($this->isSuperAdmin()) {
            return true;
        }

        // Verifica permissões customizadas do usuário primeiro
        $customPermission = $this->customPermissions()
            ->whereHas('permission', fn($q) => $q->where('key', $permissionKey))
            ->first();

        if ($customPermission) {
            return $customPermission->pivot->granted;
        }

        // Verifica permissões do role
        return RolePermission::where('role', $this->role->value)
            ->whereHas('permission', fn($q) => $q->where('key', $permissionKey))
            ->exists();
    }

    /**
     * Permissões customizadas do usuário.
     */
    public function customPermissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class, 'user_permissions')
            ->withPivot('granted')
            ->withTimestamps();
    }

    /**
     * Retorna todas as permissões efetivas do usuário.
     */
    public function getEffectivePermissions(): array
    {
        if ($this->isSuperAdmin()) {
            return Permission::pluck('key')->toArray();
        }

        // Permissões do role
        $rolePermissions = RolePermission::getPermissionsForRole($this->role->value);

        // Aplica customizações do usuário
        $customPermissions = $this->customPermissions()
            ->get()
            ->mapWithKeys(fn($p) => [$p->key => $p->pivot->granted])
            ->toArray();

        // Mescla: adiciona concedidas, remove revogadas
        $effective = $rolePermissions;
        
        foreach ($customPermissions as $key => $granted) {
            if ($granted && !in_array($key, $effective)) {
                $effective[] = $key;
            } elseif (!$granted) {
                $effective = array_filter($effective, fn($k) => $k !== $key);
            }
        }

        return array_values($effective);
    }
}
