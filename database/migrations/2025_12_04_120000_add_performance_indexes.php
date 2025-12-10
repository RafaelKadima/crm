<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Migration para adicionar índices de performance
 * Usando SQL direto para evitar problemas de transação
 */
return new class extends Migration
{
    public function up(): void
    {
        $indexes = [
            // Mensagens
            "CREATE INDEX IF NOT EXISTS idx_messages_ticket_sent ON ticket_messages (ticket_id, sent_at)",
            "CREATE INDEX IF NOT EXISTS idx_messages_ticket_sender ON ticket_messages (ticket_id, sender_type)",
            
            // Tickets
            "CREATE INDEX IF NOT EXISTS idx_tickets_tenant_status ON tickets (tenant_id, status)",
            "CREATE INDEX IF NOT EXISTS idx_tickets_lead_created ON tickets (lead_id, created_at)",
            "CREATE INDEX IF NOT EXISTS idx_tickets_channel_status ON tickets (channel_id, status)",
            
            // Leads
            "CREATE INDEX IF NOT EXISTS idx_leads_pipeline_stage ON leads (tenant_id, pipeline_id, stage_id)",
            "CREATE INDEX IF NOT EXISTS idx_leads_owner_stage ON leads (owner_id, stage_id)",
            "CREATE INDEX IF NOT EXISTS idx_leads_tenant_created ON leads (tenant_id, created_at)",
            
            // Contacts
            "CREATE INDEX IF NOT EXISTS idx_contacts_tenant_phone ON contacts (tenant_id, phone)",
            
            // Pipeline stages
            "CREATE INDEX IF NOT EXISTS idx_stages_pipeline_position ON pipeline_stages (pipeline_id, position)",
            
            // Embeddings
            "CREATE INDEX IF NOT EXISTS idx_embeddings_tenant_agent ON sdr_knowledge_embeddings (tenant_id, sdr_agent_id)",
        ];

        foreach ($indexes as $sql) {
            try {
                DB::statement($sql);
            } catch (\Exception $e) {
                // Ignorar erros (índice pode já existir ou tabela não existe)
            }
        }

        // Índices opcionais (tabelas que podem não existir)
        $optionalIndexes = [
            "CREATE INDEX IF NOT EXISTS idx_appointments_tenant_date ON appointments (tenant_id, scheduled_at)",
            "CREATE INDEX IF NOT EXISTS idx_appointments_user_date_status ON appointments (user_id, scheduled_at, status)",
            "CREATE INDEX IF NOT EXISTS idx_activities_lead_created ON lead_activities (lead_id, created_at)",
        ];

        foreach ($optionalIndexes as $sql) {
            try {
                DB::statement($sql);
            } catch (\Exception $e) {
                // Ignorar
            }
        }
    }

    public function down(): void
    {
        $indexes = [
            'idx_messages_ticket_sent',
            'idx_messages_ticket_sender',
            'idx_tickets_tenant_status',
            'idx_tickets_lead_created',
            'idx_tickets_channel_status',
            'idx_leads_pipeline_stage',
            'idx_leads_owner_stage',
            'idx_leads_tenant_created',
            'idx_contacts_tenant_phone',
            'idx_stages_pipeline_position',
            'idx_embeddings_tenant_agent',
            'idx_appointments_tenant_date',
            'idx_appointments_user_date_status',
            'idx_activities_lead_created',
        ];

        foreach ($indexes as $index) {
            try {
                DB::statement("DROP INDEX IF EXISTS {$index}");
            } catch (\Exception $e) {
                // Ignorar
            }
        }
    }
};
