<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('meta_integrations', function (Blueprint $table) {
            $table->string('phone_number_id')->nullable()->change();
            $table->string('display_phone_number')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('meta_integrations', function (Blueprint $table) {
            $table->string('phone_number_id')->nullable(false)->change();
            $table->string('display_phone_number')->nullable(false)->change();
        });
    }
};
