<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('sdr_agents', function (Blueprint $table) {
            $table->enum('type', ['sdr', 'support'])->default('sdr')->after('name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sdr_agents', function (Blueprint $table) {
            $table->dropColumn('type');
        });
    }
};
