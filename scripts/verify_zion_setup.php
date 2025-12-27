<?php

/**
 * Script para verificar se o Zion está configurado corretamente.
 * Execute: php scripts/verify_zion_setup.php
 */

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\SdrAgent;
use App\Models\Tenant;
use App\Models\AgentFixRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

echo "=== VERIFICAÇÃO DO SETUP DO ZION ===\n\n";

$checks = [];

// 1. Verifica se o Zion existe
echo "1. Verificando agente Zion...\n";
$zion = SdrAgent::where('type', 'support')->first();
if ($zion) {
    echo "   ✓ Zion encontrado: {$zion->name}\n";
    echo "   ✓ ID: {$zion->id}\n";
    echo "   ✓ Tipo: {$zion->type}\n";
    $checks['agent'] = true;
} else {
    echo "   ✗ Zion NÃO encontrado!\n";
    $checks['agent'] = false;
}

// 2. Verifica o prompt
echo "\n2. Verificando prompt do Zion...\n";
if ($zion && $zion->system_prompt) {
    $promptLength = strlen($zion->system_prompt);
    echo "   ✓ Prompt configurado ({$promptLength} caracteres)\n";

    // Verifica keywords importantes
    $keywords = [
        'apply_fix_autonomous' => 'Correção autônoma',
        'get_error_logs' => 'Diagnóstico de logs',
        'search_codebase' => 'Busca no código',
        'read_file' => 'Leitura de arquivos',
        'backup' => 'Backup automático',
        'rollback' => 'Rollback automático',
    ];

    foreach ($keywords as $keyword => $desc) {
        if (str_contains($zion->system_prompt, $keyword)) {
            echo "   ✓ Contém '{$keyword}' ({$desc})\n";
        } else {
            echo "   ⚠ NÃO contém '{$keyword}' ({$desc})\n";
        }
    }
    $checks['prompt'] = true;
} else {
    echo "   ✗ Prompt NÃO configurado!\n";
    $checks['prompt'] = false;
}

// 3. Verifica configurações do tenant
echo "\n3. Verificando configurações do tenant...\n";
$tenant = $zion ? $zion->tenant : null;
if ($tenant) {
    echo "   ✓ Tenant: {$tenant->name}\n";

    $settings = $tenant->fix_agent_settings ?? [];

    echo "   → enabled: " . ($settings['enabled'] ?? false ? '✓ Sim' : '✗ Não') . "\n";
    echo "   → autonomous_mode: " . ($settings['autonomous_mode'] ?? false ? '✓ Sim' : '✗ Não') . "\n";
    echo "   → approver_phones: " . json_encode($settings['approver_phones'] ?? []) . "\n";
    echo "   → health_check_url: " . ($settings['health_check_url'] ?? 'não definido') . "\n";
    echo "   → rollback_on_error: " . ($settings['rollback_on_error'] ?? true ? '✓ Sim' : '✗ Não') . "\n";

    $checks['tenant'] = ($settings['enabled'] ?? false) && ($settings['autonomous_mode'] ?? false);
} else {
    echo "   ✗ Tenant NÃO encontrado!\n";
    $checks['tenant'] = false;
}

// 4. Verifica tabela agent_fix_requests
echo "\n4. Verificando tabela agent_fix_requests...\n";
try {
    $columns = DB::getSchemaBuilder()->getColumnListing('agent_fix_requests');
    $requiredColumns = ['backup_tag', 'rolled_back_at', 'rollback_reason'];

    $hasAll = true;
    foreach ($requiredColumns as $col) {
        if (in_array($col, $columns)) {
            echo "   ✓ Coluna '{$col}' existe\n";
        } else {
            echo "   ✗ Coluna '{$col}' NÃO existe!\n";
            $hasAll = false;
        }
    }
    $checks['database'] = $hasAll;
} catch (\Exception $e) {
    echo "   ✗ Erro ao verificar tabela: {$e->getMessage()}\n";
    $checks['database'] = false;
}

// 5. Verifica conexão com AI Service
echo "\n5. Verificando AI Service...\n";
$aiServiceUrl = config('services.ai_agent.url', 'http://localhost:8001');
try {
    $response = Http::timeout(5)->get("{$aiServiceUrl}/health");
    if ($response->successful()) {
        echo "   ✓ AI Service respondendo em {$aiServiceUrl}\n";
        $checks['ai_service'] = true;
    } else {
        echo "   ⚠ AI Service retornou status {$response->status()}\n";
        $checks['ai_service'] = false;
    }
} catch (\Exception $e) {
    echo "   ✗ AI Service não acessível: {$e->getMessage()}\n";
    $checks['ai_service'] = false;
}

// 6. Verifica estatísticas de fix requests
echo "\n6. Estatísticas de Fix Requests...\n";
try {
    $stats = [
        'total' => AgentFixRequest::count(),
        'pending' => AgentFixRequest::where('status', 'pending_approval')->count(),
        'auto_executing' => AgentFixRequest::where('status', 'auto_executing')->count(),
        'deployed' => AgentFixRequest::where('status', 'deployed')->count(),
        'rolled_back' => AgentFixRequest::where('status', 'rolled_back')->count(),
        'confirmed_fixed' => AgentFixRequest::where('status', 'confirmed_fixed')->count(),
    ];

    foreach ($stats as $status => $count) {
        echo "   → {$status}: {$count}\n";
    }
    $checks['stats'] = true;
} catch (\Exception $e) {
    echo "   ⚠ Não foi possível obter estatísticas: {$e->getMessage()}\n";
    $checks['stats'] = false;
}

// Resumo final
echo "\n=== RESUMO ===\n";
$allPassed = true;
foreach ($checks as $check => $passed) {
    $status = $passed ? '✓' : '✗';
    echo "   {$status} {$check}\n";
    if (!$passed) $allPassed = false;
}

if ($allPassed) {
    echo "\n🎉 ZION ESTÁ PRONTO PARA USO AUTÔNOMO!\n";
} else {
    echo "\n⚠ ALGUNS CHECKS FALHARAM. Verifique os itens acima.\n";
}

echo "\n=== FIM DA VERIFICAÇÃO ===\n";
