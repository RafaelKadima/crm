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
        Schema::create('achievements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->string('name'); // ex: "Primeira venda", "10 ligações em um dia"
            $table->text('description')->nullable();
            $table->string('icon');
            $table->string('condition_type'); // first_sale, streak_days, total_calls, total_deals, etc.
            $table->json('condition_value'); // Parâmetros da condição {"count": 10, "period": "day"}
            $table->integer('points_bonus')->default(0); // Pontos bônus ao desbloquear
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('tenant_id')
                ->references('id')
                ->on('tenants')
                ->onDelete('cascade');

            $table->index(['tenant_id', 'is_active']);
            $table->index(['tenant_id', 'condition_type']);
        });

        Schema::create('user_achievements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('user_id');
            $table->uuid('achievement_id');
            $table->timestamp('earned_at');
            $table->timestamps();

            $table->foreign('tenant_id')
                ->references('id')
                ->on('tenants')
                ->onDelete('cascade');

            $table->foreign('user_id')
                ->references('id')
                ->on('users')
                ->onDelete('cascade');

            $table->foreign('achievement_id')
                ->references('id')
                ->on('achievements')
                ->onDelete('cascade');

            $table->unique(['user_id', 'achievement_id']);
            $table->index(['tenant_id', 'earned_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_achievements');
        Schema::dropIfExists('achievements');
    }
};
