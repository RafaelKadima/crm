<?php

namespace App\Http\Controllers;

use App\Models\Lead;
use App\Models\Task;
use App\Models\Ticket;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    /**
     * Retorna dados agregados para o dashboard em uma única requisição.
     */
    public function load(): JsonResponse
    {
        // Leads
        $totalLeads = Lead::count();
        $leads = Lead::select('id', 'contact_id', 'channel_id', 'status', 'value', 'created_at')
            ->with(['contact:id,name', 'channel:id,name'])
            ->latest()
            ->take(5)
            ->get();

        $leadsWon = Lead::whereIn('status', ['won', 'ganho'])->count();
        $leadsLost = Lead::whereIn('status', ['lost', 'perdido'])->count();

        // Tickets
        $totalTickets = Ticket::count();

        // Tasks
        $totalTasks = Task::count();
        $recentTasks = Task::select('id', 'title', 'type', 'status', 'due_date')
            ->where('status', 'pending')
            ->orderBy('due_date')
            ->take(5)
            ->get();

        $conversionRate = $totalLeads > 0 ? ($leadsWon / $totalLeads) * 100 : 0;

        return response()->json([
            'stats' => [
                'total_leads' => $totalLeads,
                'total_contacts' => 0, // pode ser ajustado depois se necessário
                'total_tickets' => $totalTickets,
                'total_tasks' => $totalTasks,
                'leads_won' => $leadsWon,
                'leads_lost' => $leadsLost,
                'conversion_rate' => $conversionRate,
            ],
            'recent_leads' => $leads,
            'recent_tasks' => $recentTasks,
        ]);
    }
}


