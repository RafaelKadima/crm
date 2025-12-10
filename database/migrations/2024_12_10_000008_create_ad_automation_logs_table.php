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
        Schema::create('ad_automation_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('ad_automation_rule_id')->constrained()->cascadeOnDelete();
            
            // Entidade afetada
            $table->string('entity_type'); // campaign, adset, ad
            $table->uuid('entity_id');
            $table->string('entity_name');
            
            // Ação executada
            $table->string('action_type'); // pause_ad, resume_ad, increase_budget, etc.
            $table->json('action_params')->nullable();
            
            // Estado antes/depois (para rollback)
            $table->json('previous_state')->nullable();
            $table->json('new_state')->nullable();
            
            // Resultado
            $table->string('status'); // pending, executed, failed, rolled_back, approved, rejected
            $table->text('error_message')->nullable();
            
            // Métricas no momento da execução
            $table->json('metrics_snapshot')->nullable();
            
            // Aprovação (modo semi-autônomo)
            $table->foreignUuid('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            
            // Rollback
            $table->boolean('can_rollback')->default(true);
            $table->timestamp('rolled_back_at')->nullable();
            $table->foreignUuid('rolled_back_by')->nullable()->constrained('users')->nullOnDelete();
            
            $table->timestamp('executed_at')->nullable();
            $table->timestamps();
            
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'created_at']);
            $table->index(['entity_type', 'entity_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ad_automation_logs');
    }
};

