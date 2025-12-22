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
        Schema::create('stage_activity_templates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('pipeline_id');
            $table->uuid('stage_id');
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('activity_type'); // call, email, meeting, task, demo, follow_up
            $table->boolean('is_required')->default(false);
            $table->integer('order')->default(0);
            $table->integer('default_duration_minutes')->nullable();
            $table->integer('due_days')->default(1); // Vence em X dias após entrar na etapa
            $table->integer('points')->default(0); // Pontos ao completar
            $table->uuid('created_by')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')
                ->references('id')
                ->on('tenants')
                ->onDelete('cascade');

            $table->foreign('pipeline_id')
                ->references('id')
                ->on('pipelines')
                ->onDelete('cascade');

            $table->foreign('stage_id')
                ->references('id')
                ->on('pipeline_stages')
                ->onDelete('cascade');

            $table->foreign('created_by')
                ->references('id')
                ->on('users')
                ->onDelete('set null');

            $table->index(['stage_id', 'order']);
            $table->index(['tenant_id', 'pipeline_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stage_activity_templates');
    }
};
