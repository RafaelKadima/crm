<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Tabela para armazenar logs de chamadas à Meta Ads API.
     * Permite auditoria, debug e análise de erros.
     */
    public function up(): void
    {
        Schema::create('meta_ads_api_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('ad_account_id')->nullable()->constrained('ad_accounts')->nullOnDelete();
            $table->string('endpoint', 500);
            $table->string('method', 10); // GET, POST, PUT, DELETE
            $table->jsonb('request_payload')->nullable();
            $table->jsonb('response_body')->nullable();
            $table->integer('status_code');
            $table->integer('duration_ms')->nullable();
            $table->string('error_code')->nullable(); // Código de erro da Meta
            $table->text('error_message')->nullable();
            $table->string('request_id')->nullable(); // ID da requisição para debug
            $table->timestamps();

            // Índices
            $table->index(['tenant_id', 'created_at']);
            $table->index(['tenant_id', 'ad_account_id']);
            $table->index('status_code');
            
            // Índice parcial para erros (otimiza queries de monitoramento)
            $table->index(['tenant_id', 'status_code', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('meta_ads_api_logs');
    }
};
