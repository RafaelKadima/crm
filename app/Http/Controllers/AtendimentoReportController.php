<?php

namespace App\Http\Controllers;

use App\Enums\TicketStatusEnum;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Relatórios de Atendimento (suporte): SLA (1ª resposta / resolução),
 * tickets por status/canal/atendente, volume de conversas e mensagens,
 * tempo em fila e taxa de reabertura.
 *
 * Todas as métricas são tenant-scoped e calculadas ao vivo sobre as tabelas
 * `tickets` e `ticket_messages` (PostgreSQL). Datas filtram por created_at do
 * ticket (sent_at no caso de mensagens).
 */
class AtendimentoReportController extends Controller
{
    /**
     * Resumo consolidado: KPIs + quebras por status/canal/atendente + SLA + fila + reabertura.
     */
    public function summary(Request $request): JsonResponse
    {
        $request->validate([
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date',
            'channel_id' => 'nullable|uuid|exists:channels,id',
        ]);

        $tenantId = auth()->user()->tenant_id;
        [$from, $to] = $this->range($request);
        $channelId = $request->channel_id;

        $scoped = fn ($table = 'tickets') => DB::table($table)
            ->where('tenant_id', $tenantId)
            ->whereBetween('created_at', [$from, $to])
            ->when($channelId, fn ($q) => $q->where('channel_id', $channelId));

        // ---- Totais por status -------------------------------------------------
        $statusCounts = $scoped()
            ->select('status', DB::raw('COUNT(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status');

        $total = (int) $statusCounts->sum();
        $closed = (int) ($statusCounts[TicketStatusEnum::CLOSED->value] ?? 0);

        $byStatus = collect(TicketStatusEnum::cases())->map(fn ($s) => [
            'status' => $s->value,
            'label' => $s->label(),
            'count' => (int) ($statusCounts[$s->value] ?? 0),
        ])->values();

        // ---- SLA: tempo de 1ª resposta (1ª msg outbound de um atendente) -------
        $firstRespSub = DB::table('ticket_messages')
            ->select('ticket_id', DB::raw('MIN(sent_at) as first_resp'))
            ->where('tenant_id', $tenantId)
            ->where('direction', 'outbound')
            ->where('sender_type', 'user')
            ->groupBy('ticket_id');

        $firstResponse = DB::table('tickets as t')
            ->joinSub($firstRespSub, 'fr', 'fr.ticket_id', '=', 't.id')
            ->where('t.tenant_id', $tenantId)
            ->whereBetween('t.created_at', [$from, $to])
            ->when($channelId, fn ($q) => $q->where('t.channel_id', $channelId))
            ->selectRaw(
                "AVG(EXTRACT(EPOCH FROM (fr.first_resp - t.created_at)) / 60.0) as avg_min,
                 PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (fr.first_resp - t.created_at)) / 60.0) as median_min,
                 COUNT(*) as n"
            )
            ->first();

