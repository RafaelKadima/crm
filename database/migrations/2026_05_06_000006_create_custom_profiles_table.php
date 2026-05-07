<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Custom Profiles — RBAC v2 granular por tenant.
 *
 * Cada tenant pode ter N profiles (ex: "Atendente Sênior", "SDR",
 * "Supervisor Marketing"), cada um com seu próprio mapa de 35
 * permission keys (ver App\Support\CustomPermissions).
 *
 * `custom_permissions` — JSON {key: bool} controla feature gating
 * `menu_permissions`   — JSON {menu_id: bool} controla visibilidade
 *                        de items de menu (mais granular que feature
 *                        gating; permite esconder UI sem bloquear API)
 *
 * Users referenciam um profile via custom_profile_id; flag
 * custom_profile_enabled controla se aplica o profile (vs. fallback
 * pra RoleEnum legado). Migração gradual: profile default = false.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('custom_profiles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('name', 100);
            $table->string('description', 500)->nullable();
            $table->jsonb('custom_permissions')->nullable();
            $table->jsonb('menu_permissions')->nullable();
            $table->boolean('is_default')->default(false);
            $table->timestamps();
            $table->softDeletes();

            // Mesmo nome de profile não duplica dentro do tenant
            $table->unique(['tenant_id', 'name', 'deleted_at'], 'custom_profiles_tenant_name_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('custom_profiles');
    }
};
