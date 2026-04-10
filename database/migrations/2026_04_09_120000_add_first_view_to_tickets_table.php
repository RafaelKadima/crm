<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Adiciona rastreio do primeiro atendimento para suportar o fluxo
     * pending → open: novas conversas nascem como `pending` e só viram
     * `open` quando um atendente abre pela primeira vez. As colunas abaixo
     * marcam quem foi o primeiro a ver e quando, para métricas de SLA de
     * primeira resposta.
     */
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->timestamp('first_viewed_at')->nullable()->after('closed_at');
            $table->uuid('first_viewer_id')->nullable()->after('first_viewed_at');

            $table->foreign('first_viewer_id')
                ->references('id')
                ->on('users')
                ->onDelete('set null');

            $table->index(['tenant_id', 'first_viewed_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropForeign(['first_viewer_id']);
            $table->dropIndex(['tenant_id', 'first_viewed_at']);
            $table->dropColumn(['first_viewed_at', 'first_viewer_id']);
        });
    }
};
