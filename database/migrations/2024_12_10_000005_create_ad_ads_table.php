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
        Schema::create('ad_ads', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('ad_adset_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('ad_creative_id')->nullable()->constrained()->nullOnDelete();
            
            $table->string('platform_ad_id'); // ID na plataforma
            $table->string('name');
            $table->string('status'); // ACTIVE, PAUSED, DELETED, ARCHIVED, PENDING_REVIEW, DISAPPROVED
            
            // Conteúdo do anúncio (caso não use creative separado)
            $table->text('headline')->nullable();
            $table->text('description')->nullable();
            $table->text('primary_text')->nullable();
            $table->string('call_to_action')->nullable();
            $table->string('destination_url')->nullable();
            $table->string('preview_url')->nullable(); // URL de preview do anúncio
            
            // Métricas snapshot (última sincronização)
            $table->decimal('spend', 12, 2)->default(0);
            $table->integer('impressions')->default(0);
            $table->integer('clicks')->default(0);
            $table->integer('conversions')->default(0);
            $table->decimal('conversion_value', 12, 2)->default(0);
            $table->decimal('ctr', 8, 4)->default(0);
            $table->decimal('cpc', 8, 4)->default(0);
            $table->decimal('cpm', 8, 4)->default(0);
            $table->decimal('roas', 8, 4)->default(0);
            $table->decimal('frequency', 8, 2)->default(0); // média de vezes que usuário viu
            $table->integer('reach')->default(0); // pessoas únicas alcançadas
            
            // Score de performance (calculado pela IA)
            $table->decimal('performance_score', 5, 2)->nullable(); // 0-100
            $table->string('performance_label')->nullable(); // winner, average, underperforming
            
            $table->json('metadata')->nullable();
            $table->timestamp('last_sync_at')->nullable();
            
            $table->timestamps();
            
            $table->unique(['ad_adset_id', 'platform_ad_id']);
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'performance_label']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ad_ads');
    }
};

