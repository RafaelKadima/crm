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
        Schema::table('bi_agent_configs', function (Blueprint $table) {
            if (!Schema::hasColumn('bi_agent_configs', 'monitored_accounts')) {
                $table->json('monitored_accounts')->nullable()->after('thresholds')
                    ->comment('Lista de IDs de contas de anúncios para monitoramento automático');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bi_agent_configs', function (Blueprint $table) {
            if (Schema::hasColumn('bi_agent_configs', 'monitored_accounts')) {
                $table->dropColumn('monitored_accounts');
            }
        });
    }
};

