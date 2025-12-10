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
        Schema::create('ad_campaigns', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('ad_account_id')->constrained()->cascadeOnDelete();
            
            $table->string('platform_campaign_id'); // ID na plataforma
            $table->string('name');
            $table->string('objective')->nullable(); // CONVERSIONS, TRAFFIC, AWARENESS, etc.
            $table->string('status'); // ACTIVE, PAUSED, DELETED, ARCHIVED
            
            $table->decimal('daily_budget', 12, 2)->nullable();
            $table->decimal('lifetime_budget', 12, 2)->nullable();
            $table->string('budget_type')->default('daily'); // daily, lifetime
            
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            
            // Métricas snapshot (última sincronização)
            $table->decimal('spend', 12, 2)->default(0);
            $table->integer('impressions')->default(0);
            $table->integer('clicks')->default(0);
            $table->integer('conversions')->default(0);
            $table->decimal('ctr', 8, 4)->default(0); // Click-Through Rate
            $table->decimal('cpc', 8, 4)->default(0); // Cost Per Click
            $table->decimal('cpm', 8, 4)->default(0); // Cost Per Mille
            $table->decimal('roas', 8, 4)->default(0); // Return On Ad Spend
            
            $table->json('metadata')->nullable();
            $table->timestamp('last_sync_at')->nullable();
            
            $table->timestamps();
            
            $table->unique(['ad_account_id', 'platform_campaign_id']);
            $table->index(['tenant_id', 'status']);
            $table->index(['ad_account_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ad_campaigns');
    }
};

