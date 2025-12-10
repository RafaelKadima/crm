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
        // Landing Pages
        Schema::create('landing_pages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('name'); // Nome interno
            $table->string('slug')->unique(); // URL única: /lp/{slug}
            $table->string('title'); // Título da página
            $table->text('description')->nullable(); // Descrição/subtítulo
            
            // Configurações visuais
            $table->string('logo')->nullable();
            $table->string('background_image')->nullable();
            $table->string('primary_color')->default('#3B82F6');
            $table->string('secondary_color')->default('#1E40AF');
            $table->string('text_color')->default('#FFFFFF');
            $table->string('theme')->default('modern'); // modern, minimal, bold, elegant
            
            // Conteúdo
            $table->string('hero_title')->nullable();
            $table->text('hero_subtitle')->nullable();
            $table->string('cta_text')->default('Tenho interesse');
            $table->string('cta_button_color')->default('#22C55E');
            
            // Seções opcionais
            $table->boolean('show_products')->default(true);
            $table->boolean('show_testimonials')->default(false);
            $table->boolean('show_faq')->default(false);
            $table->boolean('show_contact_info')->default(true);
            $table->jsonb('testimonials')->nullable();
            $table->jsonb('faq')->nullable();
            $table->jsonb('contact_info')->nullable();
            
            // Formulário de captura
            $table->jsonb('form_fields')->nullable(); // Campos personalizados do formulário
            $table->string('success_message')->default('Obrigado! Em breve entraremos em contato.');
            $table->string('redirect_url')->nullable(); // URL de redirecionamento após envio
            
            // SEO
            $table->string('meta_title')->nullable();
            $table->text('meta_description')->nullable();
            $table->string('og_image')->nullable();
            
            // Integrações
            $table->string('facebook_pixel')->nullable();
            $table->string('google_analytics')->nullable();
            $table->string('gtm_id')->nullable();
            
            // Pipeline padrão para leads
            $table->foreignUuid('default_pipeline_id')->nullable()->constrained('pipelines')->nullOnDelete();
            $table->foreignUuid('default_stage_id')->nullable()->constrained('pipeline_stages')->nullOnDelete();
            $table->foreignUuid('default_channel_id')->nullable()->constrained('channels')->nullOnDelete();
            
            // Status
            $table->boolean('is_active')->default(true);
            $table->timestamp('published_at')->nullable();
            $table->integer('views_count')->default(0);
            $table->integer('leads_count')->default(0);
            
            $table->timestamps();
            
            $table->index(['tenant_id', 'is_active']);
        });

        // Relação Landing Page -> Produtos
        Schema::create('landing_page_products', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('landing_page_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('product_id')->constrained()->cascadeOnDelete();
            $table->integer('order')->default(0);
            $table->boolean('is_featured')->default(false); // Destaque
            $table->timestamps();

            $table->unique(['landing_page_id', 'product_id']);
        });

        // Estatísticas de Landing Pages
        Schema::create('landing_page_stats', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('landing_page_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->integer('views')->default(0);
            $table->integer('unique_views')->default(0);
            $table->integer('leads')->default(0);
            $table->decimal('conversion_rate', 5, 2)->default(0);
            $table->timestamps();

            $table->unique(['landing_page_id', 'date']);
        });

        // Adicionar limite de LPs no plano do tenant
        Schema::table('tenants', function (Blueprint $table) {
            $table->integer('landing_pages_limit')->default(1)->after('plan');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn('landing_pages_limit');
        });
        Schema::dropIfExists('landing_page_stats');
        Schema::dropIfExists('landing_page_products');
        Schema::dropIfExists('landing_pages');
    }
};
