<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * QuickReply com mídia anexa — atendente seleciona "boas-vindas" e
 * sai imagem + texto pelo mesmo shortcut. Padrão ZPRO FastReply.
 *
 * `media_url`     — URL pública (S3, Supabase Storage, etc) ou path
 *                   relativo no storage local
 * `media_type`    — image / video / audio / document — usado pra
 *                   decidir API call do WhatsApp (Cloud API tem
 *                   endpoints diferentes por tipo)
 * `media_filename`— nome original do arquivo (preservar pra documents
 *                   que aparecem como "contrato.pdf" no chat)
 * `media_mime`    — content-type (preserva pra Cloud API valid types)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quick_replies', function (Blueprint $table) {
            $table->string('media_url', 1024)->nullable()->after('content');
            $table->string('media_type', 16)->nullable()->after('media_url'); // image/video/audio/document
            $table->string('media_filename', 255)->nullable()->after('media_type');
            $table->string('media_mime', 100)->nullable()->after('media_filename');
        });
    }

    public function down(): void
    {
        Schema::table('quick_replies', function (Blueprint $table) {
            $table->dropColumn(['media_url', 'media_type', 'media_filename', 'media_mime']);
        });
    }
};
