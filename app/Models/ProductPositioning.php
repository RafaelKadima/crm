<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductPositioning extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'name',
        'transformation',
        'mechanism',
        'promises',
        'objection_handling',
    ];

    protected function casts(): array
    {
        return [
            'transformation' => 'array',
            'mechanism' => 'array',
            'promises' => 'array',
            'objection_handling' => 'array',
        ];
    }

    /**
     * Tenant do posicionamento
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Retorna o estado antes da transformacao
     */
    public function getBeforeState(): string
    {
        return $this->transformation['before_state'] ?? '';
    }

    /**
     * Retorna o estado depois da transformacao
     */
    public function getAfterState(): string
    {
        return $this->transformation['after_state'] ?? '';
    }

    /**
     * Retorna a descricao da jornada
     */
    public function getJourneyDescription(): string
    {
        return $this->transformation['journey_description'] ?? '';
    }

    /**
     * Retorna como funciona
     */
    public function getHowItWorks(): string
    {
        return $this->mechanism['how_it_works'] ?? '';
    }

    /**
     * Retorna o metodo unico
     */
    public function getUniqueMethod(): string
    {
        return $this->mechanism['unique_method'] ?? '';
    }

    /**
     * Retorna o diferenciador
     */
    public function getDifferentiator(): string
    {
        return $this->mechanism['differentiator'] ?? '';
    }

    /**
     * Retorna a promessa principal
     */
    public function getMainPromise(): string
    {
        return $this->promises['main_promise'] ?? '';
    }

    /**
     * Retorna promessas secundarias
     */
    public function getSecondaryPromises(): array
    {
        return $this->promises['secondary_promises'] ?? [];
    }

    /**
     * Retorna pontos de prova
     */
    public function getProofPoints(): array
    {
        return $this->promises['proof_points'] ?? [];
    }

    /**
     * Retorna array de tratamento de objecoes
     */
    public function getObjectionHandlers(): array
    {
        return $this->objection_handling ?? [];
    }

    /**
     * Gera contexto para prompts de IA
     */
    public function buildPromptContext(): string
    {
        $parts = [];

        // Transformation
        $parts[] = "## TRANSFORMACAO DO PRODUTO/SERVICO";
        if ($before = $this->getBeforeState()) {
            $parts[] = "ANTES (situacao atual do cliente): $before";
        }
        if ($after = $this->getAfterState()) {
            $parts[] = "DEPOIS (resultado esperado): $after";
        }
        if ($journey = $this->getJourneyDescription()) {
            $parts[] = "JORNADA: $journey";
        }

        // Mechanism
        $parts[] = "\n## MECANISMO (como funciona)";
        if ($how = $this->getHowItWorks()) {
            $parts[] = "Como funciona: $how";
        }
        if ($method = $this->getUniqueMethod()) {
            $parts[] = "Metodo unico: $method";
        }
        if ($diff = $this->getDifferentiator()) {
            $parts[] = "Diferenciador: $diff";
        }

        // Promises
        $parts[] = "\n## PROMESSAS";
        if ($main = $this->getMainPromise()) {
            $parts[] = "PROMESSA PRINCIPAL: $main";
        }
        if ($secondary = $this->getSecondaryPromises()) {
            $parts[] = "Promessas secundarias:";
            foreach ($secondary as $promise) {
                $parts[] = "- $promise";
            }
        }
        if ($proof = $this->getProofPoints()) {
            $parts[] = "Provas/resultados:";
            foreach ($proof as $point) {
                $parts[] = "- $point";
            }
        }

        // Objection Handling
        if ($handlers = $this->getObjectionHandlers()) {
            $parts[] = "\n## TRATAMENTO DE OBJECOES";
            foreach ($handlers as $handler) {
                $parts[] = "OBJECAO: \"{$handler['objection']}\"";
                $parts[] = "  RESPOSTA: {$handler['response']}";
                if (!empty($handler['proof'])) {
                    $parts[] = "  PROVA: {$handler['proof']}";
                }
            }
        }

        return implode("\n", $parts);
    }
}
