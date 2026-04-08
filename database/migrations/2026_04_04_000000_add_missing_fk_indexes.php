<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Adiciona indexes faltantes em foreign keys para performance.
 * Complementa 2025_12_04_120000_add_performance_indexes.php.
 */
return new class extends Migration
{
    public function up(): void
    {
        $indexes = [
            "CREATE INDEX IF NOT EXISTS idx_contacts_owner ON contacts (owner_id)",
            "CREATE INDEX IF NOT EXISTS idx_external_integrations_tenant ON external_integrations (tenant_id)",
            "CREATE INDEX IF NOT EXISTS idx_ticket_messages_sender ON ticket_messages (sender_id)",
            "CREATE INDEX IF NOT EXISTS idx_tickets_lead ON tickets (lead_id)",
        ];

        foreach ($indexes as $sql) {
            try {
                DB::statement($sql);
            } catch (\Exception $e) {
                // Index may already exist or table may not exist yet
            }
        }
    }

    public function down(): void
    {
        $indexes = [
            'idx_contacts_owner',
            'idx_external_integrations_tenant',
            'idx_ticket_messages_sender',
            'idx_tickets_lead',
        ];

        foreach ($indexes as $index) {
            try {
                DB::statement("DROP INDEX IF EXISTS {$index}");
            } catch (\Exception $e) {
                // Ignore
            }
        }
    }
};
