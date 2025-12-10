<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Tabela para armazenar anexos de mensagens de tickets (chat).
     * Suporta upload direto para S3/R2 via presigned URLs.
     */
    public function up(): void
    {
        Schema::create('ticket_message_attachments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('ticket_id');
            $table->uuid('ticket_message_id')->nullable(); // Associado após envio da mensagem
            
            // Informações do arquivo
            $table->string('file_name'); // Nome original do arquivo
            $table->string('file_path'); // Caminho no storage: {tenant_id}/tickets/{ticket_id}/{uuid}.{ext}
            $table->string('file_type'); // image, video, audio, document
            $table->bigInteger('file_size'); // Tamanho em bytes
            $table->string('mime_type'); // MIME type completo
            
            // Storage
            $table->string('storage_disk')->default('media'); // Disk configurado no filesystems.php
            
            // Status do upload
            $table->string('status')->default('pending'); // pending, uploaded, confirmed, failed
            $table->timestamp('presigned_expires_at')->nullable(); // Expiração do presigned URL
            
            // Metadata adicional
            $table->json('metadata')->nullable(); // Dados extras (dimensões, duração, etc)
            
            $table->timestamps();

            // Foreign keys
            $table->foreign('tenant_id')
                ->references('id')
                ->on('tenants')
                ->onDelete('cascade');

            $table->foreign('ticket_id')
                ->references('id')
                ->on('tickets')
                ->onDelete('cascade');

            $table->foreign('ticket_message_id')
                ->references('id')
                ->on('ticket_messages')
                ->onDelete('set null');

            // Indexes
            $table->index(['ticket_id', 'status']);
            $table->index(['tenant_id', 'created_at']);
            $table->index('ticket_message_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ticket_message_attachments');
    }
};

