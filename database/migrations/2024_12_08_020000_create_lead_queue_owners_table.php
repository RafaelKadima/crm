<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Carteirização por Fila: um lead pode ter donos diferentes em filas diferentes.
     * Ex: João → SAC (Ana) | Comercial (Carlos)
     */
    public function up(): void
    {
        Schema::create('lead_queue_owners', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('lead_id');
            $table->uuid('queue_id');
            $table->uuid('user_id'); // Dono do lead nesta fila
            $table->timestamp('assigned_at');
            $table->timestamps();

            // Foreign keys
            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('lead_id')->references('id')->on('leads')->onDelete('cascade');
            $table->foreign('queue_id')->references('id')->on('queues')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');

            // Um lead só pode ter um dono por fila
            $table->unique(['lead_id', 'queue_id'], 'lead_queue_unique');
            
            // Indexes para busca rápida
            $table->index(['tenant_id', 'lead_id']);
            $table->index(['queue_id', 'user_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lead_queue_owners');
    }
};

