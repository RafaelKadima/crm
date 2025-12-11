<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Adiciona campos UTM nos leads para tracking de origem de campanhas.
     */
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            if (!Schema::hasColumn('leads', 'utm_source')) {
                $table->string('utm_source')->nullable()->after('metadata');
            }
            if (!Schema::hasColumn('leads', 'utm_medium')) {
                $table->string('utm_medium')->nullable()->after('utm_source');
            }
            if (!Schema::hasColumn('leads', 'utm_campaign')) {
                $table->string('utm_campaign')->nullable()->after('utm_medium');
            }
            if (!Schema::hasColumn('leads', 'utm_content')) {
                $table->string('utm_content')->nullable()->after('utm_campaign');
            }
            if (!Schema::hasColumn('leads', 'utm_term')) {
                $table->string('utm_term')->nullable()->after('utm_content');
            }
            if (!Schema::hasColumn('leads', 'ad_campaign_id')) {
                $table->foreignUuid('ad_campaign_id')->nullable()->after('utm_term');
            }
            if (!Schema::hasColumn('leads', 'ad_ad_id')) {
                $table->foreignUuid('ad_ad_id')->nullable()->after('ad_campaign_id');
            }
        });
        
        // Adicionar índices
        Schema::table('leads', function (Blueprint $table) {
            $table->index(['tenant_id', 'utm_campaign']);
            $table->index(['tenant_id', 'ad_campaign_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'utm_campaign']);
            $table->dropIndex(['tenant_id', 'ad_campaign_id']);
            
            $columns = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'ad_campaign_id', 'ad_ad_id'];
            foreach ($columns as $column) {
                if (Schema::hasColumn('leads', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
