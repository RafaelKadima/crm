<?php

namespace App\Policies;

use App\Models\Channel;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class ChannelPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Channel $channel): bool
    {
        return $user->tenant_id === $channel->tenant_id;
    }

    public function create(User $user): bool
    {
        return $user->isSuperAdmin() || $user->role->value === 'admin';
    }

    public function update(User $user, Channel $channel): bool
    {
        if ($user->tenant_id !== $channel->tenant_id) {
            return false;
        }

        return $user->isSuperAdmin() || $user->role->value === 'admin';
    }

    public function delete(User $user, Channel $channel): bool
    {
        if ($user->tenant_id !== $channel->tenant_id) {
            return false;
        }

        return $user->isSuperAdmin() || $user->role->value === 'admin';
    }
}
