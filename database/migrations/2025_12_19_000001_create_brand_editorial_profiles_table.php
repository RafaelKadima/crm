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
        Schema::create('brand_editorial_profiles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->string('name', 255);

            // Brand Voice: personality_traits[], tone_descriptors[], vocabulary_style
            $table->jsonb('brand_voice')->default('{}');

            // Brand Identity: mission, values[], unique_proposition
            $table->jsonb('brand_identity')->default('{}');

            // Beliefs and Enemies: core_beliefs[], industry_enemies[], contrarian_views[]
            $table->jsonb('beliefs_and_enemies')->default('{}');

            // Content Pillars: array of {name, description, example_topics[]}
            $table->jsonb('content_pillars')->default('[]');

            $table->timestamps();

            $table->foreign('tenant_id')
                ->references('id')
                ->on('tenants')
                ->onDelete('cascade');

            $table->index('tenant_id');
            $table->index(['tenant_id', 'name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('brand_editorial_profiles');
    }
};
