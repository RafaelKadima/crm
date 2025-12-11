<?php

// Script para limpar logs de atribuição e leads
require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

// Desabilitar foreign key checks temporariamente
DB::statement('SET session_replication_role = replica');

// Limpar TUDO para teste limpo
DB::table('ticket_messages')->truncate();
DB::table('tickets')->truncate();
DB::table('lead_queue_owners')->truncate();
DB::table('lead_assignment_logs')->truncate();
DB::table('leads')->truncate();

// Limpar contatos de teste (manter apenas os de demonstração)
DB::table('contacts')
    ->whereNotIn('phone', ['5511911111111', '5511922222222', '5511933333333', '5511944444444', '5511955555555', '5511966666666', '5511977777777', '5511988888888', '5511999998888', '5521988887777', '5531977776666'])
    ->delete();

// Reabilitar foreign key checks
DB::statement('SET session_replication_role = DEFAULT');

echo "Dados limpos!\n";
echo "Total de leads: " . DB::table('leads')->count() . "\n";
echo "Total de logs: " . DB::table('lead_assignment_logs')->count() . "\n";

