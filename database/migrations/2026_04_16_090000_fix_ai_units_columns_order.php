<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Repara a ordem de migrations: as migrations `2024_12_12_10000X_add_ai_units_*`
 * foram escritas com timestamps anteriores à criação das tabelas
 * (`2025_12_10_000000_create_tenant_usage_system`). Em ambientes novos (ex.: SQLite local),
 * elas rodam antes, no-op, e as colunas nunca são adicionadas. Esta migration
 * executa os ALTERs depois que as tabelas já existem.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('tenant_quotas')) {
            Schema::table('tenant_quotas', function (Blueprint $table) {
                if (!Schema::hasColumn('tenant_quotas', 'max_ai_units_month')) {
                    $table->integer('max_ai_units_month')->default(0);
                }
                if (!Schema::hasColumn('tenant_quotas', 'bonus_ai_units')) {
                    $table->integer('bonus_ai_units')->default(0);
                }
                if (!Schema::hasColumn('tenant_quotas', 'max_rag_documents_month')) {
                    $table->integer('max_rag_documents_month')->default(0);
                }
                if (!Schema::hasColumn('tenant_quotas', 'max_audio_minutes_month')) {
                    $table->integer('max_audio_minutes_month')->default(0);
                }
                if (!Schema::hasColumn('tenant_quotas', 'max_image_analyses_month')) {
                    $table->integer('max_image_analyses_month')->default(0);
                }
                if (!Schema::hasColumn('tenant_quotas', 'gpt4o_enabled')) {
                    $table->boolean('gpt4o_enabled')->default(false);
                }
            });
        }

        if (Schema::hasTable('tenant_usage_stats')) {
            Schema::table('tenant_usage_stats', function (Blueprint $table) {
                foreach (['ai_units_used', 'ai_units_4o_mini', 'ai_units_4o'] as $col) {
                    if (!Schema::hasColumn('tenant_usage_stats', $col)) {
                        $table->decimal($col, 12, 2)->default(0);
                    }
                }
                foreach (['rag_documents_processed', 'audio_minutes_used', 'image_analyses_used'] as $col) {
                    if (!Schema::hasColumn('tenant_usage_stats', $col)) {
                        $table->integer($col)->default(0);
                    }
                }
            });
        }

        if (Schema::hasTable('ai_usage_logs')) {
            Schema::table('ai_usage_logs', function (Blueprint $table) {
                if (!Schema::hasColumn('ai_usage_logs', 'ai_units')) {
                    $table->decimal('ai_units', 10, 2)->default(0);
                }
            });
        }
    }

    public function down(): void
    {
        // no-op — as colunas originais são gerenciadas pelas migrations 2024_12_12_10000*
    }
};
