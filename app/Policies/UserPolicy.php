<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class UserPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->isSuperAdmin() || in_array($user->role->value, ['admin', 'gestor']);
    }

    public function view(User $user, User $model): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        if ($user->tenant_id !== $model->tenant_id) {
            return false;
        }

        return in_array($user->role->value, ['admin', 'gestor']);
    }

    public function create(User $user): bool
    {
        return $user->isSuperAdmin() || $user->role->value === 'admin';
    }

    public function update(User $user, User $model): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        if ($user->tenant_id !== $model->tenant_id) {
            return false;
        }

        return $user->role->value === 'admin';
    }

    public function delete(User $user, User $model): bool
    {
        if ($model->isSuperAdmin()) {
            return false;
        }

        if ($user->isSuperAdmin()) {
            return true;
        }

        if ($user->tenant_id !== $model->tenant_id) {
            return false;
        }

        return $user->role->value === 'admin';
    }
}
