<?php

// Script para limpar logs de atribuição
require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

// Limpar logs
DB::table('lead_assignment_logs')->truncate();
echo "Logs de atribuição limpos!\n";

// Verificar
$count = DB::table('lead_assignment_logs')->count();
echo "Total de logs após limpeza: {$count}\n";

// Verificar leads
$leadsCount = DB::table('leads')->count();
echo "Total de leads: {$leadsCount}\n";

