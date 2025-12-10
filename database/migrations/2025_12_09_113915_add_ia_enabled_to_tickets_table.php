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
        Schema::table('tickets', function (Blueprint $table) {
            // Flag para habilitar/desabilitar IA neste ticket específico
            // true = IA responde automaticamente (padrão)
            // false = Vendedor assume o atendimento, IA apenas observa e aprende
            $table->boolean('ia_enabled')->default(true)->after('status');
            
            // Quem desligou a IA e quando
            $table->uuid('ia_disabled_by')->nullable()->after('ia_enabled');
            $table->timestamp('ia_disabled_at')->nullable()->after('ia_disabled_by');
            
            // Foreign key
            $table->foreign('ia_disabled_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropForeign(['ia_disabled_by']);
            $table->dropColumn(['ia_enabled', 'ia_disabled_by', 'ia_disabled_at']);
        });
    }
};
