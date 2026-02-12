<?php

require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// Verificar canal específico
$channel = App\Models\Channel::find('019b4ba2-f6ec-71b1-a4ba-94d0a103b7d3');
echo "=== CONFIGURACAO COMPLETA DO CANAL ===\n";
echo json_encode($channel->toArray(), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n\n";

$tenant = App\Models\Tenant::where('name', 'like', '%Motochefe%Icara%')->first();

if (!$tenant) {
    echo "Tenant nao encontrada!\n";
    exit(1);
}

echo "=== TENANT ===\n";
echo "Nome: {$tenant->name}\n";
echo "ID: {$tenant->id}\n";
echo "Ativa: " . ($tenant->is_active ? 'SIM' : 'NAO') . "\n";

echo "\n=== CANAIS ===\n";
$channels = $tenant->channels;
foreach ($channels as $ch) {
    echo "\nCanal: {$ch->name}\n";
    echo "ID: {$ch->id}\n";
    echo "Tipo: {$ch->type->value}\n";
    echo "Ativo: " . ($ch->is_active ? 'SIM' : 'NAO') . "\n";
    echo "Telefone: " . ($ch->phone ?? 'N/A') . "\n";
    echo "has_ia: " . ($ch->has_ia ? 'SIM' : 'NAO') . "\n";
    echo "Provider: " . ($ch->provider ?? 'N/A') . "\n";
    echo "Instance: " . ($ch->instance_name ?? 'N/A') . "\n";
    echo "API Key: " . (substr($ch->api_key ?? '', 0, 15) . '...') . "\n";
    echo "Webhook configurado: " . ($ch->webhook_url ? 'SIM' : 'NAO') . "\n";
}

echo "\n=== ULTIMAS 10 MENSAGENS ===\n";
$messages = App\Models\TicketMessage::whereHas('ticket', function($q) use ($tenant) {
    $q->where('tenant_id', $tenant->id);
})->orderByDesc('created_at')->limit(10)->get();

if ($messages->isEmpty()) {
    echo "Nenhuma mensagem encontrada!\n";
} else {
    foreach ($messages as $m) {
        echo "- {$m->created_at} | {$m->sender_type->value} | " . substr($m->message ?? '', 0, 50) . "\n";
    }
}

echo "\n=== ULTIMOS TICKETS ===\n";
$tickets = App\Models\Ticket::where('tenant_id', $tenant->id)
    ->orderByDesc('created_at')
    ->limit(5)
    ->get();

if ($tickets->isEmpty()) {
    echo "Nenhum ticket encontrado!\n";
} else {
    foreach ($tickets as $t) {
        echo "- {$t->created_at} | Status: {$t->status->value} | Lead: " . ($t->lead?->contact?->name ?? 'N/A') . "\n";
    }
}

// Verificar logs de webhook recentes
echo "\n=== VERIFICANDO LOGS ===\n";
$logFile = storage_path('logs/laravel.log');
if (file_exists($logFile)) {
    $content = file_get_contents($logFile);
    $lines = explode("\n", $content);
    $lines = array_slice($lines, -100); // últimas 100 linhas

    $webhookLines = array_filter($lines, function($line) {
        return stripos($line, 'webhook') !== false ||
               stripos($line, 'Motochefe') !== false ||
               stripos($line, 'Icarai') !== false ||
               stripos($line, $GLOBALS['tenant']->id ?? '') !== false;
    });

    if (empty($webhookLines)) {
        echo "Nenhum log de webhook encontrado nas ultimas 100 linhas\n";
    } else {
        foreach (array_slice($webhookLines, 0, 10) as $line) {
            echo substr($line, 0, 200) . "\n";
        }
    }
}
