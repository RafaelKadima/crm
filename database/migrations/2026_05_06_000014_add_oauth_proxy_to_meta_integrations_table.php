<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * OAuth com proxy white-label — permite que tenants usem OAuth do
 * Omnify (com domínio próprio do Omnify) em vez de configurar
 * Meta App próprio.
 *
 * Fluxo OWN_APP (default):
 *   - Tenant configura próprio Meta App (app_id + app_secret)
 *   - OAuth callback vai pra crm.omnify.center/api/meta/callback
 *   - Tenant gerencia próprio webhook na Meta
 *
 * Fluxo OMNIFY_OAUTH (white-label):
 *   - Tenant não precisa de Meta App próprio
 *   - Usa app credenciado pelo Omnify
 *   - OAuth callback vai pra oauth.omnify.center
 *   - Webhook centralizado fan-out pelos tenants
 *
 * `webhook_needs_revalidation` — quando admin troca de modo OWN_APP
 * pra OMNIFY_OAUTH (ou vice-versa), força o re-OAuth na próxima
 * request administrativa.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('meta_integrations', function (Blueprint $table) {
            $table->string('webhook_origin', 32)->default('own_app')->after('access_token');
            // own_app | omnify_oauth — controla qual app credentials usa
            $table->boolean('oauth_proxy_enabled')->default(false)->after('webhook_origin');
            $table->string('oauth_redirect_uri', 500)->nullable()->after('oauth_proxy_enabled');
            $table->boolean('webhook_needs_revalidation')->default(false)->after('oauth_redirect_uri');

            $table->index(['webhook_origin'], 'meta_integrations_origin_idx');
        });
    }

    public function down(): void
    {
        Schema::table('meta_integrations', function (Blueprint $table) {
            $table->dropIndex('meta_integrations_origin_idx');
            $table->dropColumn([
                'webhook_origin',
                'oauth_proxy_enabled',
                'oauth_redirect_uri',
                'webhook_needs_revalidation',
            ]);
        });
    }
};
