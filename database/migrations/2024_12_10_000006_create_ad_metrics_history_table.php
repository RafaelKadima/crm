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
        Schema::create('ad_metrics_history', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
            
            // Referência polimórfica (pode ser campaign, adset ou ad)
            $table->string('entity_type'); // campaign, adset, ad
            $table->uuid('entity_id');
            
            $table->date('date'); // Data das métricas
            
            // Métricas principais
            $table->decimal('spend', 12, 2)->default(0);
            $table->integer('impressions')->default(0);
            $table->integer('clicks')->default(0);
            $table->integer('conversions')->default(0);
            $table->decimal('conversion_value', 12, 2)->default(0);
            
            // Métricas calculadas
            $table->decimal('ctr', 8, 4)->default(0);
            $table->decimal('cpc', 8, 4)->default(0);
            $table->decimal('cpm', 8, 4)->default(0);
            $table->decimal('roas', 8, 4)->default(0);
            $table->decimal('cost_per_conversion', 8, 4)->default(0);
            
            // Métricas de alcance
            $table->integer('reach')->default(0);
            $table->decimal('frequency', 8, 2)->default(0);
            
            // Engajamento (Meta)
            $table->integer('likes')->default(0);
            $table->integer('comments')->default(0);
            $table->integer('shares')->default(0);
            $table->integer('video_views')->default(0);
            $table->integer('video_views_25')->default(0);
            $table->integer('video_views_50')->default(0);
            $table->integer('video_views_75')->default(0);
            $table->integer('video_views_100')->default(0);
            
            // Métricas extras da plataforma
            $table->json('extra_metrics')->nullable();
            
            $table->timestamps();
            
            $table->unique(['entity_type', 'entity_id', 'date']);
            $table->index(['tenant_id', 'date']);
            $table->index(['entity_type', 'entity_id', 'date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ad_metrics_history');
    }
};

