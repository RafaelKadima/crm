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
        Schema::create('activity_kpi_mappings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('stage_activity_template_id')
                  ->constrained()->cascadeOnDelete();
            $table->foreignUuid('kpi_id')->constrained()->cascadeOnDelete();
            $table->decimal('contribution_value', 10, 4)->default(1); // Quanto contribui
            $table->enum('contribution_type', ['fixed', 'percentage', 'multiplier'])->default('fixed');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['stage_activity_template_id', 'kpi_id'], 'activity_kpi_mapping_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activity_kpi_mappings');
    }
};
