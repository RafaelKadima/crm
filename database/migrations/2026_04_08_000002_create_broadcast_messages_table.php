<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('broadcast_messages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('broadcast_id');
            $table->uuid('contact_id');

            $table->string('phone');
            $table->string('status')->default('PENDING');
            $table->string('whatsapp_message_id')->nullable();
            $table->unsignedInteger('error_code')->nullable();
            $table->string('error_message', 500)->nullable();

            $table->timestamp('sent_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->foreign('broadcast_id')->references('id')->on('broadcasts')->cascadeOnDelete();
            $table->foreign('contact_id')->references('id')->on('contacts')->cascadeOnDelete();

            $table->index(['broadcast_id', 'status']);
            $table->index('whatsapp_message_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('broadcast_messages');
    }
};
