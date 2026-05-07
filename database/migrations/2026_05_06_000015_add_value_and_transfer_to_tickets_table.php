<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tickets ganham valor monetário (DECIMAL) e tracking de transferência.
 *
 * `value` — valor do "deal" associado ao ticket (separado de Lead.value
 *           que já existe — Lead é a oportunidade, Ticket é o atendimento;
 *           pode ter múltiplos tickets pra um lead com valores diferentes)
 *
 * `transferred_from_user_id`, `transferred_at`, `transfer_reason` — quem
 * transferiu pra quem, quando, por quê. Atribuição atual continua em
 * `assigned_user_id` (já existente).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->decimal('value', 15, 2)->nullable()->after('queue_entered_at');
            $table->uuid('transferred_from_user_id')->nullable()->after('value');
            $table->timestamp('transferred_at')->nullable()->after('transferred_from_user_id');
            $table->string('transfer_reason', 255)->nullable()->after('transferred_at');
        });
    }

    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropColumn([
                'value',
                'transferred_from_user_id',
                'transferred_at',
                'transfer_reason',
            ]);
        });
    }
};
