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
        Schema::create('ad_creatives', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
            
            $table->string('name');
            $table->string('type'); // image, video, carousel, collection
            
            // Referência externa (não armazenamos o arquivo)
            $table->string('external_url')->nullable(); // Link do criativo (Drive, Dropbox, etc.)
            $table->string('thumbnail_url')->nullable();
            
            // Conteúdo do anúncio
            $table->text('headline')->nullable();
            $table->text('description')->nullable();
            $table->text('primary_text')->nullable();
            $table->string('call_to_action')->nullable(); // LEARN_MORE, SHOP_NOW, SIGN_UP
            $table->string('destination_url')->nullable();
            
            // Dimensões e formato
            $table->string('format')->nullable(); // 1:1, 9:16, 16:9, etc.
            $table->integer('width')->nullable();
            $table->integer('height')->nullable();
            $table->integer('duration_seconds')->nullable(); // para vídeos
            
            $table->json('metadata')->nullable();
            $table->boolean('is_active')->default(true);
            
            $table->timestamps();
            
            $table->index(['tenant_id', 'type']);
            $table->index(['tenant_id', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ad_creatives');
    }
};

