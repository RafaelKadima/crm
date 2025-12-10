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
        // Limites/Quotas por tenant (baseado no plano)
        Schema::create('tenant_quotas', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->unique();
            $table->integer('max_leads_month')->default(500);
            $table->integer('max_users')->default(3);
            $table->integer('max_channels')->default(1);
            $table->integer('max_ai_messages_month')->default(0);
            $table->decimal('max_ai_cost_month', 10, 2)->default(0);
            $table->integer('max_storage_mb')->default(1024);
            $table->boolean('enforce_limits')->default(true);
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
        });

        // Logs de uso de IA (cada chamada)
        Schema::create('ai_usage_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('lead_id')->nullable();
            $table->uuid('ticket_id')->nullable();
            $table->uuid('agent_id')->nullable();
            $table->string('model')->default('gpt-4o-mini');
            $table->integer('input_tokens')->default(0);
            $table->integer('output_tokens')->default(0);
            $table->integer('total_tokens')->default(0);
            $table->decimal('cost_usd', 10, 6)->default(0);
            $table->decimal('cost_brl', 10, 4)->default(0);
            $table->string('action_type')->nullable();
            $table->integer('response_time_ms')->nullable();
            $table->boolean('from_cache')->default(false);
            $table->json('metadata')->nullable();
            $table->timestamp('created_at');

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->index(['tenant_id', 'created_at']);
            $table->index('created_at');
        });

        // Estatísticas agregadas por mês
        Schema::create('tenant_usage_stats', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->integer('year');
            $table->integer('month');
            
            // Leads
            $table->integer('leads_created')->default(0);
            $table->integer('leads_qualified')->default(0);
            $table->integer('leads_converted')->default(0);
            
            // IA
            $table->integer('ai_messages_sent')->default(0);
            $table->bigInteger('ai_total_tokens')->default(0);
            $table->decimal('ai_cost_usd', 10, 4)->default(0);
            $table->decimal('ai_cost_brl', 10, 2)->default(0);
            
            // Tickets
            $table->integer('tickets_created')->default(0);
            $table->integer('tickets_closed')->default(0);
            
            // WhatsApp
            $table->integer('messages_inbound')->default(0);
            $table->integer('messages_outbound')->default(0);
            
            // Storage
            $table->bigInteger('storage_used_bytes')->default(0);
            
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->unique(['tenant_id', 'year', 'month']);
            $table->index(['year', 'month']);
        });

        // Alertas de custos/limites
        Schema::create('cost_alerts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->string('type'); // quota_warning, quota_exceeded, cost_warning, cost_exceeded
            $table->string('resource'); // leads, ai_messages, ai_cost, storage
            $table->integer('threshold_percent')->nullable();
            $table->decimal('current_value', 12, 4)->nullable();
            $table->decimal('limit_value', 12, 4)->nullable();
            $table->string('status')->default('active'); // active, acknowledged, resolved
            $table->uuid('acknowledged_by')->nullable();
            $table->timestamp('acknowledged_at')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('acknowledged_by')->references('id')->on('users')->nullOnDelete();
            $table->index(['tenant_id', 'status']);
            $table->index('created_at');
        });

        // Histórico de custos para faturamento
        Schema::create('billing_records', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->integer('year');
            $table->integer('month');
            $table->string('plan');
            $table->decimal('base_price', 10, 2);
            $table->decimal('extra_leads_cost', 10, 2)->default(0);
            $table->decimal('extra_ai_cost', 10, 2)->default(0);
            $table->decimal('extra_users_cost', 10, 2)->default(0);
            $table->decimal('total_cost', 10, 2);
            $table->json('breakdown')->nullable();
            $table->string('status')->default('pending'); // pending, paid, overdue
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->unique(['tenant_id', 'year', 'month']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('billing_records');
        Schema::dropIfExists('cost_alerts');
        Schema::dropIfExists('tenant_usage_stats');
        Schema::dropIfExists('ai_usage_logs');
        Schema::dropIfExists('tenant_quotas');
    }
};

