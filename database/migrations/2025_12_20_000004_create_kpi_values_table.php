<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('kpi_values', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('kpi_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignUuid('team_id')->nullable()->constrained()->nullOnDelete();
            $table->string('period'); // "2025-01" (mensal) ou "2025-Q1" (trimestral) ou "2025-W01" (semanal)
            $table->enum('period_type', ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'])->default('monthly');
            $table->decimal('calculated_value', 15, 4);
            $table->decimal('target_value', 15, 4)->nullable();
            $table->decimal('previous_value', 15, 4)->nullable(); // Valor do período anterior
            $table->decimal('achievement_percentage', 5, 2)->default(0);
            $table->decimal('variation_percentage', 8, 2)->nullable(); // Variação vs período anterior
            $table->json('breakdown')->nullable(); // Detalhamento do cálculo
            $table->json('contributing_items')->nullable(); // IDs de leads/atividades que contribuíram
            $table->timestamp('calculated_at');
            $table->timestamps();

            $table->index(['kpi_id', 'period']);
            $table->index(['user_id', 'period']);
            $table->index(['team_id', 'period']);
            $table->unique(['kpi_id', 'user_id', 'team_id', 'period'], 'kpi_value_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('kpi_values');
    }
};
