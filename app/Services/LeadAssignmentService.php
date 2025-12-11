<?php

namespace App\Services;

use App\Enums\RoleEnum;
use App\Models\Channel;
use App\Models\Lead;
use App\Models\LeadAssignmentLog;
use App\Models\LeadQueueOwner;
use App\Models\Pipeline;
use App\Models\Queue;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class LeadAssignmentService
{
    /**
     * Atribui um lead ao próximo vendedor usando Round-Robin.
     * 
     * Prioridade:
     * 1. Se o lead está em uma fila → distribui entre usuários da fila
     * 2. Se passou eligibleUserIds → usa esses usuários
     * 3. Se o lead tem pipeline → usa vendedores com permissão no pipeline
     * 4. Fallback → todos os vendedores ativos do tenant
     */
    public function assignLeadOwner(Lead $lead, ?array $eligibleUserIds = null): User
    {
        $tenantId = $lead->tenant_id;
        $channelId = $lead->channel_id;
        $queueId = $lead->queue_id;
        $pipelineId = $lead->pipeline_id;

        // Se o lead está em uma fila, usa os usuários da fila
        if ($queueId && $eligibleUserIds === null) {
            $queue = Queue::find($queueId);
            if ($queue) {
                $eligibleUserIds = $queue->getActiveUserIds();
                Log::info('Using queue users for assignment', [
                    'lead_id' => $lead->id,
                    'queue_id' => $queueId,
                    'eligible_users' => count($eligibleUserIds),
                ]);
            }
        }

        // Se não tem fila mas tem pipeline, usa os vendedores com permissão no pipeline
        if (($eligibleUserIds === null || empty($eligibleUserIds)) && $pipelineId) {
            $pipeline = Pipeline::find($pipelineId);
            if ($pipeline) {
                $eligibleUserIds = $pipeline->getUserIdsWithLeadPermission();
                Log::info('Using pipeline users for assignment', [
                    'lead_id' => $lead->id,
                    'pipeline_id' => $pipelineId,
                    'pipeline_name' => $pipeline->name,
                    'eligible_users' => count($eligibleUserIds),
                ]);
            }
        }

        // Fallback: Se não foram passados IDs de usuários, busca todos os vendedores ativos
        if ($eligibleUserIds === null || empty($eligibleUserIds)) {
            $eligibleUserIds = $this->getEligibleUsers($tenantId);
            Log::info('Using all tenant sellers for assignment (fallback)', [
                'lead_id' => $lead->id,
                'tenant_id' => $tenantId,
                'eligible_users' => count($eligibleUserIds),
            ]);
        }

        if (empty($eligibleUserIds)) {
            throw new \Exception('Não há vendedores disponíveis para atribuição.');
        }

        // Busca o próximo usuário no Round-Robin (considerando fila se existir)
        $nextUser = $this->getNextUserInRotation($tenantId, $channelId, $queueId, $eligibleUserIds);

        // Atribui o lead ao usuário
        $lead->assignTo($nextUser);

        // Se o lead está em uma fila, salva a carteirização
        if ($queueId) {
            $queue = Queue::find($queueId);
            if ($queue) {
                LeadQueueOwner::setOwnerForQueue($lead, $queue, $nextUser);
                Log::info('Lead queue ownership saved', [
                    'lead_id' => $lead->id,
                    'queue_id' => $queueId,
                    'user_id' => $nextUser->id,
                ]);
            }
        }

        // Atualiza o log de atribuição
        $this->updateAssignmentLog($tenantId, $nextUser->id, $channelId, $queueId);

        Log::info('Lead assigned to user', [
            'lead_id' => $lead->id,
            'user_id' => $nextUser->id,
            'user_name' => $nextUser->name,
            'queue_id' => $queueId,
        ]);

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
     * Considera a fila se o lead estiver em uma.
     */
    protected function getNextUserInRotation(
        string $tenantId, 
        string $channelId, 
        ?string $queueId, 
        array $eligibleUserIds
    ): User {
        // Busca o último usuário que recebeu lead (prioriza por fila, depois canal)
        $query = LeadAssignmentLog::where('tenant_id', $tenantId)
            ->whereIn('user_id', $eligibleUserIds)
            ->orderByDesc('last_assigned_at');
        
        // Se tem fila, busca por fila primeiro
        if ($queueId) {
            $lastAssigned = (clone $query)->where('queue_id', $queueId)->first();
        }
        
        // Se não encontrou por fila, busca por canal
        if (!isset($lastAssigned) || !$lastAssigned) {
            $lastAssigned = $query->where('channel_id', $channelId)->first();
        }

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
    protected function updateAssignmentLog(
        string $tenantId, 
        string $userId, 
        string $channelId, 
        ?string $queueId = null
    ): void {
        LeadAssignmentLog::updateOrCreate(
            [
                'tenant_id' => $tenantId,
                'user_id' => $userId,
                'channel_id' => $channelId,
                'queue_id' => $queueId,
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
                'queue_id' => $lead->queue_id,
            ];
        }

        return $assignments;
    }

    /**
     * Retorna estatísticas de distribuição por canal ou fila.
     */
    public function getDistributionStats(string $tenantId, ?string $channelId = null, ?string $queueId = null): array
    {
        $query = LeadAssignmentLog::where('tenant_id', $tenantId)
            ->with('user:id,name');

        if ($channelId) {
            $query->where('channel_id', $channelId);
        }

        if ($queueId) {
            $query->where('queue_id', $queueId);
        }

        $logs = $query->get();

        return $logs->groupBy('user_id')->map(function ($group) {
            $user = $group->first()->user;
            return [
                'user_id' => $user->id,
                'user_name' => $user->name,
                'last_assigned_at' => $group->max('last_assigned_at'),
                'channels_count' => $group->unique('channel_id')->count(),
                'queues_count' => $group->unique('queue_id')->count(),
            ];
        })->values()->toArray();
    }

    /**
     * Retorna estatísticas de distribuição por fila específica.
     */
    public function getQueueDistributionStats(Queue $queue): array
    {
        $stats = [];
        
        $queueUsers = $queue->activeUsers()->get();
        
        foreach ($queueUsers as $user) {
            $leadsCount = Lead::where('queue_id', $queue->id)
                ->where('owner_id', $user->id)
                ->count();
            
            $lastAssignment = LeadAssignmentLog::where('queue_id', $queue->id)
                ->where('user_id', $user->id)
                ->value('last_assigned_at');
            
            $stats[] = [
                'user_id' => $user->id,
                'user_name' => $user->name,
                'leads_count' => $leadsCount,
                'last_assigned_at' => $lastAssignment,
                'priority' => $user->pivot->priority ?? 0,
                'is_active' => $user->pivot->is_active ?? true,
            ];
        }
        
        return $stats;
    }
}


