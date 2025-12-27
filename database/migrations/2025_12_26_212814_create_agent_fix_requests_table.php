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
        Schema::create('agent_fix_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('ticket_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('sdr_agent_id')->constrained('sdr_agents')->cascadeOnDelete();

            // Diagnóstico
            $table->text('problem_description');
            $table->text('diagnosis_summary');
            $table->json('diagnostic_data')->nullable();

            // Correção proposta
            $table->string('file_path');
            $table->text('old_code');
            $table->text('new_code');
            $table->text('fix_explanation');
            $table->string('commit_message')->nullable();

            // Status
            $table->enum('status', [
                'pending_approval',
                'approved',
                'rejected',
                'executing',
                'deployed',
                'confirmed_fixed',
                'confirmed_broken',
                'escalated'
            ])->default('pending_approval');

            // Aprovação
            $table->string('approver_phone')->nullable();
            $table->string('approval_token', 64)->unique();
            $table->timestamp('approved_at')->nullable();
            $table->text('rejection_reason')->nullable();

            // Execução
            $table->timestamp('deployed_at')->nullable();
            $table->json('execution_result')->nullable();

            // Feedback cliente
            $table->boolean('customer_confirmed_fixed')->nullable();
            $table->text('customer_feedback')->nullable();

            // Retry
            $table->integer('retry_count')->default(0);

            $table->timestamps();

            // Índices
            $table->index('status');
            $table->index('approver_phone');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('agent_fix_requests');
    }
};
