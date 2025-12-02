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
        Schema::create('tasks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('lead_id')->nullable();
            $table->uuid('contact_id')->nullable();
            $table->uuid('assigned_user_id');
            $table->string('type')->default('other'); // call, whatsapp, meeting, follow_up, other
            $table->string('title');
            $table->text('description')->nullable();
            $table->timestamp('due_at');
            $table->string('status')->default('pending'); // pending, done, canceled
            $table->timestamps();

            $table->foreign('tenant_id')
                ->references('id')
                ->on('tenants')
                ->onDelete('cascade');

            $table->foreign('lead_id')
                ->references('id')
                ->on('leads')
                ->onDelete('cascade');

            $table->foreign('contact_id')
                ->references('id')
                ->on('contacts')
                ->onDelete('cascade');

            $table->foreign('assigned_user_id')
                ->references('id')
                ->on('users')
                ->onDelete('cascade');

            $table->index(['tenant_id', 'assigned_user_id', 'status']);
            $table->index(['tenant_id', 'due_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};


