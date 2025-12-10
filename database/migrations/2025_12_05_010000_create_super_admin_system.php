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
        // Adiciona campo is_super_admin na tabela users
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_super_admin')->default(false)->after('is_active');
        });

        // Módulos/Features disponíveis para tenants
        Schema::create('tenant_features', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->string('feature_key'); // ex: 'sdr_ia', 'landing_pages', 'reports', etc.
            $table->boolean('is_enabled')->default(true);
            $table->json('config')->nullable(); // configurações específicas do módulo
            $table->timestamp('enabled_at')->nullable();
            $table->timestamp('disabled_at')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->unique(['tenant_id', 'feature_key']);
            $table->index('feature_key');
        });

        // Permissões granulares por role
        Schema::create('permissions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('key')->unique(); // ex: 'leads.view', 'leads.edit', 'users.manage'
            $table->string('name');
            $table->string('description')->nullable();
            $table->string('module'); // ex: 'leads', 'users', 'settings'
            $table->timestamps();
        });

        // Permissões por role (default do sistema)
        Schema::create('role_permissions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('role'); // admin, gestor, vendedor, marketing
            $table->uuid('permission_id');
            $table->timestamps();

            $table->foreign('permission_id')->references('id')->on('permissions')->onDelete('cascade');
            $table->unique(['role', 'permission_id']);
        });

        // Permissões customizadas por usuário (sobrescreve as do role)
        Schema::create('user_permissions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->uuid('permission_id');
            $table->boolean('granted')->default(true); // true = concedido, false = revogado
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('permission_id')->references('id')->on('permissions')->onDelete('cascade');
            $table->unique(['user_id', 'permission_id']);
        });

        // Log de ações do super admin
        Schema::create('super_admin_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id'); // super admin que fez a ação
            $table->string('action'); // ex: 'tenant.create', 'tenant.disable', 'user.create'
            $table->uuid('target_tenant_id')->nullable();
            $table->uuid('target_user_id')->nullable();
            $table->json('data')->nullable(); // dados da ação
            $table->string('ip_address')->nullable();
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->index(['action', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('super_admin_logs');
        Schema::dropIfExists('user_permissions');
        Schema::dropIfExists('role_permissions');
        Schema::dropIfExists('permissions');
        Schema::dropIfExists('tenant_features');
        
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('is_super_admin');
        });
    }
};

