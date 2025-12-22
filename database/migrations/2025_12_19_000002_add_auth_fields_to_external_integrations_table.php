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
            // Identificador unico por tenant (ex: 'linx', 'webhook-crm')
            $table->string('slug', 100)->nullable()->after('name');

            // Descricao da integracao
            $table->text('description')->nullable()->after('slug');

            // Tipo de autenticacao
            $table->string('auth_type')->default('none')->after('headers'); // none, basic, bearer, api_key

            // Configuracao de autenticacao (criptografado)
            $table->text('auth_config')->nullable()->after('auth_type');

            // Eventos que disparam a sincronizacao
            $table->json('trigger_on')->nullable()->after('auth_config'); // ['lead_created', 'lead_stage_changed', 'lead_owner_assigned']

            // Index unico para slug por tenant
            $table->unique(['tenant_id', 'slug'], 'external_integrations_tenant_slug_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('external_integrations', function (Blueprint $table) {
            $table->dropUnique('external_integrations_tenant_slug_unique');
            $table->dropColumn([
                'slug',
                'description',
                'auth_type',
                'auth_config',
                'trigger_on',
            ]);
        });
    }
};
