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
        Schema::create('sales', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('lead_id')->unique(); // Uma venda por lead
            $table->uuid('closed_by'); // Usuário que fechou a venda
            $table->timestamp('closed_at');

            // Valores
            $table->decimal('subtotal_products', 15, 2)->default(0); // Soma dos produtos
            $table->decimal('additional_value', 15, 2)->default(0); // Serviços, extras
            $table->string('additional_description')->nullable(); // Descrição do adicional
            $table->decimal('discount_value', 15, 2)->default(0); // Desconto em valor
            $table->decimal('discount_percentage', 5, 2)->nullable(); // Desconto em %
            $table->decimal('total_value', 15, 2); // Valor final

            // Pagamento
            $table->string('payment_method')->nullable();
            $table->integer('installments')->default(1);

            // Extras
            $table->text('notes')->nullable();
            $table->json('metadata')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // Foreign keys
            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('lead_id')->references('id')->on('leads')->onDelete('cascade');
            $table->foreign('closed_by')->references('id')->on('users')->onDelete('restrict');

            // Index
            $table->index(['tenant_id', 'closed_at']);
            $table->index(['closed_by', 'closed_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sales');
    }
};
