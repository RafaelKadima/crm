<?php

namespace App\Policies;

use App\Models\Kpr;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class KprPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return true; // Todos podem listar (filtrado por tenant)
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Kpr $kpr): bool
    {
        // Deve ser do mesmo tenant
        if ($user->tenant_id !== $kpr->tenant_id) {
            return false;
        }

        // Admin e gestor podem ver tudo
        if (in_array($user->role->value, ['admin', 'gestor'])) {
            return true;
        }

        // Vendedor pode ver se tiver uma assignment
        return $kpr->userAssignments()
            ->where('assignable_id', $user->id)
            ->exists();
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        // Apenas admin e gestor podem criar metas
        return in_array($user->role->value, ['admin', 'gestor']);
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Kpr $kpr): bool
    {
        // Deve ser do mesmo tenant
        if ($user->tenant_id !== $kpr->tenant_id) {
            return false;
        }

        // Apenas admin e gestor podem atualizar
        return in_array($user->role->value, ['admin', 'gestor']);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Kpr $kpr): bool
    {
        // Deve ser do mesmo tenant
        if ($user->tenant_id !== $kpr->tenant_id) {
            return false;
        }

        // Apenas admin pode deletar
        return $user->role->value === 'admin';
    }
}
