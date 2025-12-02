<?php

namespace App\Services;

use App\Enums\RoleEnum;
use App\Models\Channel;
use App\Models\Lead;
use App\Models\LeadAssignmentLog;
use App\Models\User;

class LeadAssignmentService
{
    /**
     * Atribui um lead ao próximo vendedor usando Round-Robin.
     */
    public function assignLeadOwner(Lead $lead, ?array $eligibleUserIds = null): User
    {
        $tenantId = $lead->tenant_id;
        $channelId = $lead->channel_id;

        // Se não foram passados IDs de usuários, busca todos os vendedores ativos
        if ($eligibleUserIds === null) {
            $eligibleUserIds = $this->getEligibleUsers($tenantId);
        }

        if (empty($eligibleUserIds)) {
            throw new \Exception('Não há vendedores disponíveis para atribuição.');
        }

        // Busca o próximo usuário no Round-Robin
        $nextUser = $this->getNextUserInRotation($tenantId, $channelId, $eligibleUserIds);

        // Atribui o lead ao usuário
        $lead->assignTo($nextUser);

        // Atualiza o log de atribuição
        $this->updateAssignmentLog($tenantId, $nextUser->id, $channelId);

        return $nextUser;
    }

    /**
     * Retorna os IDs dos vendedores elegíveis do tenant.
     */
    protected function getEligibleUsers(string $tenantId): array
    {
        return User::where('tenant_id', $tenantId)
            ->where('role', RoleEnum::VENDEDOR)
            ->where('is_active', true)
            ->pluck('id')
            ->toArray();
    }

    /**
     * Retorna o próximo usuário na rotação Round-Robin.
     */
    protected function getNextUserInRotation(string $tenantId, string $channelId, array $eligibleUserIds): User
    {
        // Busca o último usuário que recebeu lead neste canal
        $lastAssigned = LeadAssignmentLog::where('tenant_id', $tenantId)
            ->where('channel_id', $channelId)
            ->whereIn('user_id', $eligibleUserIds)
            ->orderByDesc('last_assigned_at')
            ->first();

        if (!$lastAssigned) {
            // Primeira atribuição - retorna o primeiro usuário elegível
            return User::find($eligibleUserIds[0]);
        }

        // Encontra o índice do último usuário
        $lastIndex = array_search($lastAssigned->user_id, $eligibleUserIds);
        
        if ($lastIndex === false) {
            // Usuário anterior não está mais elegível
            return User::find($eligibleUserIds[0]);
        }

        // Próximo índice (circular)
        $nextIndex = ($lastIndex + 1) % count($eligibleUserIds);
        
        return User::find($eligibleUserIds[$nextIndex]);
    }

    /**
     * Atualiza o log de atribuição.
     */
    protected function updateAssignmentLog(string $tenantId, string $userId, string $channelId): void
    {
        LeadAssignmentLog::updateOrCreate(
            [
                'tenant_id' => $tenantId,
                'user_id' => $userId,
                'channel_id' => $channelId,
            ],
            [
                'last_assigned_at' => now(),
            ]
        );
    }

    /**
     * Distribui múltiplos leads igualmente entre vendedores.
     */
    public function distributeLeads(array $leads, ?array $eligibleUserIds = null): array
    {
        $assignments = [];

        foreach ($leads as $lead) {
            $user = $this->assignLeadOwner($lead, $eligibleUserIds);
            $assignments[] = [
                'lead_id' => $lead->id,
                'user_id' => $user->id,
                'user_name' => $user->name,
            ];
        }

        return $assignments;
    }

    /**
     * Retorna estatísticas de distribuição por canal.
     */
    public function getDistributionStats(string $tenantId, ?string $channelId = null): array
    {
        $query = LeadAssignmentLog::where('tenant_id', $tenantId)
            ->with('user:id,name');

        if ($channelId) {
            $query->where('channel_id', $channelId);
        }

        $logs = $query->get();

        return $logs->groupBy('user_id')->map(function ($group) {
            $user = $group->first()->user;
            return [
                'user_id' => $user->id,
                'user_name' => $user->name,
                'last_assigned_at' => $group->max('last_assigned_at'),
                'channels_count' => $group->count(),
            ];
        })->values()->toArray();
    }
}


