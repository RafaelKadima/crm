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
        Schema::table('queues', function (Blueprint $table) {
            $table->uuid('sdr_agent_id')->nullable()->after('pipeline_id');
            
            $table->foreign('sdr_agent_id')->references('id')->on('sdr_agents')->onDelete('set null');
            $table->index('sdr_agent_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('queues', function (Blueprint $table) {
            $table->dropForeign(['sdr_agent_id']);
            $table->dropIndex(['sdr_agent_id']);
            $table->dropColumn('sdr_agent_id');
        });
    }
};

