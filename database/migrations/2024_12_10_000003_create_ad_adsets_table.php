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
        Schema::create('ad_adsets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('ad_campaign_id')->constrained()->cascadeOnDelete();
            
            $table->string('platform_adset_id'); // ID na plataforma (adset no Meta, ad_group no Google)
            $table->string('name');
            $table->string('status'); // ACTIVE, PAUSED, DELETED, ARCHIVED
            
            $table->decimal('daily_budget', 12, 2)->nullable();
            $table->decimal('lifetime_budget', 12, 2)->nullable();
            $table->string('bid_strategy')->nullable(); // LOWEST_COST, COST_CAP, BID_CAP
            $table->decimal('bid_amount', 12, 2)->nullable();
            
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            
            // Targeting resumido
            $table->json('targeting')->nullable(); // age, gender, locations, interests, etc.
            $table->string('optimization_goal')->nullable(); // CONVERSIONS, LINK_CLICKS, IMPRESSIONS
            
            // Métricas snapshot
            $table->decimal('spend', 12, 2)->default(0);
            $table->integer('impressions')->default(0);
            $table->integer('clicks')->default(0);
            $table->integer('conversions')->default(0);
            $table->decimal('ctr', 8, 4)->default(0);
            $table->decimal('cpc', 8, 4)->default(0);
            $table->decimal('cpm', 8, 4)->default(0);
            $table->decimal('roas', 8, 4)->default(0);
            
            $table->json('metadata')->nullable();
            $table->timestamp('last_sync_at')->nullable();
            
            $table->timestamps();
            
            $table->unique(['ad_campaign_id', 'platform_adset_id']);
            $table->index(['tenant_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ad_adsets');
    }
};

