<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Primeiro altera o tipo da coluna de json para text
        DB::statement('ALTER TABLE contacts ALTER COLUMN address TYPE TEXT USING address::TEXT');
        
        // Limpa valores 'null' como string
        DB::statement("UPDATE contacts SET address = NULL WHERE address = 'null' OR address = ''");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('ALTER TABLE contacts ALTER COLUMN address TYPE JSONB USING CASE WHEN address IS NULL THEN NULL ELSE to_jsonb(address) END');
    }
};
