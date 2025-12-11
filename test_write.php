<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$logPath = storage_path('logs/debug.log');
echo "Log path: {$logPath}\n";
echo "File exists: " . (file_exists($logPath) ? 'YES' : 'NO') . "\n";
echo "Is writable: " . (is_writable($logPath) ? 'YES' : 'NO') . "\n";

// Tentar escrever
$result = file_put_contents($logPath, json_encode(['test' => 'write', 'time' => now()->toIso8601String()]) . "\n", FILE_APPEND);
echo "Write result: " . ($result !== false ? "SUCCESS ({$result} bytes)" : 'FAILED') . "\n";

// Ler conteúdo
echo "\nFile content:\n";
echo file_get_contents($logPath);

