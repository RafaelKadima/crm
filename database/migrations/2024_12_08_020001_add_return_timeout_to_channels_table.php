<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Timeout para retorno direto ao atendente:
     * - Se lead voltar ANTES do timeout → vai direto pro último atendente
     * - Se lead voltar DEPOIS do timeout → passa pelo menu de filas
     */
    public function up(): void
    {
        Schema::table('channels', function (Blueprint $table) {
            $table->integer('return_timeout_hours')->default(24)->after('queue_menu_settings');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('channels', function (Blueprint $table) {
            $table->dropColumn('return_timeout_hours');
        });
    }
};



