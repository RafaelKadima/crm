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
        Schema::table('tenants', function (Blueprint $table) {
            // Campos de integracao Linx
            $table->boolean('linx_enabled')->default(false)->after('branding');
            $table->string('linx_empresa_id', 50)->nullable()->after('linx_enabled');
            $table->string('linx_revenda_id', 50)->nullable()->after('linx_empresa_id');
            $table->string('linx_api_url')->nullable()->after('linx_revenda_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn([
                'linx_enabled',
                'linx_empresa_id',
                'linx_revenda_id',
                'linx_api_url',
            ]);
        });
    }
};
