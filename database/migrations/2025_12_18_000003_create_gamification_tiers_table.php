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
        Schema::create('gamification_tiers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->string('name'); // Bronze, Prata, Ouro, Diamante (configurável)
            $table->string('icon'); // emoji ou URL do ícone
            $table->string('color'); // Cor hex
            $table->integer('min_points');
            $table->integer('max_points')->nullable(); // null para último nível
            $table->integer('order');
            $table->timestamps();

            $table->foreign('tenant_id')
                ->references('id')
                ->on('tenants')
                ->onDelete('cascade');

            $table->index(['tenant_id', 'order']);
            $table->index(['tenant_id', 'min_points']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('gamification_tiers');
    }
};
