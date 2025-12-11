<?php

// Script para limpar logs de atribuição e leads
require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

// Desabilitar foreign key checks temporariamente
DB::statement('SET session_replication_role = replica');

// Limpar leads e logs relacionados
DB::table('lead_queue_owners')->truncate();
DB::table('lead_assignment_logs')->truncate();
DB::table('leads')->truncate();

// Reabilitar foreign key checks
DB::statement('SET session_replication_role = DEFAULT');

echo "Dados limpos!\n";
echo "Total de leads: " . DB::table('leads')->count() . "\n";
echo "Total de logs: " . DB::table('lead_assignment_logs')->count() . "\n";

