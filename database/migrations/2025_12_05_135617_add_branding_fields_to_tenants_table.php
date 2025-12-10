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
        Schema::table('tenants', function (Blueprint $table) {
            // Branding - Logo
            $table->string('logo_url')->nullable()->after('settings');
            $table->string('logo_dark_url')->nullable()->after('logo_url'); // Logo para tema escuro
            $table->string('favicon_url')->nullable()->after('logo_dark_url');
            
            // Branding - Cores
            $table->json('branding')->nullable()->after('favicon_url');
            // Estrutura do JSON branding:
            // {
            //   "primary_color": "#3B82F6",
            //   "secondary_color": "#8B5CF6", 
            //   "accent_color": "#10B981",
            //   "sidebar_color": "#1F2937",
            //   "sidebar_text_color": "#F9FAFB",
            //   "header_color": "#111827",
            //   "header_text_color": "#F9FAFB",
            //   "button_radius": "8",
            //   "font_family": "DM Sans"
            // }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn(['logo_url', 'logo_dark_url', 'favicon_url', 'branding']);
        });
    }
};
