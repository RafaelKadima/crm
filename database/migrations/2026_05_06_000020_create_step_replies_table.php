<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Step Replies — fluxos multi-passo conversacionais. Diferente do
 * AutoReply (resposta única), aqui temos uma máquina de estados que
 * faz várias trocas com o usuário antes de finalizar.
 *
 * Tipos de trigger:
 *   - keyword:       inbound bate com keywords[]
 *   - manual:        atendente inicia via API/UI
 *   - auto_on_open:  ticket recém-aberto sem inbound prévio (welcome)
 *
 * Cada flow é uma sequência ordenada de steps (StepReplyStep) que
 * compõem branches, perguntas, condições, e handoff humano.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('step_replies', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('channel_id')->nullable();
            $table->uuid('queue_id')->nullable();

            $table->string('name', 100);
            $table->string('description', 500)->nullable();

            $table->string('trigger_type', 32);          // keyword|manual|auto_on_open
            $table->jsonb('trigger_config')->nullable();
            // {keywords: ["oi","menu"], match_type: "contains"|"exact"} pra trigger=keyword

            $table->boolean('is_active')->default(true);
            $table->integer('priority')->default(0);

            $table->timestamps();
            $table->softDeletes();

            $table->foreign('channel_id')->references('id')->on('channels')->cascadeOnDelete();
            $table->foreign('queue_id')->references('id')->on('queues')->cascadeOnDelete();

            $table->index(['tenant_id', 'is_active', 'priority'], 'step_replies_lookup_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('step_replies');
    }
};
