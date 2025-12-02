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
        Schema::create('external_integration_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('integration_id');
            $table->string('model_type');
            $table->uuid('model_id');
            $table->string('status'); // success, error
            $table->json('request_payload')->nullable();
            $table->json('response_payload')->nullable();
            $table->timestamp('executed_at');
            $table->timestamps();

            $table->foreign('tenant_id')
                ->references('id')
                ->on('tenants')
                ->onDelete('cascade');

            $table->foreign('integration_id')
                ->references('id')
                ->on('external_integrations')
                ->onDelete('cascade');

            $table->index(['integration_id', 'status']);
            $table->index(['model_type', 'model_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('external_integration_logs');
    }
};


