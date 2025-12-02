<?php

namespace App\Models;

use App\Enums\RoleEnum;
use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
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
        ];
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
}
