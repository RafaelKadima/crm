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
        Schema::create('kpis', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('key'); // conversion_rate, average_ticket, etc.
            $table->text('description')->nullable();
            $table->enum('formula_type', ['ratio', 'sum', 'average', 'count', 'custom'])->default('count');
            $table->enum('source', ['leads', 'activities', 'stages', 'custom'])->default('leads');
            $table->json('formula_config')->nullable(); // Configuração específica da fórmula
            $table->string('unit')->default('%'); // %, R$, dias, unidades
            $table->decimal('target_value', 15, 4)->nullable();
            $table->integer('weight')->default(100); // Peso no cálculo geral
            $table->boolean('is_active')->default(true);
            $table->boolean('is_system')->default(false); // KPIs do sistema (não editáveis)
            $table->integer('display_order')->default(0);
            $table->string('icon')->nullable(); // Ícone para exibição
            $table->string('color')->nullable(); // Cor para gráficos
            $table->timestamps();

            $table->unique(['tenant_id', 'key']);
            $table->index(['tenant_id', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('kpis');
    }
};
