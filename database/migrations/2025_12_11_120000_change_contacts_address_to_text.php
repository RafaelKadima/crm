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
        // Específico de PostgreSQL — em SQLite a coluna já aceita texto sem cast explícito.
        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE contacts ALTER COLUMN address TYPE TEXT USING address::TEXT');
        }

        // Limpa valores 'null' como string (funciona em qualquer SGBD)
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
