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
        Schema::table('lead_assignment_logs', function (Blueprint $table) {
            $table->uuid('queue_id')->nullable()->after('channel_id');
            
            $table->foreign('queue_id')->references('id')->on('queues')->onDelete('set null');
            $table->index('queue_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lead_assignment_logs', function (Blueprint $table) {
            $table->dropForeign(['queue_id']);
            $table->dropIndex(['queue_id']);
            $table->dropColumn('queue_id');
        });
    }
};

