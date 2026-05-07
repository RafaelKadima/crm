<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Audit log centralizado — toda mutação em models críticos é registrada
 * aqui com before/after, ator, IP e user-agent.
 *
 * Append-only por design: sem `updated_at`, sem `deleted_at`. Nunca editar
 * registros — só inserir. Compliance B2B exige trilha imutável.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->nullable()->index();

            // Quem fez (User, sistema/cron = null, super admin é flagado)
            $table->uuid('actor_id')->nullable();
            $table->string('actor_type', 50)->nullable();
            $table->string('actor_email', 255)->nullable();
            $table->boolean('actor_is_super_admin')->default(false);

            // O que aconteceu
            $table->string('action', 32);             // created/updated/deleted/restored/custom
            $table->string('model_type', 100);        // App\Models\User
            $table->uuid('model_id');

            // Estado
            $table->jsonb('before')->nullable();      // null em creates
            $table->jsonb('after')->nullable();       // null em deletes
            $table->jsonb('changes')->nullable();     // diff (campos que mudaram)

            // Contexto da request
            $table->string('ip', 45)->nullable();
            $table->string('user_agent', 500)->nullable();
            $table->string('request_id', 64)->nullable();
            $table->jsonb('metadata')->nullable();    // extras: route, http_method, etc

            // Apenas created_at (append-only — sem updated_at)
            $table->timestamp('created_at')->useCurrent();

            // Index pra busca por entidade afetada
            $table->index(['tenant_id', 'model_type', 'model_id', 'created_at'], 'audit_logs_lookup_idx');
            // Index pra audit "tudo que ator X fez"
            $table->index(['tenant_id', 'actor_id', 'created_at'], 'audit_logs_actor_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
