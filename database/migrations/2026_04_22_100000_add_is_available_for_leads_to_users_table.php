<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Toggle ON/OFF de recebimento de leads independente de is_active.
 *
 * Motivação: antes, para um vendedor de folga não receber leads, o admin
 * precisava desativar is_active (mas aí ele perde o login) OU remover manualmente
 * de todas as filas (e reativar manualmente ao voltar). Este flag resolve:
 * default true, vendedor pode se marcar OFF quando sai de folga e ON quando volta.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_available_for_leads')->default(true)->after('is_active');
            $table->index(['tenant_id', 'is_available_for_leads'], 'idx_users_tenant_available');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex('idx_users_tenant_available');
            $table->dropColumn('is_available_for_leads');
        });
    }
};
