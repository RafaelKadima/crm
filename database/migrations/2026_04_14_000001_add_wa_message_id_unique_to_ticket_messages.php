<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ticket_messages', function (Blueprint $table) {
            if (!Schema::hasColumn('ticket_messages', 'wa_message_id')) {
                $table->string('wa_message_id', 255)->nullable()->after('metadata');
            }
        });

        // Backfill em chunks para não travar a base em produção
        DB::table('ticket_messages')
            ->whereNull('wa_message_id')
            ->whereNotNull('metadata')
            ->orderBy('id')
            ->chunkById(1000, function ($rows) {
                foreach ($rows as $row) {
                    $metadata = is_string($row->metadata) ? json_decode($row->metadata, true) : $row->metadata;
                    $wamid = $metadata['whatsapp_message_id'] ?? null;
                    if ($wamid) {
                        DB::table('ticket_messages')
                            ->where('id', $row->id)
                            ->update(['wa_message_id' => $wamid]);
                    }
                }
            });

        // Índice único parcial: duplicatas históricas (caso existam) não bloqueiam;
        // NULLs são permitidos múltiplos pelo Postgres por padrão.
        Schema::table('ticket_messages', function (Blueprint $table) {
            $table->index(['tenant_id', 'wa_message_id'], 'ticket_messages_tenant_wamid_idx');
        });

        // UNIQUE em (tenant_id, wa_message_id) só se não houver duplicatas prévias.
        // Em Postgres: NULLs não colidem em UNIQUE padrão.
        if (DB::getDriverName() === 'pgsql') {
            $duplicates = DB::select(
                'SELECT tenant_id, wa_message_id, COUNT(*) AS c
                 FROM ticket_messages
                 WHERE wa_message_id IS NOT NULL
                 GROUP BY tenant_id, wa_message_id HAVING COUNT(*) > 1 LIMIT 1'
            );
            if (empty($duplicates)) {
                DB::statement(
                    'CREATE UNIQUE INDEX IF NOT EXISTS ticket_messages_tenant_wamid_unique
                     ON ticket_messages (tenant_id, wa_message_id)
                     WHERE wa_message_id IS NOT NULL'
                );
            }
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS ticket_messages_tenant_wamid_unique');
        }
        Schema::table('ticket_messages', function (Blueprint $table) {
            $table->dropIndex('ticket_messages_tenant_wamid_idx');
            $table->dropColumn('wa_message_id');
        });
    }
};
