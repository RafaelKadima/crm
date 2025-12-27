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
        Schema::table('agent_fix_requests', function (Blueprint $table) {
            $table->string('backup_tag')->nullable()->after('execution_result');
            $table->timestamp('rolled_back_at')->nullable()->after('backup_tag');
            $table->text('rollback_reason')->nullable()->after('rolled_back_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('agent_fix_requests', function (Blueprint $table) {
            $table->dropColumn(['backup_tag', 'rolled_back_at', 'rollback_reason']);
        });
    }
};
