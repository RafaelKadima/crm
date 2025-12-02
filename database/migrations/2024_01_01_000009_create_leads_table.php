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
        Schema::create('leads', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('contact_id');
            $table->uuid('pipeline_id');
            $table->uuid('stage_id');
            $table->uuid('channel_id');
            $table->uuid('owner_id')->nullable(); // vendedor responsável
            $table->string('status')->default('open'); // open, won, lost, disqualified
            $table->decimal('value', 12, 2)->nullable();
            $table->date('expected_close_date')->nullable();
            $table->string('ia_mode_at_creation')->default('none'); // none, ia_sdr, enterprise
            $table->timestamp('last_message_at')->nullable();
            $table->string('last_interaction_source')->nullable(); // human, ia
            $table->timestamps();

            $table->foreign('tenant_id')
                ->references('id')
                ->on('tenants')
                ->onDelete('cascade');

            $table->foreign('contact_id')
                ->references('id')
                ->on('contacts')
                ->onDelete('cascade');

            $table->foreign('pipeline_id')
                ->references('id')
                ->on('pipelines')
                ->onDelete('cascade');

            $table->foreign('stage_id')
                ->references('id')
                ->on('pipeline_stages')
                ->onDelete('cascade');

            $table->foreign('channel_id')
                ->references('id')
                ->on('channels')
                ->onDelete('cascade');

            $table->foreign('owner_id')
                ->references('id')
                ->on('users')
                ->onDelete('set null');

            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'owner_id']);
            $table->index(['tenant_id', 'stage_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('leads');
    }
};


