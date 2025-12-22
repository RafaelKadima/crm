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
        Schema::table('users', function (Blueprint $table) {
            // Campos especificos para integracao Linx
            $table->string('linx_empresa_id', 50)->nullable()->after('is_super_admin');
            $table->string('linx_vendedor_id', 50)->nullable()->after('linx_empresa_id');
            $table->string('linx_loja_id', 50)->nullable()->after('linx_vendedor_id');
            $table->string('linx_showroom_id', 50)->nullable()->after('linx_loja_id');

            // Campo JSON flexivel para futuras integracoes
            $table->json('external_integrations')->nullable()->after('linx_showroom_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'linx_empresa_id',
                'linx_vendedor_id',
                'linx_loja_id',
                'linx_showroom_id',
                'external_integrations',
            ]);
        });
    }
};
