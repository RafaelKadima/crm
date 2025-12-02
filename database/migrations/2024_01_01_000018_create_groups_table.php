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
        // Tabela de Grupos (holding/franquia)
        Schema::create('groups', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('logo')->nullable();
            $table->json('settings')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Pivot: Grupo -> Tenants (lojas do grupo)
        Schema::create('group_tenant', function (Blueprint $table) {
            $table->uuid('group_id');
            $table->uuid('tenant_id');
            $table->foreign('group_id')->references('id')->on('groups')->onDelete('cascade');
            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->primary(['group_id', 'tenant_id']);
            $table->timestamps();
        });

        // Pivot: Grupo -> Users (usuários com acesso ao grupo)
        Schema::create('group_user', function (Blueprint $table) {
            $table->uuid('group_id');
            $table->uuid('user_id');
            $table->foreign('group_id')->references('id')->on('groups')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->string('role')->default('viewer'); // owner, admin, viewer
            $table->primary(['group_id', 'user_id']);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('group_user');
        Schema::dropIfExists('group_tenant');
        Schema::dropIfExists('groups');
    }
};

