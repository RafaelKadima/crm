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
        Schema::create('content_sessions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('user_id');
            $table->jsonb('messages')->default('[]');
            $table->string('current_step', 50)->default('idle');
            $table->string('topic', 500)->nullable();
            $table->jsonb('research_data')->nullable();
            $table->string('selected_creator', 255)->nullable();
            $table->jsonb('generated_hooks')->nullable();
            $table->string('selected_hook', 500)->nullable();
            $table->text('final_reel')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')
                ->references('id')
                ->on('tenants')
                ->onDelete('cascade');

            $table->foreign('user_id')
                ->references('id')
                ->on('users')
                ->onDelete('cascade');

            $table->index('tenant_id');
            $table->index(['tenant_id', 'user_id']);
            $table->index('current_step');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('content_sessions');
    }
};
