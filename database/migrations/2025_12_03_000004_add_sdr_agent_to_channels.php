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
        Schema::table('channels', function (Blueprint $table) {
            $table->foreignUuid('sdr_agent_id')
                ->nullable()
                ->after('ia_workflow_id')
                ->constrained('sdr_agents')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('channels', function (Blueprint $table) {
            $table->dropForeign(['sdr_agent_id']);
            $table->dropColumn('sdr_agent_id');
        });
    }
};

