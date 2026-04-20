<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Adiciona referência ao motivo da perda em leads.
     *
     * lost_reason_id aponta para lost_reasons (por tenant). Nota é opcional,
     * para detalhe qualitativo adicional além do motivo categorizado.
     */
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->uuid('lost_reason_id')->nullable()->after('status');
            $table->text('lost_reason_note')->nullable()->after('lost_reason_id');

            $table->foreign('lost_reason_id')
                ->references('id')
                ->on('lost_reasons')
                ->onDelete('set null');

            $table->index(['tenant_id', 'lost_reason_id'], 'idx_leads_tenant_lost_reason');
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->dropForeign(['lost_reason_id']);
            $table->dropIndex('idx_leads_tenant_lost_reason');
            $table->dropColumn(['lost_reason_id', 'lost_reason_note']);
        });
    }
};
