<?php

/**
 * Script para desabilitar modo autônomo nos tenants.
 * Execute: php scripts/disable_autonomous_mode.php
 */

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Tenant;

echo "=== DESABILITANDO MODO AUTÔNOMO ===\n\n";

$tenants = Tenant::all();

foreach ($tenants as $tenant) {
    echo "Tenant: {$tenant->name} (ID: {$tenant->id})\n";

    $settings = $tenant->fix_agent_settings ?? [];
    $settings['enabled'] = false;
    $settings['autonomous_mode'] = false;

    $tenant->update(['fix_agent_settings' => $settings]);

    echo "  ✓ Modo autônomo desabilitado\n\n";
}

echo "=== CONCLUÍDO ===\n";
echo "Agentes de suporte autônomos desabilitados.\n";
echo "Agentes SDR continuam funcionando normalmente.\n";
