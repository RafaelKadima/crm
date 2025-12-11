<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Guardrails configuráveis para limitar ações dos agentes de Ads.
     * Permite definir regras de negócio, limites de orçamento, aprovações, etc.
     */
    public function up(): void
    {
        Schema::create('ad_guardrails', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->onDelete('cascade');
            
            // Identificação da regra
            $table->string('name');
            $table->text('description')->nullable();
            
            // Tipo e escopo
            $table->string('rule_type'); // 'budget_limit', 'approval_required', 'time_restriction', 'objective_allowed', 'creative_rules'
            $table->string('scope'); // 'campaign', 'adset', 'ad', 'account', 'all'
            
            // Condições para ativar a regra (JSON)
            // Exemplo: {"objective": "SALES", "budget_gt": 100}
            $table->json('conditions');
            
            // Ação quando a regra é acionada (JSON)
            // Exemplo: {"type": "block", "message": "Orçamento excede limite"}
            // Tipos: 'block', 'warn', 'require_approval', 'modify'
            $table->json('action');
            
            // Prioridade (maior = executada primeiro)
            $table->integer('priority')->default(0);
            
            // Controle
            $table->boolean('is_active')->default(true);
            $table->boolean('is_system')->default(false); // Regras do sistema vs tenant
            
            // Estatísticas
            $table->integer('trigger_count')->default(0);
            $table->timestamp('last_triggered_at')->nullable();
            
            $table->timestamps();
            
            // Índices
            $table->index(['tenant_id', 'is_active']);
            $table->index(['tenant_id', 'rule_type', 'is_active']);
            $table->index(['tenant_id', 'scope', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ad_guardrails');
    }
};
