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
        Schema::create('audience_profiles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->string('name', 255);

            // Demographics: age_range, gender, location, income_level, education
            $table->jsonb('demographics')->default('{}');

            // Psychographics: pains[], desires[], fears[], dreams[]
            $table->jsonb('psychographics')->default('{}');

            // Objections: common_objections[], trust_barriers[]
            $table->jsonb('objections')->default('{}');

            // Language Patterns: slang_terms[], phrases_they_use[], tone_preference
            $table->jsonb('language_patterns')->default('{}');

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
        Schema::dropIfExists('audience_profiles');
    }
};
