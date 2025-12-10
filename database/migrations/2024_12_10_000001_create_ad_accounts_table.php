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
        Schema::create('ad_accounts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
            
            $table->string('name');
            $table->string('platform'); // meta, google
            $table->string('platform_account_id'); // ID na plataforma
            $table->string('platform_account_name')->nullable();
            
            $table->text('access_token')->nullable();
            $table->text('refresh_token')->nullable();
            $table->timestamp('token_expires_at')->nullable();
            
            $table->string('status')->default('active'); // active, paused, disconnected, error
            $table->string('currency')->default('BRL');
            $table->string('timezone')->default('America/Sao_Paulo');
            
            $table->json('metadata')->nullable(); // dados extras da plataforma
            $table->timestamp('last_sync_at')->nullable();
            $table->text('last_error')->nullable();
            
            $table->timestamps();
            
            $table->unique(['tenant_id', 'platform', 'platform_account_id']);
            $table->index(['tenant_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ad_accounts');
    }
};

