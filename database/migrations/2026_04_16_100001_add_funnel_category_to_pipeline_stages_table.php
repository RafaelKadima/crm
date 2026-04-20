<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Adiciona classificação universal de funil gerencial em pipeline_stages.
     *
     * funnel_category permite que cada tenant mapeie seus estágios (de 5, 7 ou N etapas)
     * para categorias universais compartilhadas pelo relatório gerencial: arrived,
     * qualified, scheduled, meeting_done, proposal, negotiation, won, lost, unmapped.
     */
    public function up(): void
    {
        Schema::table('pipeline_stages', function (Blueprint $table) {
            $table->string('funnel_category', 20)->default('unmapped')->after('stage_type');
            $table->index(['tenant_id', 'pipeline_id', 'funnel_category'], 'idx_stages_tenant_pipeline_funnel');
        });
    }

    public function down(): void
    {
        Schema::table('pipeline_stages', function (Blueprint $table) {
            $table->dropIndex('idx_stages_tenant_pipeline_funnel');
            $table->dropColumn('funnel_category');
        });
    }
};
