<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Steps individuais de um fluxo. Tipos:
 *
 *   send_message:
 *     {text, media_url?, media_type?}
 *     Envia e avança imediatamente pro próximo step.
 *
 *   wait_input:
 *     {timeout_seconds: 600, save_to_field: "context_field_name"}
 *     Para o engine. Próximo inbound do cliente é capturado e salvo
 *     no context.{save_to_field}. Se exceder timeout, segue como se
 *     resposta fosse vazia (decidir por convention; futuro: branch
 *     on_timeout).
 *
 *   condition:
 *     {field: "context.preference", operator: "equals|contains|gt|lt",
 *      value: "buy", true_step_order: 5, false_step_order: 8}
 *     Ramifica fluxo baseado no contexto acumulado.
 *
 *   branch:
 *     {prompt: "Escolha:", options: [{label, value, target_step_order}]}
 *     Envia menu interativo (lista WABA) + espera input. Map de
 *     resposta → step_order.
 *
 *   handoff_human:
 *     {queue_id?: "uuid", message?: "texto"}
 *     Encerra o flow + entrega o ticket pra fila/atendente humano.
 *
 *   end:
 *     {message?: "encerramento"}
 *     Encerra normalmente sem handoff.
 *
 * `order` é 1-based, único dentro do step_reply. Engine usa `order`
 * pra determinar próximo step linear; condition/branch fazem jump.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('step_reply_steps', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('step_reply_id');
            $table->unsignedInteger('order');
            $table->string('type', 32);
            // send_message | wait_input | condition | branch | handoff_human | end
            $table->jsonb('config');
            $table->timestamps();

            $table->foreign('step_reply_id')->references('id')->on('step_replies')->cascadeOnDelete();
            $table->unique(['step_reply_id', 'order'], 'step_reply_steps_order_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('step_reply_steps');
    }
};
