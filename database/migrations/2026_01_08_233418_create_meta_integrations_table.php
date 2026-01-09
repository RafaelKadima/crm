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
        Schema::create('meta_integrations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->string('business_id')->nullable()->comment('Meta Business ID');
            $table->string('waba_id')->comment('WhatsApp Business Account ID');
            $table->string('phone_number_id')->comment('Phone Number ID from Meta');
            $table->string('display_phone_number')->nullable()->comment('Formatted phone number');
            $table->string('verified_name')->nullable()->comment('Verified business name on Meta');
            $table->text('access_token')->comment('Encrypted long-lived token');
            $table->timestamp('expires_at')->nullable()->comment('Token expiration date');
            $table->string('status')->default('active')->comment('active|expired|reauth_required');
            $table->json('scopes')->nullable()->comment('Granted OAuth scopes');
            $table->json('metadata')->nullable()->comment('Additional Meta data');
            $table->timestamps();

            $table->foreign('tenant_id')
                ->references('id')
                ->on('tenants')
                ->onDelete('cascade');

            $table->index('phone_number_id');
            $table->index(['tenant_id', 'status']);
            $table->unique(['tenant_id', 'phone_number_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('meta_integrations');
    }
};
