<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Liga User a um CustomProfile (RBAC v2). Default = profile null +
 * custom_profile_enabled = false → comportamento legado (RoleEnum)
 * é preservado pra todos os users existentes.
 *
 * Pra migrar um user pra RBAC v2: setar `custom_profile_id` e flipar
 * `custom_profile_enabled` pra true.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->uuid('custom_profile_id')->nullable()->after('role');
            $table->boolean('custom_profile_enabled')->default(false)->after('custom_profile_id');

            $table->index('custom_profile_id');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['custom_profile_id']);
            $table->dropColumn(['custom_profile_id', 'custom_profile_enabled']);
        });
    }
};
