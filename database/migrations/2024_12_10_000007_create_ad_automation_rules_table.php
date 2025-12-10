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
        Schema::create('ad_automation_rules', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('ad_account_id')->nullable()->constrained()->nullOnDelete(); // null = todas as contas
            
            $table->string('name');
            $table->text('description')->nullable();
            
            // Escopo da regra
            $table->string('scope'); // account, campaign, adset, ad
            $table->uuid('scope_id')->nullable(); // ID específico ou null para todos
            
            // Condição
            $table->json('condition');
            /*
            {
                "metric": "cpc",
                "operator": ">",
                "value": 3.00,
                "duration_days": 2,
                "aggregation": "avg" // avg, sum, min, max, last
            }
            */
            
            // Ação
            $table->json('action');
            /*
            {
                "type": "pause_ad", // pause_ad, resume_ad, increase_budget, decrease_budget, duplicate_adset, create_alert
                "params": {
                    "percent": 20, // para budget
                    "message": "..." // para alert
                }
            }
            */
            
            // Configuração de execução
            $table->string('frequency'); // hourly, daily, weekly
            $table->integer('cooldown_hours')->default(24); // Tempo mínimo entre execuções na mesma entidade
            $table->integer('max_executions_per_day')->nullable(); // Limite de execuções
            
            $table->boolean('is_active')->default(true);
            $table->boolean('requires_approval')->default(false); // Modo semi-autônomo
            
            $table->integer('priority')->default(0); // Ordem de execução
            $table->timestamp('last_executed_at')->nullable();
            $table->integer('execution_count')->default(0);
            
            $table->timestamps();
            
            $table->index(['tenant_id', 'is_active']);
            $table->index(['tenant_id', 'scope']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ad_automation_rules');
    }
};

