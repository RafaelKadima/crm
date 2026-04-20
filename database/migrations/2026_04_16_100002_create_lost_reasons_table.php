<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Cada tenant define sua própria lista de motivos de perda.
     * Permite Pareto e análise causal de leads não fechados.
     */
    public function up(): void
    {
        Schema::create('lost_reasons', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->string('name', 120);
            $table->string('slug', 120);
            $table->string('color', 20)->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->foreign('tenant_id')
                ->references('id')
                ->on('tenants')
                ->onDelete('cascade');

            $table->unique(['tenant_id', 'slug']);
            $table->index(['tenant_id', 'is_active', 'sort_order'], 'idx_lost_reasons_tenant_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lost_reasons');
    }
};
