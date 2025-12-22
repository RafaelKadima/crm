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
        Schema::table('external_integrations', function (Blueprint $table) {
            // Estagios que disparam a integracao (quando trigger_on inclui 'lead_stage_changed')
            // Se null ou vazio, dispara para qualquer mudanca de estagio
            $table->json('trigger_stages')->nullable()->after('trigger_on');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('external_integrations', function (Blueprint $table) {
            $table->dropColumn('trigger_stages');
        });
    }
};
