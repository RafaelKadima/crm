<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Tabela para armazenar templates do WhatsApp Business API.
     * Permite gerenciar templates sem precisar acessar o Meta Business.
     */
    public function up(): void
    {
        Schema::create('whatsapp_templates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('channel_id'); // Canal do WhatsApp associado
            
            // Dados do template
            $table->string('name'); // Nome único do template (snake_case)
            $table->string('category'); // MARKETING, AUTHENTICATION, UTILITY
            $table->string('language')->default('pt_BR');
            
            // Componentes do template
            $table->string('header_type')->nullable(); // TEXT, IMAGE, VIDEO, DOCUMENT, NONE
            $table->text('header_text')->nullable(); // Texto do header (se header_type = TEXT)
            $table->string('header_handle')->nullable(); // Handle do media (se header_type != TEXT)
            $table->text('body_text'); // Corpo da mensagem com {{placeholders}}
            $table->text('footer_text')->nullable(); // Rodapé
            $table->json('buttons')->nullable(); // Array de botões
            
            // Status e controle do Meta
            $table->string('meta_template_id')->nullable(); // ID retornado pelo Meta
            $table->string('status')->default('PENDING'); // PENDING, APPROVED, REJECTED, PAUSED, DISABLED
            $table->text('rejection_reason')->nullable(); // Motivo da rejeição (se houver)
            
            // Histórico da requisição
            $table->json('request_payload')->nullable(); // JSON enviado ao Meta
            $table->json('response_payload')->nullable(); // Resposta do Meta
            
            // Metadados
            $table->boolean('is_active')->default(true);
            $table->timestamp('submitted_at')->nullable(); // Data de envio ao Meta
            $table->timestamp('approved_at')->nullable(); // Data de aprovação
            $table->timestamps();
            $table->softDeletes();

            // Foreign keys
            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('channel_id')->references('id')->on('channels')->onDelete('cascade');

            // Indexes
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'channel_id']);
            $table->index(['tenant_id', 'category']);
            $table->unique(['channel_id', 'name', 'language']); // Único por canal/nome/idioma
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('whatsapp_templates');
    }
};

