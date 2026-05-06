<?php

namespace App\Models;

use App\Support\CustomPermissions;
use App\Traits\Auditable;
use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Profile customizado de permissões dentro de um tenant. Um profile
 * agrupa um conjunto das 35 keys do CustomPermissions, mais regras
 * opcionais de visibilidade de menu.
 */
class CustomProfile extends Model
{
    use HasFactory, HasUuids, BelongsToTenant, SoftDeletes, Auditable;

    protected $fillable = [
        'tenant_id',
        'name',
        'description',
        'custom_permissions',
        'menu_permissions',
        'is_default',
    ];

    protected function casts(): array
    {
        return [
            'custom_permissions' => 'array',
            'menu_permissions' => 'array',
            'is_default' => 'boolean',
        ];
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /**
     * Resolve permissões com defaults — qualquer key faltando no
     * `custom_permissions` cai no default do CustomPermissions.
     */
    public function resolvedPermissions(): array
    {
        $stored = $this->custom_permissions ?? [];
        $resolved = [];
        foreach (CustomPermissions::defaults() as $key => $default) {
            $resolved[$key] = $stored[$key] ?? $default;
        }
        return $resolved;
    }

    public function hasPermission(string $key): bool
    {
        if (!CustomPermissions::exists($key)) {
            return false;
        }
        return (bool) ($this->resolvedPermissions()[$key] ?? false);
    }
}
