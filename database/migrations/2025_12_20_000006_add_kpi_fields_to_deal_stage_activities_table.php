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
        Schema::table('deal_stage_activities', function (Blueprint $table) {
            $table->json('kpi_contributions')->nullable()->after('points_earned');
            $table->decimal('revenue_contribution', 15, 2)->default(0)->after('kpi_contributions');
            $table->text('completion_notes')->nullable()->after('revenue_contribution');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('deal_stage_activities', function (Blueprint $table) {
            $table->dropColumn(['kpi_contributions', 'revenue_contribution', 'completion_notes']);
        });
    }
};
