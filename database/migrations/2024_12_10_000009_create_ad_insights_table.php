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
        Schema::create('ad_insights', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
            
            // Entidade relacionada (opcional)
            $table->string('entity_type')->nullable(); // account, campaign, adset, ad
            $table->uuid('entity_id')->nullable();
            $table->string('entity_name')->nullable();
            
            // Tipo de insight
            $table->string('type'); // performance_drop, opportunity, budget_alert, winner_ad, suggestion, anomaly
            $table->string('severity'); // info, warning, critical, success
            
            // Conteúdo
            $table->string('title');
            $table->text('description');
            $table->text('recommendation')->nullable();
            
            // Dados de suporte
            $table->json('data')->nullable(); // métricas, comparações, etc.
            
            // Ação sugerida
            $table->json('suggested_action')->nullable();
            /*
            {
                "type": "pause_ad",
                "entity_type": "ad",
                "entity_id": "...",
                "params": {}
            }
            */
            
            // Status do insight
            $table->string('status')->default('pending'); // pending, applied, dismissed, expired
            $table->foreignUuid('actioned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('actioned_at')->nullable();
            $table->text('action_notes')->nullable();
            
            // Validade
            $table->timestamp('expires_at')->nullable();
            
            $table->timestamps();
            
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'type']);
            $table->index(['tenant_id', 'severity']);
            $table->index(['entity_type', 'entity_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ad_insights');
    }
};

