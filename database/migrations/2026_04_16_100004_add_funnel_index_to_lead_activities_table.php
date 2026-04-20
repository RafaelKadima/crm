<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Index composto para acelerar queries do funil gerencial que reconstroem
     * o histórico de mudanças de estágio (type='stage_changed') por tenant.
     */
    public function up(): void
    {
        Schema::table('lead_activities', function (Blueprint $table) {
            $table->index(
                ['tenant_id', 'lead_id', 'type', 'created_at'],
                'idx_activities_funnel_history'
            );
        });
    }

    public function down(): void
    {
        Schema::table('lead_activities', function (Blueprint $table) {
            $table->dropIndex('idx_activities_funnel_history');
        });
    }
};
