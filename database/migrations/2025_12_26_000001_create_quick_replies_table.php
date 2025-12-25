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
        Schema::create('quick_replies', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->string('title'); // Nome da resposta (ex: "ola", "preco")
            $table->string('shortcut'); // Atalho usado no chat: /ola, /preco
            $table->text('content'); // Texto da mensagem (suporta emojis e variáveis)
            $table->jsonb('variables')->nullable(); // Lista de variáveis detectadas
            $table->boolean('is_active')->default(true);
            $table->integer('use_count')->default(0);
            $table->integer('order')->default(0);
            $table->timestamps();
            $table->softDeletes();

            // Cada usuário pode ter apenas um shortcut com o mesmo nome
            $table->unique(['user_id', 'shortcut']);

            // Índice para busca
            $table->index(['user_id', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('quick_replies');
    }
};
