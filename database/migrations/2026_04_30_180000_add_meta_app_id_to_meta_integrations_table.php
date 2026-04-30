<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Adiciona meta_app_id à tabela meta_integrations.
 *
 * Motivação: o projeto usa 2 Meta Apps (regular Embedded Signup vs Coexistence)
 * mas até hoje não rastreávamos qual app emitiu cada token. Resultado: chamadas
 * server-to-server (debug_token, message_templates) usavam sempre o mesmo
 * app_secret e falhavam com (#100) "did not match the Viewing App" para tokens
 * emitidos pelo outro app. Ver memory/project_two_meta_apps.md.
 *
 * Estratégia:
 *   1. Adicionar coluna nullable.
 *   2. Backfill baseado em is_coexistence + env vars.
 *      - is_coexistence=true → META_COEXISTENCE_APP_ID
 *      - else                → META_APP_ID
 *   3. Forçar NOT NULL — se backfill deixou alguma linha NULL (env var faltando),
 *      a migration falha e fica claro que falta configurar o env.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('meta_integrations', function (Blueprint $table) {
            $table->string('meta_app_id')->nullable()->after('access_token');
            $table->index('meta_app_id');
        });

        $regularAppId = env('META_APP_ID');
        $coexistenceAppId = env('META_COEXISTENCE_APP_ID');

        if ($regularAppId) {
            DB::table('meta_integrations')
                ->where('is_coexistence', false)
                ->whereNull('meta_app_id')
                ->update(['meta_app_id' => $regularAppId]);
        }

        if ($coexistenceAppId) {
            DB::table('meta_integrations')
                ->where('is_coexistence', true)
                ->whereNull('meta_app_id')
                ->update(['meta_app_id' => $coexistenceAppId]);
        }

        $unfilled = DB::table('meta_integrations')->whereNull('meta_app_id')->count();
        if ($unfilled > 0) {
            throw new \RuntimeException(
                "{$unfilled} meta_integrations linha(s) ficaram com meta_app_id NULL após backfill. " .
                "Configure META_APP_ID e/ou META_COEXISTENCE_APP_ID no .env antes de rodar esta migration."
            );
        }

        Schema::table('meta_integrations', function (Blueprint $table) {
            $table->string('meta_app_id')->nullable(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('meta_integrations', function (Blueprint $table) {
            $table->dropIndex(['meta_app_id']);
            $table->dropColumn('meta_app_id');
        });
    }
};
