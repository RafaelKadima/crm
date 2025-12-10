<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RolePermission extends Model
{
    use HasUuids;

    protected $fillable = [
        'role',
        'permission_id',
    ];

    /**
     * Permissão associada.
     */
    public function permission(): BelongsTo
    {
        return $this->belongsTo(Permission::class);
    }

    /**
     * Retorna todas as permissões de um role.
     */
    public static function getPermissionsForRole(string $role): array
    {
        return static::where('role', $role)
            ->with('permission')
            ->get()
            ->pluck('permission.key')
            ->toArray();
    }
}

