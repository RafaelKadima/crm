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
        // Categorias de produtos
        Schema::create('product_categories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('slug');
            $table->text('description')->nullable();
            $table->string('image')->nullable();
            $table->integer('order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['tenant_id', 'slug']);
        });

        // Produtos
        Schema::create('products', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('category_id')->nullable()->constrained('product_categories')->nullOnDelete();
            $table->string('name');
            $table->string('slug');
            $table->string('sku')->nullable(); // Código do produto
            $table->text('description')->nullable();
            $table->text('short_description')->nullable();
            $table->jsonb('specifications')->nullable(); // Especificações técnicas
            $table->decimal('price', 12, 2);
            $table->decimal('promotional_price', 12, 2)->nullable();
            $table->decimal('cost_price', 12, 2)->nullable(); // Preço de custo (interno)
            $table->integer('stock')->default(0);
            $table->boolean('track_stock')->default(false);
            $table->boolean('is_active')->default(true);
            $table->boolean('show_on_landing_page')->default(true);
            $table->integer('order')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'slug']);
            $table->index(['tenant_id', 'is_active']);
        });

        // Imagens dos produtos
        Schema::create('product_images', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('product_id')->constrained()->cascadeOnDelete();
            $table->string('path'); // Caminho do arquivo
            $table->string('url'); // URL pública
            $table->string('alt')->nullable(); // Texto alternativo
            $table->integer('order')->default(0);
            $table->boolean('is_primary')->default(false);
            $table->timestamps();

            $table->index(['product_id', 'is_primary']);
        });

        // Relação Lead -> Produto (produto de interesse)
        Schema::create('lead_products', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('lead_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('product_id')->constrained()->cascadeOnDelete();
            $table->integer('quantity')->default(1);
            $table->decimal('unit_price', 12, 2)->nullable(); // Preço no momento do interesse
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['lead_id', 'product_id']);
        });

        // Dados do cliente (preenchido no fechamento)
        Schema::create('customer_data', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('lead_id')->constrained()->cascadeOnDelete();
            $table->string('cpf')->nullable();
            $table->string('cnpj')->nullable();
            $table->string('rg')->nullable();
            $table->date('birth_date')->nullable();
            
            // Endereço
            $table->string('address')->nullable();
            $table->string('address_number')->nullable();
            $table->string('address_complement')->nullable();
            $table->string('neighborhood')->nullable();
            $table->string('city')->nullable();
            $table->string('state', 2)->nullable();
            $table->string('zip_code', 10)->nullable();
            
            // Pagamento
            $table->string('payment_method')->nullable();
            $table->integer('installments')->nullable();
            
            // Observações
            $table->text('notes')->nullable();
            $table->jsonb('extra_data')->nullable();
            
            $table->timestamps();

            $table->unique('lead_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('customer_data');
        Schema::dropIfExists('lead_products');
        Schema::dropIfExists('product_images');
        Schema::dropIfExists('products');
        Schema::dropIfExists('product_categories');
    }
};
