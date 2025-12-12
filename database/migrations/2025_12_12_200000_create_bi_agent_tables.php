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
        // Tabela de análises geradas pelo BI Agent
        Schema::create('bi_analyses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('analysis_type'); // daily, weekly, monthly, on_demand
            $table->string('focus_area'); // sales, support, marketing, financial, global
            $table->jsonb('metrics_snapshot')->nullable();
            $table->jsonb('predictions')->nullable();
            $table->jsonb('anomalies')->nullable();
            $table->jsonb('insights')->nullable();
            $table->jsonb('recommended_actions')->nullable();
            $table->timestamp('period_start');
            $table->timestamp('period_end');
            $table->string('status')->default('completed'); // running, completed, failed
            $table->text('error_message')->nullable();
            $table->integer('execution_time_ms')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')
                ->references('id')
                ->on('tenants')
                ->onDelete('cascade');

            $table->index(['tenant_id', 'analysis_type', 'created_at']);
            $table->index(['tenant_id', 'focus_area']);
        });

        // Tabela de ações sugeridas pelo BI Agent (fila de aprovação)
        Schema::create('bi_suggested_actions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('analysis_id')->nullable();
            $table->string('target_agent'); // sdr, ads, knowledge, ml
            $table->string('action_type'); // update_script, pause_campaign, add_knowledge, retrain_model, etc.
            $table->string('priority'); // low, medium, high, critical
            $table->text('title');
            $table->text('description');
            $table->text('rationale'); // explicação do porquê
            $table->jsonb('action_payload'); // dados para executar
            $table->jsonb('expected_impact')->nullable(); // impacto esperado
            $table->string('status')->default('pending'); // pending, approved, rejected, executed, failed
            $table->uuid('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->uuid('rejected_by')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->uuid('executed_by')->nullable();
            $table->timestamp('executed_at')->nullable();
            $table->jsonb('execution_result')->nullable();
            $table->timestamp('expires_at')->nullable(); // algumas ações expiram
            $table->timestamps();

            $table->foreign('tenant_id')
                ->references('id')
                ->on('tenants')
                ->onDelete('cascade');

            $table->foreign('analysis_id')
                ->references('id')
                ->on('bi_analyses')
                ->onDelete('set null');

            $table->foreign('approved_by')
                ->references('id')
                ->on('users')
                ->onDelete('set null');

            $table->foreign('rejected_by')
                ->references('id')
                ->on('users')
                ->onDelete('set null');

            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'target_agent', 'status']);
            $table->index(['tenant_id', 'priority', 'status']);
        });

        // Tabela de conhecimento gerado pelo BI Agent
        Schema::create('bi_generated_knowledge', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('analysis_id')->nullable();
            $table->string('knowledge_type'); // insight, pattern, best_practice, warning, anomaly
            $table->string('category'); // sales, support, marketing, financial, operations
            $table->text('title');
            $table->text('content');
            $table->jsonb('metadata')->nullable();
            $table->jsonb('supporting_data')->nullable(); // dados que suportam o insight
            $table->float('confidence')->default(0.5); // 0-1
            $table->boolean('added_to_rag')->default(false);
            $table->timestamp('added_to_rag_at')->nullable();
            $table->boolean('used_for_training')->default(false);
            $table->timestamp('used_for_training_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('valid_until')->nullable(); // alguns insights expiram
            $table->timestamps();

            $table->foreign('tenant_id')
                ->references('id')
                ->on('tenants')
                ->onDelete('cascade');

            $table->foreign('analysis_id')
                ->references('id')
                ->on('bi_analyses')
                ->onDelete('set null');

            $table->index(['tenant_id', 'knowledge_type', 'is_active']);
            $table->index(['tenant_id', 'category']);
            $table->index(['tenant_id', 'added_to_rag']);
        });

        // Tabela de configurações do BI Agent por tenant
        Schema::create('bi_agent_configs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->unique();
            $table->boolean('auto_analysis_enabled')->default(true);
            $table->string('analysis_frequency')->default('daily'); // daily, weekly, monthly
            $table->time('preferred_analysis_time')->default('06:00:00');
            $table->boolean('auto_add_to_rag')->default(false); // adiciona insights automaticamente ao RAG
            $table->boolean('auto_prepare_training')->default(true);
            $table->jsonb('notification_settings')->nullable();
            $table->jsonb('focus_areas')->nullable(); // áreas de foco prioritárias
            $table->jsonb('thresholds')->nullable(); // limiares para alertas
            $table->timestamps();

            $table->foreign('tenant_id')
                ->references('id')
                ->on('tenants')
                ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bi_agent_configs');
        Schema::dropIfExists('bi_generated_knowledge');
        Schema::dropIfExists('bi_suggested_actions');
        Schema::dropIfExists('bi_analyses');
    }
};

