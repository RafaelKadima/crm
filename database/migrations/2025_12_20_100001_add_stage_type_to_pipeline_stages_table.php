<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Adiciona campos para identificar o tipo do estágio e sua contribuição para KPIs.
     *
     * stage_type:
     * - 'open' = Estágio normal do funil (padrão)
     * - 'won' = Lead ganho/fechado com sucesso
     * - 'lost' = Lead perdido
     *
     * probability: Probabilidade de fechamento neste estágio (0-100%)
     * kpi_weight: Peso deste estágio para cálculo de KPIs (0-100)
     * counts_for_goal: Se movimentação para este estágio conta para metas
     */
    public function up(): void
    {
        Schema::table('pipeline_stages', function (Blueprint $table) {
            $table->string('stage_type', 20)->default('open')->after('color');
            $table->integer('probability')->default(0)->after('stage_type');
            $table->integer('kpi_weight')->default(0)->after('probability');
            $table->boolean('counts_for_goal')->default(false)->after('kpi_weight');

            $table->index('stage_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pipeline_stages', function (Blueprint $table) {
            $table->dropIndex(['stage_type']);
            $table->dropColumn(['stage_type', 'probability', 'kpi_weight', 'counts_for_goal']);
        });
    }
};
