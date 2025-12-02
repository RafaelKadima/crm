<?php

namespace App\Http\Controllers;

use App\Enums\GroupRoleEnum;
use App\Enums\LeadStatusEnum;
use App\Models\Group;
use App\Models\Lead;
use App\Models\Tenant;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class GroupController extends Controller
{
    /**
     * Lista grupos do usuário.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $groups = $user->groups()
            ->with('tenants:id,name,slug')
            ->withCount('tenants')
            ->get();

        return response()->json([
            'groups' => $groups,
        ]);
    }

    /**
     * Cria um novo grupo.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'tenant_ids' => 'nullable|array',
            'tenant_ids.*' => 'uuid|exists:tenants,id',
        ]);

        $user = $request->user();

        $group = Group::create([
            'name' => $request->name,
            'slug' => Str::slug($request->name) . '-' . Str::random(6),
            'description' => $request->description,
            'is_active' => true,
        ]);

        // Adiciona o usuário como owner do grupo
        $group->users()->attach($user->id, ['role' => GroupRoleEnum::OWNER->value]);

        // Adiciona tenants ao grupo
        if ($request->tenant_ids) {
            $group->tenants()->sync($request->tenant_ids);
        }

        return response()->json([
            'message' => 'Grupo criado com sucesso.',
            'group' => $group->load('tenants'),
        ], 201);
    }

    /**
     * Exibe detalhes de um grupo.
     */
    public function show(Request $request, Group $group): JsonResponse
    {
        $user = $request->user();

        if (!$group->hasUser($user)) {
            return response()->json(['message' => 'Acesso negado.'], 403);
        }

        $group->load(['tenants', 'users']);

        return response()->json([
            'group' => $group,
        ]);
    }

    /**
     * Atualiza um grupo.
     */
    public function update(Request $request, Group $group): JsonResponse
    {
        $user = $request->user();

        if (!$group->canManage($user)) {
            return response()->json(['message' => 'Acesso negado.'], 403);
        }

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'sometimes|boolean',
        ]);

        $group->update($request->only(['name', 'description', 'is_active']));

        return response()->json([
            'message' => 'Grupo atualizado com sucesso.',
            'group' => $group,
        ]);
    }

    /**
     * Remove um grupo.
     */
    public function destroy(Request $request, Group $group): JsonResponse
    {
        $user = $request->user();

        if (!$group->isOwner($user)) {
            return response()->json(['message' => 'Apenas o owner pode excluir o grupo.'], 403);
        }

        $group->delete();

        return response()->json([
            'message' => 'Grupo excluído com sucesso.',
        ]);
    }

    /**
     * Adiciona tenant ao grupo.
     */
    public function addTenant(Request $request, Group $group): JsonResponse
    {
        $user = $request->user();

        if (!$group->canManage($user)) {
            return response()->json(['message' => 'Acesso negado.'], 403);
        }

        $request->validate([
            'tenant_id' => 'required|uuid|exists:tenants,id',
        ]);

        $group->tenants()->syncWithoutDetaching([$request->tenant_id]);

        return response()->json([
            'message' => 'Loja adicionada ao grupo.',
            'group' => $group->load('tenants'),
        ]);
    }

    /**
     * Remove tenant do grupo.
     */
    public function removeTenant(Request $request, Group $group, Tenant $tenant): JsonResponse
    {
        $user = $request->user();

        if (!$group->canManage($user)) {
            return response()->json(['message' => 'Acesso negado.'], 403);
        }

        $group->tenants()->detach($tenant->id);

        return response()->json([
            'message' => 'Loja removida do grupo.',
        ]);
    }

    /**
     * Adiciona usuário ao grupo.
     */
    public function addUser(Request $request, Group $group): JsonResponse
    {
        $currentUser = $request->user();

        if (!$group->canManage($currentUser)) {
            return response()->json(['message' => 'Acesso negado.'], 403);
        }

        $request->validate([
            'user_id' => 'required|uuid|exists:users,id',
            'role' => 'required|in:admin,viewer',
        ]);

        $group->users()->syncWithoutDetaching([
            $request->user_id => ['role' => $request->role],
        ]);

        return response()->json([
            'message' => 'Usuário adicionado ao grupo.',
        ]);
    }

    /**
     * Remove usuário do grupo.
     */
    public function removeUser(Request $request, Group $group, User $user): JsonResponse
    {
        $currentUser = $request->user();

        if (!$group->canManage($currentUser)) {
            return response()->json(['message' => 'Acesso negado.'], 403);
        }

        // Não pode remover o owner
        if ($group->isOwner($user)) {
            return response()->json(['message' => 'Não é possível remover o owner do grupo.'], 400);
        }

        $group->users()->detach($user->id);

        return response()->json([
            'message' => 'Usuário removido do grupo.',
        ]);
    }

    /**
     * Dashboard consolidado do grupo.
     */
    public function dashboard(Request $request, Group $group): JsonResponse
    {
        $user = $request->user();

        if (!$group->hasUser($user)) {
            return response()->json(['message' => 'Acesso negado.'], 403);
        }

        $tenantIds = $group->getTenantIds();

        // Métricas consolidadas
        $totalLeads = Lead::whereIn('tenant_id', $tenantIds)->count();
        $openLeads = Lead::whereIn('tenant_id', $tenantIds)->where('status', LeadStatusEnum::OPEN)->count();
        $wonLeads = Lead::whereIn('tenant_id', $tenantIds)->where('status', LeadStatusEnum::WON)->count();
        $totalValue = Lead::whereIn('tenant_id', $tenantIds)->where('status', LeadStatusEnum::WON)->sum('value');

        $totalTickets = Ticket::whereIn('tenant_id', $tenantIds)->count();
        $openTickets = Ticket::whereIn('tenant_id', $tenantIds)->where('status', 'open')->count();

        $totalUsers = User::whereIn('tenant_id', $tenantIds)->where('is_active', true)->count();

        return response()->json([
            'group' => $group->only(['id', 'name']),
            'tenants_count' => count($tenantIds),
            'metrics' => [
                'leads' => [
                    'total' => $totalLeads,
                    'open' => $openLeads,
                    'won' => $wonLeads,
                    'total_value' => $totalValue,
                ],
                'tickets' => [
                    'total' => $totalTickets,
                    'open' => $openTickets,
                ],
                'users' => [
                    'total' => $totalUsers,
                ],
            ],
        ]);
    }

    /**
     * Métricas por loja do grupo.
     */
    public function metricsPerTenant(Request $request, Group $group): JsonResponse
    {
        $user = $request->user();

        if (!$group->hasUser($user)) {
            return response()->json(['message' => 'Acesso negado.'], 403);
        }

        $request->validate([
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date',
        ]);

        $tenants = $group->tenants;
        $metrics = [];

        foreach ($tenants as $tenant) {
            $leadsQuery = Lead::where('tenant_id', $tenant->id);
            $ticketsQuery = Ticket::where('tenant_id', $tenant->id);

            if ($request->date_from) {
                $leadsQuery->whereDate('created_at', '>=', $request->date_from);
                $ticketsQuery->whereDate('created_at', '>=', $request->date_from);
            }

            if ($request->date_to) {
                $leadsQuery->whereDate('created_at', '<=', $request->date_to);
                $ticketsQuery->whereDate('created_at', '<=', $request->date_to);
            }

            $totalLeads = (clone $leadsQuery)->count();
            $wonLeads = (clone $leadsQuery)->where('status', LeadStatusEnum::WON)->count();
            $totalValue = (clone $leadsQuery)->where('status', LeadStatusEnum::WON)->sum('value');
            $conversionRate = $totalLeads > 0 ? round(($wonLeads / $totalLeads) * 100, 2) : 0;

            $metrics[] = [
                'tenant_id' => $tenant->id,
                'tenant_name' => $tenant->name,
                'tenant_slug' => $tenant->slug,
                'leads' => [
                    'total' => $totalLeads,
                    'won' => $wonLeads,
                    'conversion_rate' => $conversionRate,
                    'total_value' => $totalValue,
                ],
                'tickets' => [
                    'total' => $ticketsQuery->count(),
                    'open' => (clone $ticketsQuery)->where('status', 'open')->count(),
                ],
                'users_count' => User::where('tenant_id', $tenant->id)->where('is_active', true)->count(),
            ];
        }

        return response()->json([
            'group' => $group->only(['id', 'name']),
            'metrics_per_tenant' => $metrics,
        ]);
    }

    /**
     * Relatório de funil consolidado do grupo.
     */
    public function funnelReport(Request $request, Group $group): JsonResponse
    {
        $user = $request->user();

        if (!$group->hasUser($user)) {
            return response()->json(['message' => 'Acesso negado.'], 403);
        }

        $request->validate([
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date',
        ]);

        $tenantIds = $group->getTenantIds();

        // Leads por estágio (consolidado)
        $query = Lead::whereIn('tenant_id', $tenantIds)
            ->select('stage_id', DB::raw('COUNT(*) as count'), DB::raw('SUM(value) as total_value'))
            ->groupBy('stage_id');

        if ($request->date_from) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->date_to) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $leadsByStage = $query->with('stage:id,name,order,color')->get();

        // Totais
        $totalQuery = Lead::whereIn('tenant_id', $tenantIds);

        if ($request->date_from) {
            $totalQuery->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->date_to) {
            $totalQuery->whereDate('created_at', '<=', $request->date_to);
        }

        $totalLeads = $totalQuery->count();
        $wonLeads = (clone $totalQuery)->where('status', LeadStatusEnum::WON)->count();
        $totalValue = (clone $totalQuery)->where('status', LeadStatusEnum::WON)->sum('value');

        return response()->json([
            'group' => $group->only(['id', 'name']),
            'funnel' => $leadsByStage,
            'totals' => [
                'total_leads' => $totalLeads,
                'won_leads' => $wonLeads,
                'total_value' => $totalValue,
                'conversion_rate' => $totalLeads > 0 ? round(($wonLeads / $totalLeads) * 100, 2) : 0,
            ],
        ]);
    }

    /**
     * Ranking de vendedores do grupo.
     */
    public function salesRanking(Request $request, Group $group): JsonResponse
    {
        $user = $request->user();

        if (!$group->hasUser($user)) {
            return response()->json(['message' => 'Acesso negado.'], 403);
        }

        $request->validate([
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date',
            'limit' => 'nullable|integer|min:1|max:100',
        ]);

        $tenantIds = $group->getTenantIds();
        $limit = $request->limit ?? 10;

        $query = Lead::whereIn('tenant_id', $tenantIds)
            ->where('status', LeadStatusEnum::WON)
            ->whereNotNull('owner_id');

        if ($request->date_from) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->date_to) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $ranking = $query
            ->select('owner_id', DB::raw('COUNT(*) as won_count'), DB::raw('SUM(value) as total_value'))
            ->groupBy('owner_id')
            ->orderByDesc('total_value')
            ->limit($limit)
            ->get();

        // Carrega dados dos usuários
        $userIds = $ranking->pluck('owner_id');
        $users = User::whereIn('id', $userIds)->get()->keyBy('id');

        $rankingWithUsers = $ranking->map(function ($item) use ($users) {
            $user = $users->get($item->owner_id);
            return [
                'user_id' => $item->owner_id,
                'user_name' => $user?->name ?? 'N/A',
                'tenant_name' => $user?->tenant?->name ?? 'N/A',
                'won_count' => $item->won_count,
                'total_value' => $item->total_value,
            ];
        });

        return response()->json([
            'group' => $group->only(['id', 'name']),
            'ranking' => $rankingWithUsers,
        ]);
    }
}

