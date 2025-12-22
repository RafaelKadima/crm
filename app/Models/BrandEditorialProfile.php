<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BrandEditorialProfile extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'name',
        'brand_voice',
        'brand_identity',
        'beliefs_and_enemies',
        'content_pillars',
    ];

    protected function casts(): array
    {
        return [
            'brand_voice' => 'array',
            'brand_identity' => 'array',
            'beliefs_and_enemies' => 'array',
            'content_pillars' => 'array',
        ];
    }

    /**
     * Tenant do perfil
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Retorna os tracos de personalidade formatados
     */
    public function getPersonalityTraits(): array
    {
        return $this->brand_voice['personality_traits'] ?? [];
    }

    /**
     * Retorna os descritores de tom formatados
     */
    public function getToneDescriptors(): array
    {
        return $this->brand_voice['tone_descriptors'] ?? [];
    }

    /**
     * Retorna o estilo de vocabulario
     */
    public function getVocabularyStyle(): string
    {
        return $this->brand_voice['vocabulary_style'] ?? '';
    }

    /**
     * Retorna a missao da marca
     */
    public function getMission(): string
    {
        return $this->brand_identity['mission'] ?? '';
    }

    /**
     * Retorna os valores da marca
     */
    public function getValues(): array
    {
        return $this->brand_identity['values'] ?? [];
    }

    /**
     * Retorna a proposicao unica
     */
    public function getUniqueProposition(): string
    {
        return $this->brand_identity['unique_proposition'] ?? '';
    }

    /**
     * Retorna as crencas centrais
     */
    public function getCoreBeliefs(): array
    {
        return $this->beliefs_and_enemies['core_beliefs'] ?? [];
    }

    /**
     * Retorna os inimigos da industria
     */
    public function getIndustryEnemies(): array
    {
        return $this->beliefs_and_enemies['industry_enemies'] ?? [];
    }

    /**
     * Retorna as visoes contrarias
     */
    public function getContrarianViews(): array
    {
        return $this->beliefs_and_enemies['contrarian_views'] ?? [];
    }

    /**
     * Gera contexto para prompts de IA
     */
    public function buildPromptContext(): string
    {
        $parts = [];

        // Brand Voice
        $parts[] = "## VOZ DA MARCA";
        if ($traits = $this->getPersonalityTraits()) {
            $parts[] = "Tracos de personalidade: " . implode(', ', $traits);
        }
        if ($tone = $this->getToneDescriptors()) {
            $parts[] = "Tom de voz: " . implode(', ', $tone);
        }
        if ($vocab = $this->getVocabularyStyle()) {
            $parts[] = "Estilo de vocabulario: " . $vocab;
        }

        // Brand Identity
        $parts[] = "\n## IDENTIDADE DA MARCA";
        if ($mission = $this->getMission()) {
            $parts[] = "Missao: " . $mission;
        }
        if ($values = $this->getValues()) {
            $parts[] = "Valores: " . implode(', ', $values);
        }
        if ($usp = $this->getUniqueProposition()) {
            $parts[] = "Proposicao unica: " . $usp;
        }

        // Beliefs and Enemies
        $parts[] = "\n## CRENCAS E POSICIONAMENTOS";
        if ($beliefs = $this->getCoreBeliefs()) {
            $parts[] = "Crencas centrais: " . implode(' | ', $beliefs);
        }
        if ($enemies = $this->getIndustryEnemies()) {
            $parts[] = "Inimigos da industria: " . implode(', ', $enemies);
        }
        if ($contrarian = $this->getContrarianViews()) {
            $parts[] = "Visoes contrarias: " . implode(' | ', $contrarian);
        }

        // Content Pillars
        if (!empty($this->content_pillars)) {
            $parts[] = "\n## PILARES DE CONTEUDO";
            foreach ($this->content_pillars as $pillar) {
                $parts[] = "- {$pillar['name']}: {$pillar['description']}";
                if (!empty($pillar['example_topics'])) {
                    $parts[] = "  Topicos: " . implode(', ', $pillar['example_topics']);
                }
            }
        }

        return implode("\n", $parts);
    }
}
