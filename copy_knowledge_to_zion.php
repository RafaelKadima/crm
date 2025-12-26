<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\SdrAgent;
use App\Models\SdrFaq;
use App\Models\SdrKnowledgeEntry;

// Buscar agentes
$support = SdrAgent::where('type', 'support')->first();
$zion = SdrAgent::where('name', 'Zion')->first();

if (!$support || !$zion) {
    echo "Agente não encontrado!\n";
    exit(1);
}

echo "Support Agent: {$support->name} (ID: {$support->id})\n";
echo "Zion Agent: {$zion->name} (ID: {$zion->id})\n";

// Limpar dados existentes do Zion
SdrFaq::where('sdr_agent_id', $zion->id)->delete();
SdrKnowledgeEntry::where('sdr_agent_id', $zion->id)->delete();
echo "Dados antigos do Zion removidos.\n";

// Copiar FAQs
$faqs = SdrFaq::where('sdr_agent_id', $support->id)->get();
foreach ($faqs as $faq) {
    SdrFaq::create([
        'sdr_agent_id' => $zion->id,
        'question' => $faq->question,
        'answer' => $faq->answer,
        'keywords' => $faq->keywords,
        'priority' => $faq->priority,
        'is_active' => true,
    ]);
}
echo "FAQs copiadas: " . count($faqs) . "\n";

// Copiar Knowledge Entries
$entries = SdrKnowledgeEntry::where('sdr_agent_id', $support->id)->get();
foreach ($entries as $entry) {
    SdrKnowledgeEntry::create([
        'sdr_agent_id' => $zion->id,
        'title' => $entry->title,
        'content' => $entry->content,
        'category' => $entry->category,
        'tags' => $entry->tags,
        'is_active' => true,
    ]);
}
echo "Knowledge Entries copiadas: " . count($entries) . "\n";

// Verificar
$zionFaqs = SdrFaq::where('sdr_agent_id', $zion->id)->count();
$zionKnowledge = SdrKnowledgeEntry::where('sdr_agent_id', $zion->id)->count();

echo "\n=== RESULTADO ===\n";
echo "Zion agora tem:\n";
echo "- FAQs: {$zionFaqs}\n";
echo "- Knowledge Entries: {$zionKnowledge}\n";
echo "\nConcluído com sucesso!\n";