        // ---- SLA: tempo de resolução (closed_at - created_at) ------------------
        $resolution = $scoped()
            ->whereNotNull('closed_at')
            ->selectRaw(
                "AVG(EXTRACT(EPOCH FROM (closed_at - created_at)) / 60.0) as avg_min,
                 PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (closed_at - created_at)) / 60.0) as median_min,
                 COUNT(*) as n"
            )
            ->first();

        // ---- Tempo em fila (first_viewed_at - queue_entered_at) ----------------
        $queueWait = $scoped()
            ->whereNotNull('queue_entered_at')
            ->whereNotNull('first_viewed_at')
            ->selectRaw(
                "AVG(EXTRACT(EPOCH FROM (first_viewed_at - queue_entered_at)) / 60.0) as avg_min,
                 COUNT(*) as n"
            )
            ->first();

        // Tickets atualmente na fila (estado atual, sem filtro de data)
        $inQueueNow = DB::table('tickets')
            ->where('tenant_id', $tenantId)
            ->whereNotNull('queue_entered_at')
            ->whereNull('first_viewed_at')
            ->where('status', '!=', TicketStatusEnum::CLOSED->value)
            ->when($channelId, fn ($q) => $q->where('channel_id', $channelId))
            ->count();

        // ---- Taxa de reabertura ------------------------------------------------
        $reopened = (int) $scoped()->where('reopen_count', '>', 0)->count();

        // ---- Por canal ---------------------------------------------------------
        $byChannel = DB::table('tickets as t')
            ->leftJoin('channels as c', 'c.id', '=', 't.channel_id')
            ->where('t.tenant_id', $tenantId)
            ->whereBetween('t.created_at', [$from, $to])
            ->when($channelId, fn ($q) => $q->where('t.channel_id', $channelId))
            ->select(
                't.channel_id',
                'c.name',
                'c.type',
                DB::raw('COUNT(*) as total'),
                DB::raw("COUNT(*) FILTER (WHERE t.status = 'closed') as closed")
            )
            ->groupBy('t.channel_id', 'c.name', 'c.type')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($r) => [
                'channel_id' => $r->channel_id,
                'name' => $r->name ?? 'Sem canal',
                'type' => $r->type ?? 'other',
                'total' => (int) $r->total,
                'closed' => (int) $r->closed,
            ]);

        // ---- Por atendente -----------------------------------------------------
        $byAgent = DB::table('tickets as t')
            ->leftJoin('users as u', 'u.id', '=', 't.assigned_user_id')
            ->where('t.tenant_id', $tenantId)
            ->whereNotNull('t.assigned_user_id')
            ->whereBetween('t.created_at', [$from, $to])
            ->when($channelId, fn ($q) => $q->where('t.channel_id', $channelId))
            ->select(
                't.assigned_user_id',
                'u.name',
                'u.role',
                DB::raw('COUNT(*) as total'),
                DB::raw("COUNT(*) FILTER (WHERE t.status = 'closed') as closed"),
                DB::raw("AVG(EXTRACT(EPOCH FROM (t.closed_at - t.created_at)) / 60.0) FILTER (WHERE t.closed_at IS NOT NULL) as avg_resolution_min")
            )
            ->groupBy('t.assigned_user_id', 'u.name', 'u.role')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($r) => [
                'user_id' => $r->assigned_user_id,
                'name' => $r->name ?? 'N/A',
                'role' => $r->role,
                'total' => (int) $r->total,
                'closed' => (int) $r->closed,
                'open' => (int) $r->total - (int) $r->closed,
                'avg_resolution_minutes' => $this->min($r->avg_resolution_min),
            ]);

        return response()->json([
            'period' => ['date_from' => $from->toDateString(), 'date_to' => $to->toDateString()],
            'totals' => [
                'total' => $total,
                'open' => (int) ($statusCounts[TicketStatusEnum::OPEN->value] ?? 0),
                'pending' => (int) ($statusCounts[TicketStatusEnum::PENDING->value] ?? 0),
                'waiting_customer' => (int) ($statusCounts[TicketStatusEnum::WAITING_CUSTOMER->value] ?? 0),
                'closed' => $closed,
                'closed_rate' => $total > 0 ? round($closed / $total * 100, 1) : 0,
            ],
            'sla' => [
                'first_response' => [
                    'avg_minutes' => $this->min($firstResponse->avg_min ?? null),
                    'median_minutes' => $this->min($firstResponse->median_min ?? null),
                    'sample' => (int) ($firstResponse->n ?? 0),
                ],
                'resolution' => [
                    'avg_minutes' => $this->min($resolution->avg_min ?? null),
                    'median_minutes' => $this->min($resolution->median_min ?? null),
                    'sample' => (int) ($resolution->n ?? 0),
                ],
                'queue_wait' => [
                    'avg_minutes' => $this->min($queueWait->avg_min ?? null),
                    'sample' => (int) ($queueWait->n ?? 0),
                    'in_queue_now' => $inQueueNow,
                ],
            ],
            'reopen' => [
                'reopened' => $reopened,
                'total' => $total,
                'rate' => $total > 0 ? round($reopened / $total * 100, 1) : 0,
            ],
            'by_status' => $byStatus,
            'by_channel' => $byChannel,
            'by_agent' => $byAgent,
        ]);
    }

    /**
     * Série temporal: volume de conversas (tickets criados) e mensagens
     * (inbound/outbound) por período.
     */
    public function timeSeries(Request $request): JsonResponse
    {
        $request->validate([
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date',
            'channel_id' => 'nullable|uuid|exists:channels,id',
            'group_by' => 'nullable|in:day,week,month',
        ]);

        $tenantId = auth()->user()->tenant_id;
        [$from, $to] = $this->range($request);
        $channelId = $request->channel_id;
        $groupBy = $request->input('group_by', 'day');

        $fmt = fn (string $col) => match ($groupBy) {
            'week' => "TO_CHAR(DATE_TRUNC('week', {$col}), 'YYYY-MM-DD')",
            'month' => "TO_CHAR({$col}, 'YYYY-MM')",
            default => "TO_CHAR({$col}, 'YYYY-MM-DD')",
        };

        $tickets = DB::table('tickets')
            ->where('tenant_id', $tenantId)
            ->whereBetween('created_at', [$from, $to])
            ->when($channelId, fn ($q) => $q->where('channel_id', $channelId))
            ->select(DB::raw($fmt('created_at') . ' as period'), DB::raw('COUNT(*) as count'))
            ->groupBy('period')
            ->orderBy('period')
            ->pluck('count', 'period');

        $messages = DB::table('ticket_messages as m')
            ->where('m.tenant_id', $tenantId)
            ->whereBetween('m.sent_at', [$from, $to])
            ->when($channelId, fn ($q) => $q->join('tickets as t', 't.id', '=', 'm.ticket_id')
                ->where('t.channel_id', $channelId))
            ->select(
                DB::raw($fmt('m.sent_at') . ' as period'),
                DB::raw("COUNT(*) FILTER (WHERE m.direction = 'inbound') as inbound"),
                DB::raw("COUNT(*) FILTER (WHERE m.direction = 'outbound') as outbound")
            )
            ->groupBy('period')
            ->orderBy('period')
            ->get()
            ->keyBy('period');

        // União dos períodos das duas séries
        $periods = $tickets->keys()->merge($messages->keys())->unique()->sort()->values();

        $series = $periods->map(function ($period) use ($tickets, $messages) {
            $msg = $messages->get($period);
            $inbound = (int) ($msg->inbound ?? 0);
            $outbound = (int) ($msg->outbound ?? 0);

            return [
                'period' => $period,
                'tickets' => (int) ($tickets[$period] ?? 0),
                'messages_inbound' => $inbound,
                'messages_outbound' => $outbound,
                'messages_total' => $inbound + $outbound,
            ];
        });

        return response()->json([
            'group_by' => $groupBy,
            'period' => ['date_from' => $from->toDateString(), 'date_to' => $to->toDateString()],
            'series' => $series,
        ]);
    }

    /**
     * Resolve o intervalo de datas (default: últimos 30 dias), cobrindo o dia inteiro.
     */
    private function range(Request $request): array
    {
        $from = $request->date_from
            ? Carbon::parse($request->date_from)->startOfDay()
            : now()->subDays(30)->startOfDay();
        $to = $request->date_to
            ? Carbon::parse($request->date_to)->endOfDay()
            : now()->endOfDay();

        return [$from, $to];
    }

    /**
     * Normaliza minutos (vindos do PG como string) para float arredondado ou null.
     */
    private function min($value): ?float
    {
        return $value === null ? null : round((float) $value, 1);
    }
}
