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
        Schema::create('lead_imports', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('user_id'); // Usuário que fez a importação
            $table->uuid('pipeline_id'); // Pipeline de destino
            $table->uuid('stage_id')->nullable(); // Estágio inicial (primeiro do pipeline)
            
            $table->string('filename'); // Nome do arquivo original
            $table->string('status')->default('pending'); // pending, processing, completed, failed
            
            $table->integer('total_rows')->default(0);
            $table->integer('processed_rows')->default(0);
            $table->integer('success_count')->default(0);
            $table->integer('error_count')->default(0);
            
            $table->json('errors')->nullable(); // Erros encontrados durante importação
            $table->json('settings')->nullable(); // Configurações extras (distribuição, etc.)
            
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('pipeline_id')->references('id')->on('pipelines')->onDelete('cascade');
            $table->foreign('stage_id')->references('id')->on('pipeline_stages')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lead_imports');
    }
};

