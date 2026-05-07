<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Indexes complementares — análise feita em cima dos novos models
 * (audit_logs, security_incidents, broadcasts, step_replies) e dos
 * filtros mais usados em prod (tenant + status combinations).
 *
 * Mantém o padrão CREATE INDEX IF NOT EXISTS + try/catch silencioso
 * pra ser idempotente em re-runs.
 */
return new class extends Migration
{
    public function up(): void
    {
        $indexes = [
            // TicketMessages — buscas de "última mensagem do ticket"
            // (já tem ticket_id+sent_at; aqui adiciona direction pra
            // queries tipo "última inbound" usadas em SLA)
            "CREATE INDEX IF NOT EXISTS idx_messages_ticket_direction_sent ON ticket_messages (ticket_id, direction, sent_at DESC)",

            // Tickets — listas filtradas por queue + status (kanban view)
            "CREATE INDEX IF NOT EXISTS idx_tickets_tenant_paused ON tickets (tenant_id, paused_at) WHERE paused_at IS NOT NULL",
            "CREATE INDEX IF NOT EXISTS idx_tickets_assigned_status ON tickets (assigned_user_id, status) WHERE assigned_user_id IS NOT NULL",

            // Broadcasts — listing por tenant + status
            "CREATE INDEX IF NOT EXISTS idx_broadcasts_tenant_status ON broadcasts (tenant_id, status, created_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_broadcasts_scheduled ON broadcasts (status, scheduled_at) WHERE scheduled_at IS NOT NULL",

            // BroadcastMessages — pra ProcessBroadcastJob iterar PENDING
            "CREATE INDEX IF NOT EXISTS idx_broadcast_messages_status ON broadcast_messages (broadcast_id, status)",

            // QuickReplies por shortcut (lookup rápido durante chat)
            "CREATE INDEX IF NOT EXISTS idx_quick_replies_tenant_shortcut ON quick_replies (tenant_id, shortcut) WHERE deleted_at IS NULL",

            // AutoReply / StepReply — engine sempre filtra por tenant + active
            "CREATE INDEX IF NOT EXISTS idx_auto_replies_tenant_active ON auto_replies (tenant_id, is_active, priority DESC) WHERE deleted_at IS NULL",
            "CREATE INDEX IF NOT EXISTS idx_step_replies_tenant_active ON step_replies (tenant_id, is_active, priority DESC) WHERE deleted_at IS NULL",

            // Tags — autocomplete por nome dentro do tenant
            "CREATE INDEX IF NOT EXISTS idx_tags_tenant_name ON tags (tenant_id, name)",
        ];

        foreach ($indexes as $sql) {
            try {
                DB::statement($sql);
            } catch (\Exception $e) {
                // Ignora erros (índice pode existir ou tabela ainda não)
            }
        }
    }

    public function down(): void
    {
        $drops = [
            'idx_messages_ticket_direction_sent',
            'idx_tickets_tenant_paused',
            'idx_tickets_assigned_status',
            'idx_broadcasts_tenant_status',
            'idx_broadcasts_scheduled',
            'idx_broadcast_messages_status',
            'idx_quick_replies_tenant_shortcut',
            'idx_auto_replies_tenant_active',
            'idx_step_replies_tenant_active',
            'idx_tags_tenant_name',
        ];

        foreach ($drops as $name) {
            try {
                DB::statement("DROP INDEX IF EXISTS {$name}");
            } catch (\Exception $e) {
                // ignore
            }
        }
    }
};
