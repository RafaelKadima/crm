<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Sistema de tags polimórfico — qualquer model pode ser "taggable".
 * Por ora: Tickets e Leads. Tags são por tenant (não compartilhadas
 * entre tenants).
 *
 * `tags`            — id, tenant_id, name, slug, color
 * `taggables`       — tag_id, taggable_type, taggable_id
 *                     (composite PK pra dedup)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tags', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('name', 64);
            $table->string('slug', 80);
            $table->string('color', 7)->default('#6b7280'); // hex; default = neutral gray
            $table->timestamps();

            // Mesma slug não duplica dentro do tenant
            $table->unique(['tenant_id', 'slug'], 'tags_tenant_slug_unique');
        });

        Schema::create('taggables', function (Blueprint $table) {
            $table->uuid('tag_id');
            $table->string('taggable_type', 100);
            $table->uuid('taggable_id');
            $table->timestamp('created_at')->useCurrent();

            $table->primary(['tag_id', 'taggable_type', 'taggable_id'], 'taggables_pk');
            $table->index(['taggable_type', 'taggable_id'], 'taggables_lookup_idx');
            $table->foreign('tag_id')->references('id')->on('tags')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('taggables');
        Schema::dropIfExists('tags');
    }
};
