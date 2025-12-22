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
        Schema::create('point_transactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('user_id');
            $table->integer('points'); // Pode ser negativo para deduções
            $table->string('action_type');
            $table->text('description')->nullable();
            $table->string('reference_type')->nullable(); // Lead, DealStageActivity, etc.
            $table->uuid('reference_id')->nullable();
            $table->uuid('point_rule_id')->nullable();
            $table->string('period', 7); // YYYY-MM para ranking mensal
            $table->timestamps();

            $table->foreign('tenant_id')
                ->references('id')
                ->on('tenants')
                ->onDelete('cascade');

            $table->foreign('user_id')
                ->references('id')
                ->on('users')
                ->onDelete('cascade');

            $table->foreign('point_rule_id')
                ->references('id')
                ->on('point_rules')
                ->onDelete('set null');

            $table->index(['user_id', 'period']);
            $table->index(['tenant_id', 'period', 'points']);
            $table->index(['tenant_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('point_transactions');
    }
};
