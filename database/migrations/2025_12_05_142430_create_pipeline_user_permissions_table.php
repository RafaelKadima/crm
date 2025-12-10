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
        Schema::create('pipeline_user', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('pipeline_id')->constrained()->onDelete('cascade');
            $table->foreignUuid('user_id')->constrained()->onDelete('cascade');
            $table->foreignUuid('tenant_id')->constrained()->onDelete('cascade');
            
            // Permissões granulares
            $table->boolean('can_view')->default(true);
            $table->boolean('can_edit')->default(false);
            $table->boolean('can_delete')->default(false);
            $table->boolean('can_manage_leads')->default(true);
            
            $table->timestamps();
            
            // Índices
            $table->unique(['pipeline_id', 'user_id']);
            $table->index('tenant_id');
        });

        // Adicionar campo is_public ao pipeline (todos podem ver)
        if (!Schema::hasColumn('pipelines', 'is_public')) {
            Schema::table('pipelines', function (Blueprint $table) {
                $table->boolean('is_public')->default(false)->after('is_active');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pipeline_user');
        
        if (Schema::hasColumn('pipelines', 'is_public')) {
            Schema::table('pipelines', function (Blueprint $table) {
                $table->dropColumn(['is_public']);
            });
        }
    }
};
