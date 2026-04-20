<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tabela de cache agregado populada pelo DailyFunnelAggregateJob.
     *
     * Permite que os relatórios gerenciais (funil, velocity, coorte) abram em <200ms
     * mesmo com milhões de leads. Drill-down (lista de leads) consulta ao vivo.
     *
     * Chave de agregação: (tenant_id, date, pipeline_id, channel_id, owner_id, funnel_category).
     */
    public function up(): void
    {
        Schema::create('funnel_snapshots', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->date('snapshot_date');
            $table->uuid('pipeline_id')->nullable();
            $table->uuid('channel_id')->nullable();
            $table->uuid('owner_id')->nullable();
            $table->string('funnel_category', 20);

            $table->integer('leads_entered')->default(0);
            $table->integer('leads_exited')->default(0);
            $table->decimal('value_entered', 15, 2)->default(0);
            $table->integer('avg_time_in_category_seconds')->default(0);
            $table->integer('samples_for_avg')->default(0);

            $table->timestamps();

            $table->foreign('tenant_id')
                ->references('id')
                ->on('tenants')
                ->onDelete('cascade');

            $table->foreign('pipeline_id')
                ->references('id')
                ->on('pipelines')
                ->onDelete('cascade');

            $table->foreign('channel_id')
                ->references('id')
                ->on('channels')
                ->onDelete('set null');

            $table->foreign('owner_id')
                ->references('id')
                ->on('users')
                ->onDelete('set null');

            $table->unique(
                ['tenant_id', 'snapshot_date', 'pipeline_id', 'channel_id', 'owner_id', 'funnel_category'],
                'uq_funnel_snapshot_dimensions'
            );

            $table->index(['tenant_id', 'snapshot_date'], 'idx_funnel_tenant_date');
            $table->index(['tenant_id', 'funnel_category', 'snapshot_date'], 'idx_funnel_tenant_cat_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('funnel_snapshots');
    }
};
