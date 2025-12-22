<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Tabela para armazenar snapshots diários do progresso das metas.
     * Útil para gráficos de evolução e análise histórica.
     */
    public function up(): void
    {
        Schema::create('kpr_snapshots', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('kpr_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('kpr_assignment_id')->nullable()
                  ->constrained()->cascadeOnDelete();
            $table->date('snapshot_date');
            $table->decimal('current_value', 15, 2);
            $table->decimal('target_value', 15, 2);
            $table->decimal('progress_percentage', 5, 2);
            $table->decimal('projected_value', 15, 2)->nullable(); // Projeção para fim do período
            $table->integer('deals_count')->default(0);
            $table->integer('activities_completed')->default(0);
            $table->json('breakdown')->nullable();
            $table->timestamps();

            $table->unique(['kpr_assignment_id', 'snapshot_date'], 'kpr_snapshot_unique');
            $table->index(['kpr_id', 'snapshot_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('kpr_snapshots');
    }
};
