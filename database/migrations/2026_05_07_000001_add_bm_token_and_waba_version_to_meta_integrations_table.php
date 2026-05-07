<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adiciona campos pra suportar criação de templates em coexistence:
 *
 *   bm_token       Business Manager System User Token (permanente).
 *                  O token do OAuth Embedded Signup vem do app "Tech
 *                  Provider" e em coexistence é restrito pela Meta. O
 *                  System User Token é gerado pelo admin do Business
 *                  Manager do tenant em business.facebook.com →
 *                  Configurações → Usuários do Sistema → Gerar Token,
 *                  com permissões whatsapp_business_management +
 *                  business_management. Encrypted via cast Eloquent.
 *
 *   waba_version   Versão da Graph API por integração. WABAs antigas
 *                  podem ainda estar em v17/v18; a global config usa
 *                  v22 mas pode ser sobrescrita aqui.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('meta_integrations', function (Blueprint $table) {
            $table->text('bm_token')->nullable()->after('access_token');
            $table->string('waba_version', 10)->nullable()->after('bm_token');
        });
    }

    public function down(): void
    {
        Schema::table('meta_integrations', function (Blueprint $table) {
            $table->dropColumn(['bm_token', 'waba_version']);
        });
    }
};
