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
            // Provider type: 'meta' for Meta Cloud API, 'internal' for Whatsmeow
            $table->string('provider_type', 20)->default('meta')->after('type');

            // Session ID for internal provider (links to whatsapp_sessions table in whatsapp-api)
            $table->string('internal_session_id')->nullable()->after('provider_type');

            // Index for efficient lookups
            $table->index(['type', 'provider_type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('channels', function (Blueprint $table) {
            $table->dropIndex(['type', 'provider_type']);
            $table->dropColumn(['provider_type', 'internal_session_id']);
        });
    }
};
