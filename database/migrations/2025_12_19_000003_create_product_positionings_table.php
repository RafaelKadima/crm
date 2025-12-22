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
        Schema::create('product_positionings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->string('name', 255);

            // Transformation: before_state, after_state, journey_description
            $table->jsonb('transformation')->default('{}');

            // Mechanism: how_it_works, unique_method, differentiator
            $table->jsonb('mechanism')->default('{}');

            // Promises: main_promise, secondary_promises[], proof_points[]
            $table->jsonb('promises')->default('{}');

            // Objection Handling: array of {objection, response, proof}
            $table->jsonb('objection_handling')->default('[]');

            $table->timestamps();

            $table->foreign('tenant_id')
                ->references('id')
                ->on('tenants')
                ->onDelete('cascade');

            $table->index('tenant_id');
            $table->index(['tenant_id', 'name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('product_positionings');
    }
};
