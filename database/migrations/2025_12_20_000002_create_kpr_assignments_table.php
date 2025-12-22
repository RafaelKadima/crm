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
        Schema::create('kpr_assignments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('kpr_id')->constrained()->cascadeOnDelete();
            $table->uuidMorphs('assignable'); // assignable_type, assignable_id (Team ou User)
            $table->uuid('parent_assignment_id')->nullable();
            $table->decimal('target_value', 15, 2);
            $table->decimal('weight', 5, 2)->default(100); // % da meta do pai
            $table->decimal('current_value', 15, 2)->default(0);
            $table->decimal('progress_percentage', 5, 2)->default(0);
            $table->json('metadata')->nullable(); // Dados adicionais
            $table->timestamps();

            $table->index(['kpr_id', 'assignable_type', 'assignable_id']);
            $table->unique(['kpr_id', 'assignable_type', 'assignable_id'], 'kpr_assignment_unique');
        });

        // Add self-referential foreign key after table creation
        Schema::table('kpr_assignments', function (Blueprint $table) {
            $table->foreign('parent_assignment_id')
                  ->references('id')
                  ->on('kpr_assignments')
                  ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('kpr_assignments', function (Blueprint $table) {
            $table->dropForeign(['parent_assignment_id']);
        });
        Schema::dropIfExists('kpr_assignments');
    }
};
