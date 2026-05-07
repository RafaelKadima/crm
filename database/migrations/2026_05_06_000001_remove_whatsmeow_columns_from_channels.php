<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('channels', function (Blueprint $table) {
            $table->dropIndex(['type', 'provider_type']);
            $table->dropColumn(['provider_type', 'internal_session_id']);
        });
    }

    public function down(): void
    {
        Schema::table('channels', function (Blueprint $table) {
            $table->string('provider_type', 20)->default('meta')->after('type');
            $table->string('internal_session_id')->nullable()->after('provider_type');
            $table->index(['type', 'provider_type']);
        });
    }
};
