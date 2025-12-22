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
        Schema::create('deal_stage_activities', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('lead_id'); // "Deal" é o Lead neste CRM
            $table->uuid('stage_id');
            $table->uuid('stage_activity_template_id');
            $table->string('status')->default('pending'); // pending, completed, skipped
            $table->timestamp('due_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->uuid('completed_by')->nullable();
            $table->integer('points_earned')->default(0);
            $table->timestamps();

            $table->foreign('tenant_id')
                ->references('id')
                ->on('tenants')
                ->onDelete('cascade');

            $table->foreign('lead_id')
                ->references('id')
                ->on('leads')
                ->onDelete('cascade');

            $table->foreign('stage_id')
                ->references('id')
                ->on('pipeline_stages')
                ->onDelete('cascade');

            $table->foreign('stage_activity_template_id')
                ->references('id')
                ->on('stage_activity_templates')
                ->onDelete('cascade');

            $table->foreign('completed_by')
                ->references('id')
                ->on('users')
                ->onDelete('set null');

            $table->index(['lead_id', 'stage_id', 'status']);
            $table->index(['tenant_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('deal_stage_activities');
    }
};
