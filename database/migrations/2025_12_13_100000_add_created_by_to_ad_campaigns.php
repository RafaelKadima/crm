<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Adiciona campo created_by para rastrear origem das campanhas:
     * - 'agent': Criada pelo agente IA
     * - 'human': Criada manualmente pelo gestor
     * - 'external': Importada do Meta (origem desconhecida)
     */
    public function up(): void
    {
        Schema::table('ad_campaigns', function (Blueprint $table) {
            $table->string('created_by', 20)->default('external')->after('metadata');
            $table->index('created_by');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ad_campaigns', function (Blueprint $table) {
            $table->dropIndex(['created_by']);
            $table->dropColumn('created_by');
        });
    }
};

