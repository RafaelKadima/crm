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

        // #region agent log H5 - Entry
        file_put_contents(storage_path('logs/debug.log'), json_encode(['hypothesisId'=>'H5','location'=>'LeadAssignmentService:assignLeadOwner:ENTRY','message'=>'assignLeadOwner called','data'=>['lead_id'=>$lead->id,'queue_id'=>$queueId,'pipeline_id'=>$pipelineId,'passed_eligible'=>$eligibleUserIds],'timestamp'=>now()->toIso8601String()])."\n", FILE_APPEND);
        // #endregion

        // Se o lead está em uma fila, usa os usuários da fila
        if ($queueId && $eligibleUserIds === null) {
            $queue = Queue::find($queueId);
            if ($queue) {
                $eligibleUserIds = $queue->getActiveUserIds();
                // #region agent log H2 - Queue users
                $queueUserNames = User::whereIn('id', $eligibleUserIds)->pluck('name')->toArray();
                file_put_contents(storage_path('logs/debug.log'), json_encode(['hypothesisId'=>'H2','location'=>'LeadAssignmentService:assignLeadOwner:QUEUE_USERS','message'=>'Users from queue','data'=>['queue_id'=>$queueId,'queue_name'=>$queue->name,'eligible_count'=>count($eligibleUserIds),'user_ids'=>$eligibleUserIds,'user_names'=>$queueUserNames],'timestamp'=>now()->toIso8601String()])."\n", FILE_APPEND);
                // #endregion
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
                // #region agent log H1 - Pipeline users
                $userNames = User::whereIn('id', $eligibleUserIds)->pluck('name')->toArray();
                file_put_contents(storage_path('logs/debug.log'), json_encode(['hypothesisId'=>'H1','location'=>'LeadAssignmentService:assignLeadOwner:PIPELINE_USERS','message'=>'Users from pipeline','data'=>['pipeline_id'=>$pipelineId,'pipeline_name'=>$pipeline->name,'eligible_count'=>count($eligibleUserIds),'user_ids'=>$eligibleUserIds,'user_names'=>$userNames],'timestamp'=>now()->toIso8601String()])."\n", FILE_APPEND);
                // #endregion
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
        // #region agent log H3 - Round Robin Entry
        file_put_contents(storage_path('logs/debug.log'), json_encode(['hypothesisId'=>'H3','location'=>'LeadAssignmentService:getNextUserInRotation:ENTRY','message'=>'Round Robin started','data'=>['tenant_id'=>$tenantId,'channel_id'=>$channelId,'queue_id'=>$queueId,'eligible_user_ids'=>$eligibleUserIds,'eligible_count'=>count($eligibleUserIds)],'timestamp'=>now()->toIso8601String()])."\n", FILE_APPEND);
        // #endregion

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
            // #region agent log H3 - First assignment
            $firstUser = User::find($eligibleUserIds[0]);
            file_put_contents(storage_path('logs/debug.log'), json_encode(['hypothesisId'=>'H3','location'=>'LeadAssignmentService:getNextUserInRotation:FIRST','message'=>'First assignment (no previous log)','data'=>['selected_user_id'=>$eligibleUserIds[0],'selected_user_name'=>$firstUser?->name],'timestamp'=>now()->toIso8601String()])."\n", FILE_APPEND);
            // #endregion
            // Primeira atribuição - retorna o primeiro usuário elegível
            return $firstUser;
        }

        // Encontra o índice do último usuário
        $lastIndex = array_search($lastAssigned->user_id, $eligibleUserIds);
        
        if ($lastIndex === false) {
            // #region agent log H3 - User not eligible
            $fallbackUser = User::find($eligibleUserIds[0]);
            file_put_contents(storage_path('logs/debug.log'), json_encode(['hypothesisId'=>'H3','location'=>'LeadAssignmentService:getNextUserInRotation:NOT_ELIGIBLE','message'=>'Last user not eligible anymore','data'=>['last_user_id'=>$lastAssigned->user_id,'selected_user_id'=>$eligibleUserIds[0],'selected_user_name'=>$fallbackUser?->name],'timestamp'=>now()->toIso8601String()])."\n", FILE_APPEND);
            // #endregion
            // Usuário anterior não está mais elegível
            return $fallbackUser;
        }

        // Próximo índice (circular)
        $nextIndex = ($lastIndex + 1) % count($eligibleUserIds);
        
        // #region agent log H3 - Round Robin result
        $nextUser = User::find($eligibleUserIds[$nextIndex]);
        $lastUserName = User::find($lastAssigned->user_id)?->name;
        file_put_contents(storage_path('logs/debug.log'), json_encode(['hypothesisId'=>'H3','location'=>'LeadAssignmentService:getNextUserInRotation:ROTATION','message'=>'Round Robin rotation','data'=>['last_user_id'=>$lastAssigned->user_id,'last_user_name'=>$lastUserName,'last_index'=>$lastIndex,'next_index'=>$nextIndex,'selected_user_id'=>$eligibleUserIds[$nextIndex],'selected_user_name'=>$nextUser?->name],'timestamp'=>now()->toIso8601String()])."\n", FILE_APPEND);
        // #endregion
        
        return $nextUser;
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


