<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Tabela para armazenar modelos de Machine Learning por tenant.
     * Suporta versionamento e métricas de performance.
     */
    public function up(): void
    {
        Schema::create('ml_models', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->nullable()->constrained()->cascadeOnDelete(); // null = modelo global
            $table->string('model_type', 50); // 'lead_score', 'campaign_predictor', etc.
            $table->integer('version')->default(1);
            $table->string('weights_path', 500)->nullable(); // Caminho do arquivo de pesos
            $table->jsonb('metrics')->nullable(); // accuracy, f1, loss, etc.
            $table->jsonb('hyperparameters')->nullable(); // Configurações de treino
            $table->integer('training_samples')->default(0); // Quantidade de amostras usadas
            $table->string('status', 20)->default('training'); // training, ready, deprecated
            $table->boolean('is_active')->default(false); // Modelo ativo para uso
            $table->boolean('is_global')->default(false); // Modelo global (sem tenant)
            $table->timestamp('trained_at')->nullable();
            $table->timestamps();

            // Índices
            $table->index(['tenant_id', 'model_type', 'is_active']);
            $table->index(['model_type', 'is_global', 'is_active']);
            $table->unique(['tenant_id', 'model_type', 'version']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ml_models');
    }
};
