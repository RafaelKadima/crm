<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Auto-replies keyword-based — quando uma mensagem inbound bate com
 * keywords configuradas, dispara resposta automática (texto + opcional
 * mídia) ANTES do AI agent ser acionado.
 *
 * Match types:
 *   - exact:    case-insensitive comparação completa após trim
 *   - contains: substring case-insensitive
 *   - regex:    expressão regular (sandboxed — timeout 100ms,
 *               sintaxe PHP preg_match)
 *
 * Escopo:
 *   - tenant_id obrigatório
 *   - channel_id opcional (null = todos canais do tenant)
 *   - queue_id opcional (null = independente de fila)
 *   - priority: maior valor = avaliado primeiro; primeiro match vence
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('auto_replies', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('channel_id')->nullable();
            $table->uuid('queue_id')->nullable();

            $table->string('name', 100);                        // identificador interno
            $table->jsonb('keywords');                          // ["preço", "valor", ...]
            $table->string('match_type', 16)->default('contains'); // exact|contains|regex

            $table->text('response_text')->nullable();
            $table->string('response_media_url', 1024)->nullable();
            $table->string('response_media_type', 16)->nullable(); // image|video|audio|document

            $table->integer('priority')->default(0);
            $table->boolean('is_active')->default(true);
            $table->boolean('skip_ai_after_match')->default(true); // se true, IA não é acionada

            $table->timestamps();
            $table->softDeletes();

            $table->foreign('channel_id')->references('id')->on('channels')->cascadeOnDelete();
            $table->foreign('queue_id')->references('id')->on('queues')->cascadeOnDelete();

            $table->index(['tenant_id', 'is_active', 'priority'], 'auto_replies_lookup_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('auto_replies');
    }
};
