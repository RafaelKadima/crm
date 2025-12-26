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
        Schema::create('support_actions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('session_id')->constrained('support_sessions')->cascadeOnDelete();
            $table->string('tool_name'); // Nome da tool executada
            $table->json('arguments')->nullable(); // Argumentos passados
            $table->json('result')->nullable(); // Resultado da execucao
            $table->enum('status', ['pending', 'approved', 'rejected', 'executed', 'failed'])->default('pending');
            $table->boolean('requires_approval')->default(false);
            $table->boolean('dangerous')->default(false);
            $table->text('error_message')->nullable();
            $table->integer('execution_time_ms')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('executed_at')->nullable();
            $table->timestamps();

            $table->index(['session_id', 'status']);
            $table->index('tool_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('support_actions');
    }
};
