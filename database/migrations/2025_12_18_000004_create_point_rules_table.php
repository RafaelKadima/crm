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
        Schema::create('point_rules', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->string('name'); // Nome descritivo da regra
            $table->string('action_type'); // activity_completed, deal_won, stage_advanced, deal_value_threshold, etc.
            $table->string('entity_type')->nullable(); // Activity, Deal, Stage (para regras específicas)
            $table->uuid('entity_id')->nullable(); // ID específico (ex: stage_id específico)
            $table->integer('points');
            $table->decimal('multiplier', 4, 2)->default(1.00); // Multiplicador para períodos especiais
            $table->json('conditions')->nullable(); // Condições extras (ex: {"min_value": 10000})
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('tenant_id')
                ->references('id')
                ->on('tenants')
                ->onDelete('cascade');

            $table->index(['tenant_id', 'action_type', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('point_rules');
    }
};
