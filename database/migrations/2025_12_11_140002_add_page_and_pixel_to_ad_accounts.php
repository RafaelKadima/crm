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
        Schema::table('ad_accounts', function (Blueprint $table) {
            if (!Schema::hasColumn('ad_accounts', 'page_id')) {
                $table->string('page_id')->nullable()->after('platform_account_name');
            }
            if (!Schema::hasColumn('ad_accounts', 'page_name')) {
                $table->string('page_name')->nullable()->after('page_id');
            }
            if (!Schema::hasColumn('ad_accounts', 'instagram_actor_id')) {
                $table->string('instagram_actor_id')->nullable()->after('page_name');
            }
            if (!Schema::hasColumn('ad_accounts', 'pixel_id')) {
                $table->string('pixel_id')->nullable()->after('instagram_actor_id');
            }
            if (!Schema::hasColumn('ad_accounts', 'pixel_name')) {
                $table->string('pixel_name')->nullable()->after('pixel_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ad_accounts', function (Blueprint $table) {
            $table->dropColumn(['page_id', 'page_name', 'instagram_actor_id', 'pixel_id', 'pixel_name']);
        });
    }
};

