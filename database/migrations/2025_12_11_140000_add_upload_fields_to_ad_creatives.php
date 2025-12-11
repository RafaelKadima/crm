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
        Schema::table('ad_creatives', function (Blueprint $table) {
            // Campos para upload local/S3
            if (!Schema::hasColumn('ad_creatives', 'file_path')) {
                $table->string('file_path')->nullable()->after('external_url');
            }
            if (!Schema::hasColumn('ad_creatives', 'file_url')) {
                $table->string('file_url')->nullable()->after('file_path');
            }
            if (!Schema::hasColumn('ad_creatives', 'file_size')) {
                $table->bigInteger('file_size')->nullable()->after('file_url');
            }
            if (!Schema::hasColumn('ad_creatives', 'mime_type')) {
                $table->string('mime_type')->nullable()->after('file_size');
            }
            
            // Campos para integração com Meta
            if (!Schema::hasColumn('ad_creatives', 'platform_media_id')) {
                $table->string('platform_media_id')->nullable()->after('metadata');
            }
            if (!Schema::hasColumn('ad_creatives', 'platform_hash')) {
                $table->string('platform_hash')->nullable()->after('platform_media_id');
            }
            
            // Status do criativo
            if (!Schema::hasColumn('ad_creatives', 'status')) {
                $table->string('status')->default('uploaded')->after('is_active');
            }
            
            // Relacionamento com ad_account
            if (!Schema::hasColumn('ad_creatives', 'ad_account_id')) {
                $table->foreignUuid('ad_account_id')->nullable()->after('tenant_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ad_creatives', function (Blueprint $table) {
            $columns = ['file_path', 'file_url', 'file_size', 'mime_type', 'platform_media_id', 'platform_hash', 'status', 'ad_account_id'];
            foreach ($columns as $column) {
                if (Schema::hasColumn('ad_creatives', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};

