<?php

namespace App\Policies;

use App\Models\Lead;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class LeadPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Lead $lead): bool
    {
        if ($user->tenant_id !== $lead->tenant_id) {
            return false;
        }

        if ($user->isSuperAdmin() || in_array($user->role->value, ['admin', 'gestor'])) {
            return true;
        }

        return $lead->owner_id === $user->id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Lead $lead): bool
    {
        if ($user->tenant_id !== $lead->tenant_id) {
            return false;
        }

        if ($user->isSuperAdmin() || in_array($user->role->value, ['admin', 'gestor'])) {
            return true;
        }

        return $lead->owner_id === $user->id;
    }

    public function delete(User $user, Lead $lead): bool
    {
        if ($user->tenant_id !== $lead->tenant_id) {
            return false;
        }

        return $user->isSuperAdmin() || in_array($user->role->value, ['admin', 'gestor']);
    }

    public function assign(User $user, Lead $lead): bool
    {
        if ($user->tenant_id !== $lead->tenant_id) {
            return false;
        }

        return $user->isSuperAdmin() || in_array($user->role->value, ['admin', 'gestor']);
    }
}
