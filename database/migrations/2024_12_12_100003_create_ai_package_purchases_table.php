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
        Schema::create('ai_package_purchases', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('user_id')->nullable()->constrained()->nullOnDelete();
            
            // Tipo do pacote (ai_units, rag, audio, image)
            $table->string('package_type', 20);
            
            // ID do pacote (pack_10k, pack_30k, etc.)
            $table->string('package_id', 50);
            
            // Quantidade adquirida (Unidades, documentos, minutos, etc.)
            $table->integer('quantity');
            
            // Preço pago (BRL)
            $table->decimal('price_brl', 10, 2);
            
            // Status (pending, paid, cancelled)
            $table->string('status', 20)->default('pending');
            
            // Referência de pagamento externa (Stripe, etc.)
            $table->string('payment_reference')->nullable();
            
            // Data de expiração (para pacotes com validade)
            $table->date('expires_at')->nullable();
            
            // Quanto já foi consumido deste pacote
            $table->integer('consumed')->default(0);
            
            $table->timestamps();
            
            // Índices
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'package_type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ai_package_purchases');
    }
};

