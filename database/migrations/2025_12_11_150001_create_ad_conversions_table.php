<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Registra conversões atribuídas a campanhas de ads.
     * Permite tracking de performance real baseado em eventos do CRM.
     */
    public function up(): void
    {
        Schema::create('ad_conversions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->onDelete('cascade');
            
            // Relacionamentos com Ads
            $table->foreignUuid('ad_campaign_id')->nullable()->constrained('ad_campaigns')->onDelete('set null');
            $table->foreignUuid('ad_adset_id')->nullable()->constrained('ad_adsets')->onDelete('set null');
            $table->foreignUuid('ad_ad_id')->nullable()->constrained('ad_ads')->onDelete('set null');
            
            // Relacionamento com Lead
            $table->foreignUuid('lead_id')->nullable()->constrained('leads')->onDelete('set null');
            $table->foreignUuid('contact_id')->nullable()->constrained('contacts')->onDelete('set null');
            
            // Evento de conversão
            $table->string('event_type'); // 'purchase', 'lead', 'schedule', 'qualified', 'contact'
            $table->string('gtm_event_key')->nullable(); // Chave do evento GTM
            
            // Valor da conversão
            $table->decimal('value', 12, 2)->nullable();
            $table->string('currency', 3)->default('BRL');
            
            // Dados de atribuição
            $table->json('utm_data')->nullable(); // utm_source, utm_medium, utm_campaign, etc.
            $table->string('attribution_model')->default('last_click'); // last_click, first_click, linear
            $table->float('attribution_weight')->default(1.0); // Para modelos multi-touch
            
            // Dados do pipeline
            $table->string('stage_from')->nullable();
            $table->string('stage_to')->nullable();
            $table->integer('days_to_convert')->nullable();
            
            // Metadados
            $table->json('metadata')->nullable();
            $table->timestamp('converted_at');
            
            $table->timestamps();
            
            // Índices
            $table->index(['tenant_id', 'ad_campaign_id']);
            $table->index(['tenant_id', 'event_type']);
            $table->index(['tenant_id', 'converted_at']);
            $table->index(['lead_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ad_conversions');
    }
};
