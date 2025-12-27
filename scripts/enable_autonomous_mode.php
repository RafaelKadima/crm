<?php

/**
 * Script para habilitar modo autônomo no tenant.
 * Execute: php scripts/enable_autonomous_mode.php
 */

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Tenant;
use App\Models\SdrAgent;

// Busca o Zion para pegar o tenant
$zion = SdrAgent::where('type', 'support')
    ->where('name', 'like', '%Zion%')
    ->first();

if (!$zion) {
    $zion = SdrAgent::where('type', 'support')->first();
}

if (!$zion) {
    echo "Nenhum agente de suporte encontrado!\n";
    exit(1);
}

$tenant = $zion->tenant;

if (!$tenant) {
    echo "Tenant não encontrado!\n";
    exit(1);
}

echo "Tenant: {$tenant->name} (ID: {$tenant->id})\n";

// Configurações atuais
$currentSettings = $tenant->fix_agent_settings ?? [];
echo "\nConfigurações atuais:\n";
print_r($currentSettings);

// Novas configurações com modo autônomo
$newSettings = array_merge($currentSettings, [
    'enabled' => true,
    'autonomous_mode' => true,
    'approver_phones' => $currentSettings['approver_phones'] ?? [],
    'max_retries' => 3,
    'health_check_url' => 'https://hub.culturabuilder.com',
    'rollback_on_error' => true,
]);

$tenant->update([
    'fix_agent_settings' => $newSettings,
]);

echo "\nNovas configurações aplicadas:\n";
print_r($newSettings);

echo "\nModo autônomo habilitado com sucesso!\n";
