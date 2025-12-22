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
        Schema::create('user_points', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('user_id');
            $table->integer('total_points')->default(0); // Histórico total (nunca reseta)
            $table->integer('current_points')->default(0); // Período atual
            $table->string('period', 7); // YYYY-MM
            $table->uuid('current_tier_id')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')
                ->references('id')
                ->on('tenants')
                ->onDelete('cascade');

            $table->foreign('user_id')
                ->references('id')
                ->on('users')
                ->onDelete('cascade');

            $table->foreign('current_tier_id')
                ->references('id')
                ->on('gamification_tiers')
                ->onDelete('set null');

            $table->unique(['user_id', 'period']);
            $table->index(['tenant_id', 'period', 'current_points']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_points');
    }
};
