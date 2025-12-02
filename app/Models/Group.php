<?php

namespace App\Models;

use App\Enums\GroupRoleEnum;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Group extends Model
{
    use HasFactory, HasUuids;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'slug',
        'description',
        'logo',
        'settings',
        'is_active',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'settings' => 'array',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Tenants (lojas) do grupo.
     */
    public function tenants(): BelongsToMany
    {
        return $this->belongsToMany(Tenant::class, 'group_tenant')
            ->withTimestamps();
    }

    /**
     * Usuários com acesso ao grupo.
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'group_user')
            ->withPivot('role')
            ->withTimestamps();
    }

    /**
     * Owners do grupo.
     */
    public function owners(): BelongsToMany
    {
        return $this->users()->wherePivot('role', GroupRoleEnum::OWNER->value);
    }

    /**
     * Admins do grupo.
     */
    public function admins(): BelongsToMany
    {
        return $this->users()->wherePivot('role', GroupRoleEnum::ADMIN->value);
    }

    /**
     * Verifica se um usuário tem acesso ao grupo.
     */
    public function hasUser(User $user): bool
    {
        return $this->users()->where('user_id', $user->id)->exists();
    }

    /**
     * Verifica se um usuário é owner do grupo.
     */
    public function isOwner(User $user): bool
    {
        return $this->users()
            ->where('user_id', $user->id)
            ->wherePivot('role', GroupRoleEnum::OWNER->value)
            ->exists();
    }

    /**
     * Verifica se um usuário pode gerenciar o grupo.
     */
    public function canManage(User $user): bool
    {
        return $this->users()
            ->where('user_id', $user->id)
            ->whereIn('group_user.role', [GroupRoleEnum::OWNER->value, GroupRoleEnum::ADMIN->value])
            ->exists();
    }

    /**
     * Obtém todos os tenant_ids do grupo.
     */
    public function getTenantIds(): array
    {
        return $this->tenants()->pluck('tenants.id')->toArray();
    }

    /**
     * Obtém uma configuração específica.
     */
    public function getSetting(string $key, $default = null)
    {
        return data_get($this->settings, $key, $default);
    }
}

