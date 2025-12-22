<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AudienceProfile extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'name',
        'demographics',
        'psychographics',
        'objections',
        'language_patterns',
    ];

    protected function casts(): array
    {
        return [
            'demographics' => 'array',
            'psychographics' => 'array',
            'objections' => 'array',
            'language_patterns' => 'array',
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
     * Retorna a faixa etaria
     */
    public function getAgeRange(): string
    {
        return $this->demographics['age_range'] ?? '';
    }

    /**
     * Retorna o genero
     */
    public function getGender(): string
    {
        return $this->demographics['gender'] ?? '';
    }

    /**
     * Retorna a localizacao
     */
    public function getLocation(): string
    {
        return $this->demographics['location'] ?? '';
    }

    /**
     * Retorna o nivel de renda
     */
    public function getIncomeLevel(): string
    {
        return $this->demographics['income_level'] ?? '';
    }

    /**
     * Retorna o nivel de educacao
     */
    public function getEducation(): string
    {
        return $this->demographics['education'] ?? '';
    }

    /**
     * Retorna as dores
     */
    public function getPains(): array
    {
        return $this->psychographics['pains'] ?? [];
    }

    /**
     * Retorna os desejos
     */
    public function getDesires(): array
    {
        return $this->psychographics['desires'] ?? [];
    }

    /**
     * Retorna os medos
     */
    public function getFears(): array
    {
        return $this->psychographics['fears'] ?? [];
    }

    /**
     * Retorna os sonhos
     */
    public function getDreams(): array
    {
        return $this->psychographics['dreams'] ?? [];
    }

    /**
     * Retorna objecoes comuns
     */
    public function getCommonObjections(): array
    {
        return $this->objections['common_objections'] ?? [];
    }

    /**
     * Retorna barreiras de confianca
     */
    public function getTrustBarriers(): array
    {
        return $this->objections['trust_barriers'] ?? [];
    }

    /**
     * Retorna girias/termos usados
     */
    public function getSlangTerms(): array
    {
        return $this->language_patterns['slang_terms'] ?? [];
    }

    /**
     * Retorna frases que usam
     */
    public function getPhrasesTheyUse(): array
    {
        return $this->language_patterns['phrases_they_use'] ?? [];
    }

    /**
     * Retorna preferencia de tom
     */
    public function getTonePreference(): string
    {
        return $this->language_patterns['tone_preference'] ?? '';
    }

    /**
     * Gera contexto para prompts de IA
     */
    public function buildPromptContext(): string
    {
        $parts = [];

        // Demographics
        $parts[] = "## PERFIL DO PUBLICO-ALVO";
        $demo = [];
        if ($age = $this->getAgeRange()) $demo[] = "Idade: $age";
        if ($gender = $this->getGender()) $demo[] = "Genero: $gender";
        if ($location = $this->getLocation()) $demo[] = "Localizacao: $location";
        if ($income = $this->getIncomeLevel()) $demo[] = "Renda: $income";
        if ($education = $this->getEducation()) $demo[] = "Educacao: $education";
        if ($demo) {
            $parts[] = implode(' | ', $demo);
        }

        // Psychographics
        $parts[] = "\n## PSICOGRAFIA";
        if ($pains = $this->getPains()) {
            $parts[] = "DORES (problemas que enfrentam):";
            foreach ($pains as $pain) {
                $parts[] = "- $pain";
            }
        }
        if ($desires = $this->getDesires()) {
            $parts[] = "DESEJOS (o que querem alcançar):";
            foreach ($desires as $desire) {
                $parts[] = "- $desire";
            }
        }
        if ($fears = $this->getFears()) {
            $parts[] = "MEDOS (o que temem):";
            foreach ($fears as $fear) {
                $parts[] = "- $fear";
            }
        }
        if ($dreams = $this->getDreams()) {
            $parts[] = "SONHOS (aspiracoes):";
            foreach ($dreams as $dream) {
                $parts[] = "- $dream";
            }
        }

        // Objections
        $parts[] = "\n## OBJECOES";
        if ($objections = $this->getCommonObjections()) {
            $parts[] = "Objecoes comuns: " . implode(' | ', $objections);
        }
        if ($barriers = $this->getTrustBarriers()) {
            $parts[] = "Barreiras de confianca: " . implode(' | ', $barriers);
        }

        // Language Patterns
        $parts[] = "\n## PADROES DE LINGUAGEM";
        if ($slang = $this->getSlangTerms()) {
            $parts[] = "Girias/termos: " . implode(', ', $slang);
        }
        if ($phrases = $this->getPhrasesTheyUse()) {
            $parts[] = "Frases que usam: \"" . implode('\" | \"', $phrases) . "\"";
        }
        if ($tone = $this->getTonePreference()) {
            $parts[] = "Preferencia de tom: $tone";
        }

        return implode("\n", $parts);
    }
}
