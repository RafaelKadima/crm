<?php

namespace App\Policies;

use App\Models\Pipeline;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class PipelinePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Pipeline $pipeline): bool
    {
        return $user->tenant_id === $pipeline->tenant_id;
    }

    public function create(User $user): bool
    {
        return $user->isSuperAdmin() || in_array($user->role->value, ['admin', 'gestor']);
    }

    public function update(User $user, Pipeline $pipeline): bool
    {
        if ($user->tenant_id !== $pipeline->tenant_id) {
            return false;
        }

        return $user->isSuperAdmin() || in_array($user->role->value, ['admin', 'gestor']);
    }

    public function delete(User $user, Pipeline $pipeline): bool
    {
        if ($user->tenant_id !== $pipeline->tenant_id) {
            return false;
        }

        return $user->isSuperAdmin() || $user->role->value === 'admin';
    }
}
