<?php

namespace App\Traits;

use App\Models\CustomProfile;
use App\Support\CustomPermissions;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Aplicado no User. Resolve permissões na ordem:
 *
 *   1. Super admin → permite tudo (com audit via Gate::before)
 *   2. ADMIN_ONLY_ACTIONS → exige role ADMIN ou is_super_admin,
 *      independente do que diga o profile
 *   3. Se custom_profile_enabled e tem profile vinculado → usa o
 *      mapa do profile
 *   4. Fallback → comportamento legado baseado em RoleEnum
 *
 * Mantém compatibilidade total com users que ainda não migraram pra
 * RBAC v2: enquanto custom_profile_enabled = false, nada muda.
 */
trait HasCustomPermissions
{
    public function customProfile(): BelongsTo
    {
        return $this->belongsTo(CustomProfile::class);
    }

    public function hasPermission(string $key): bool
    {
        // 1. Super admin sempre passa (audit via Gate::before)
        if ($this->isSuperAdmin()) {
            return true;
        }

        // 2. ADMIN_ONLY_ACTIONS: só admin OU super admin
        if (CustomPermissions::isAdminOnly($key)) {
            return $this->isAdmin();
        }

        // 3. Custom profile (RBAC v2)
        if ($this->custom_profile_enabled && $this->customProfile) {
            return $this->customProfile->hasPermission($key);
        }

        // 4. Fallback role legado
        return $this->roleHasPermission($key);
    }

    /**
     * Mapeamento conservador de RoleEnum → permissions. Cobre os casos
     * comuns; se cair aqui pra uma key que role não conhece, default
     * é o DEFAULT da key no catálogo.
     */
    protected function roleHasPermission(string $key): bool
    {
        if ($this->isAdmin()) {
            return true;
        }

        // Gestor: tudo menos as ADMIN_ONLY_ACTIONS (cobertas acima)
        if (method_exists($this, 'isGestor') && $this->isGestor()) {
            return CustomPermissions::defaults()[$key] ?? false;
        }

        // Vendedor / Marketing / outros: defaults conservadores
        return CustomPermissions::defaults()[$key] ?? false;
    }

    public function permissionMap(): array
    {
        $map = [];
        foreach (CustomPermissions::allKeys() as $key) {
            $map[$key] = $this->hasPermission($key);
        }
        return $map;
    }
}
