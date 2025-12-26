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
        Schema::create('support_activity_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('agent_id');
            $table->uuid('ticket_id')->nullable();
            $table->uuid('lead_id')->nullable();

            // Ação executada
            $table->string('action_type', 50); // diagnostic, response, transfer, resolution
            $table->string('tool_used', 50)->nullable(); // get_error_logs, search_codebase, etc
            $table->json('tool_arguments')->nullable();
            $table->text('tool_result')->nullable();

            // Contexto
            $table->text('user_message')->nullable();
            $table->text('agent_response')->nullable();

            // Diagnóstico
            $table->boolean('error_found')->default(false);
            $table->json('error_details')->nullable();
            $table->boolean('resolution_provided')->default(false);
            $table->text('resolution_summary')->nullable();

            // Métricas
            $table->integer('execution_time_ms')->nullable();
            $table->integer('tokens_used')->nullable();

            $table->timestamps();

            // Índices
            $table->index(['tenant_id', 'created_at']);
            $table->index(['agent_id', 'created_at']);
            $table->index(['ticket_id']);
            $table->index(['action_type', 'created_at']);

            // Foreign keys
            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('agent_id')->references('id')->on('sdr_agents')->onDelete('cascade');
            $table->foreign('ticket_id')->references('id')->on('tickets')->onDelete('set null');
            $table->foreign('lead_id')->references('id')->on('leads')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('support_activity_logs');
    }
};
