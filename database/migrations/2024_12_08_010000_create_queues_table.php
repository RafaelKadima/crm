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
        Schema::create('queues', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('channel_id');
            $table->uuid('pipeline_id');
            $table->string('name'); // Nome do setor (SAC, Comercial, Pós-venda)
            $table->unsignedTinyInteger('menu_option'); // Número da opção no menu (1, 2, 3)
            $table->string('menu_label'); // Texto exibido no menu (ex: "Atendimento ao Cliente")
            $table->text('welcome_message')->nullable(); // Mensagem de boas-vindas ao entrar na fila
            $table->boolean('auto_distribute')->default(true); // Se autodistribui entre usuários
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('channel_id')->references('id')->on('channels')->onDelete('cascade');
            $table->foreign('pipeline_id')->references('id')->on('pipelines')->onDelete('cascade');

            // Garantir que não tenha duas filas com a mesma opção de menu no mesmo canal
            $table->unique(['channel_id', 'menu_option']);
            
            // Index para buscas
            $table->index(['tenant_id', 'channel_id']);
            $table->index(['channel_id', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('queues');
    }
};

