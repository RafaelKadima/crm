<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\SdrAgent;
use App\Models\SdrFaq;
use App\Models\SdrKnowledgeEntry;

$support = SdrAgent::where('type', 'support')->first();
$zion = SdrAgent::where('name', 'Zion')->first();

if (!$support || !$zion) {
    echo "Agente não encontrado!\n";
    exit(1);
}

// Limpar e copiar FAQs
SdrFaq::where('sdr_agent_id', $zion->id)->delete();
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

// Limpar e copiar Knowledge Entries
SdrKnowledgeEntry::where('sdr_agent_id', $zion->id)->delete();
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

echo "Zion atualizado!\n";
echo "FAQs: " . count($faqs) . "\n";
echo "Knowledge: " . count($entries) . "\n";
