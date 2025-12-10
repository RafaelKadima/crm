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
        Schema::create('queue_user', function (Blueprint $table) {
            $table->uuid('queue_id');
            $table->uuid('user_id');
            $table->boolean('is_active')->default(true); // Se o usuário está ativo na fila
            $table->unsignedInteger('priority')->default(0); // Prioridade na distribuição (0 = normal)
            $table->timestamps();

            $table->primary(['queue_id', 'user_id']);
            
            $table->foreign('queue_id')->references('id')->on('queues')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');

            $table->index('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('queue_user');
    }
};

