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
        Schema::table('channels', function (Blueprint $table) {
            // Configurações do menu de filas
            $table->boolean('queue_menu_enabled')->default(false)->after('is_active');
            $table->text('queue_menu_header')->nullable()->after('queue_menu_enabled');
            $table->text('queue_menu_footer')->nullable()->after('queue_menu_header');
            $table->text('queue_menu_invalid_response')->nullable()->after('queue_menu_footer');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('channels', function (Blueprint $table) {
            $table->dropColumn([
                'queue_menu_enabled',
                'queue_menu_header',
                'queue_menu_footer',
                'queue_menu_invalid_response',
            ]);
        });
    }
};

