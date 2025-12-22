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
        Schema::create('gamification_settings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->unique();
            $table->boolean('is_enabled')->default(true);
            $table->string('reset_period')->default('monthly'); // monthly, quarterly, yearly, never
            $table->boolean('show_leaderboard')->default(true);
            $table->boolean('show_points_to_users')->default(true);
            $table->boolean('notify_tier_change')->default(true);
            $table->boolean('notify_achievement')->default(true);
            $table->boolean('sound_enabled')->default(true);
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
        Schema::dropIfExists('gamification_settings');
    }
};
