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
        Schema::create('ad_copies', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->foreignUuid('ad_creative_id')->nullable()->constrained('ad_creatives')->onDelete('set null');
            $table->string('name');
            $table->text('primary_text'); // Texto principal do anúncio
            $table->string('headline', 100); // Título
            $table->string('description', 100)->nullable(); // Descrição
            $table->string('call_to_action')->default('LEARN_MORE'); // CTA
            $table->string('link_url')->nullable(); // URL de destino
            $table->enum('status', ['draft', 'approved', 'used'])->default('draft');
            $table->enum('hook_type', ['benefit', 'curiosity', 'urgency', 'social_proof', 'question', 'authority'])->nullable();
            $table->integer('estimated_effectiveness')->nullable(); // 0-100
            $table->json('metadata')->nullable();
            $table->timestamps();
            
            $table->index(['tenant_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ad_copies');
    }
};

